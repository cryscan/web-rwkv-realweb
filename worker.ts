importScripts("./pkg/web_rwkv_realweb.js")

const { Runtime, Sampler, StateId, Tensor, TensorReader } = wasm_bindgen;

function getUint64(dataview: DataView, byteOffset: number, littleEndian?: boolean) {
    // split 64-bit number into two 32-bit (4-byte) parts
    const left = dataview.getUint32(byteOffset, littleEndian);
    const right = dataview.getUint32(byteOffset + 4, littleEndian);

    // combine the two 32-bit values
    const combined = littleEndian
        ? left + 2 ** 32 * right
        : 2 ** 32 * left + right;

    if (!Number.isSafeInteger(combined))
        console.warn(combined, "exceeds MAX_SAFE_INTEGER. Precision may be lost");

    return combined;
}

interface TensorInfo {
    shape: Uint32Array;
    data_offsets: [number, number];
}

var names;
var tensor;

async function initReader(blob: Blob) {
    console.log("model: ", blob.size);

    if (blob.size < 8) {
        throw "header too small";
    }

    let n = getUint64(new DataView(await blob.slice(0, 8).arrayBuffer()), 0, true);
    if (n > 100000000) {
        throw "header too large";
    }
    if (n > blob.size) {
        throw "invalid header len";
    }

    let str = new TextDecoder().decode(new Uint8Array(await blob.slice(8, n + 8).arrayBuffer()));
    console.log(str);

    let metadata = JSON.parse(str);
    console.log(metadata);

    let tensors = new Array();
    for (let name in metadata) {
        if (name !== "__metadata__") {
            let info: TensorInfo = metadata[name];
            let start = 8 + n + info.data_offsets[0];
            let end = 8 + n + info.data_offsets[1];
            let data = await blob.slice(start, end).arrayBuffer();
            let buffer = new Uint8Array(data);
            let tensor = new Tensor(name, info.shape, buffer);
            tensors.push(tensor);
        }
    }

    return new TensorReader(tensors);
}

async function initTokenizer() {
    await wasm_bindgen("./pkg/web_rwkv_realweb_bg.wasm");

    var req = await fetch("assets/rwkv_vocab_v20230424.json");
    var vocab = await req.text();
    console.log("tokenizer: " + vocab.length);
    return new wasm_bindgen.Tokenizer(vocab);
}

async function initRuntime(blob: Blob) {
    await wasm_bindgen("./pkg/web_rwkv_realweb_bg.wasm");

    // var req = await fetch("assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st");
    // var bin = await req.arrayBuffer();
    // console.log("model: ", bin.byteLength);

    let reader = await initReader(blob);
    let runtime = await new Runtime(reader, 0, 0, true);
    console.log("runtime loaded")
    return runtime;
}

var _tokenizer = initTokenizer();
var _runtime: undefined | Promise<wasm_bindgen.Runtime> = undefined;

this.addEventListener("message", async function (e: MessageEvent<Blob | string>) {
    if (e.data instanceof Blob) {
        _runtime = initRuntime(e.data);
        return;
    }

    if (await _runtime === undefined) {
        this.postMessage(null);
        this.postMessage("Error: Model is not loaded.");
        return;
    }

    var tokenizer = await _tokenizer;
    var runtime = await _runtime!;
    var sampler = new Sampler(1.0, 0.5);

    var input = e.data;
    console.log(input);

    var prompt = `User: Hi!\n\nAssistant: Hello! I'm your AI assistant. I'm here to help you with various tasks, such as answering questions, brainstorming ideas, drafting emails, writing code, providing advice, and much more.\n\nUser: ${input}\n\nAssistant:`;
    var state = new StateId;

    var encoder = new TextEncoder;
    var decoder = new TextDecoder;

    var tokens = tokenizer.encode(encoder.encode(prompt));
    var response = "";
    var out = []
    console.log(`prompt length: ${tokens.length}`);

    var logits = new Float32Array(65536);
    var probs = new Float32Array(65536);

    await this.navigator.locks.request("model", async (lock) => {
        this.postMessage(null);
        while (!response.includes("\n\n") && out.length < 500) {
            await runtime.run_one(tokens, logits, state);
            await runtime.softmax_one(logits, probs);

            let out_token = sampler.sample(probs);
            let word = decoder.decode(tokenizer.decode(new Uint16Array([out_token])));
            tokens = new Uint16Array([out_token]);

            out.push(out_token);
            response += word;
            this.postMessage(word);
        }
    });
}, false);