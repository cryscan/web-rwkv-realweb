importScripts("./pkg/web_rwkv_realweb.js")

const { Runtime, Sampler, StateId } = wasm_bindgen;

async function make_tokenizer() {
    await wasm_bindgen("./pkg/web_rwkv_realweb_bg.wasm");

    var req = await fetch("assets/rwkv_vocab_v20230424.json");
    var vocab = await req.text();
    console.log("tokenizer: " + vocab.length);
    return new wasm_bindgen.Tokenizer(vocab);
}

async function make_runtime() {
    await wasm_bindgen("./pkg/web_rwkv_realweb_bg.wasm");

    var req = await fetch("assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st");
    var bin = await req.arrayBuffer();
    console.log("model: ", bin.byteLength);

    var runtime = await new Runtime(new Uint8Array(bin), 0, 0, true);
    console.log("runtime loaded")
    return runtime;
}

var _tokenizer = make_tokenizer();
var _runtime = make_runtime();

this.addEventListener("message", async function (e) {
    var tokenizer = await _tokenizer;
    var runtime = await _runtime;
    var sampler = new Sampler(1.0, 0.5);

    var input = e.data as string;
    console.log(input);

    var prompt = `User: ${input}\n\nAssistant:`;
    var state = new StateId;

    var encoder = new TextEncoder;
    var decoder = new TextDecoder;

    var tokens = tokenizer.encode(encoder.encode(prompt));
    var out = "";
    console.log(`prompt length: ${tokens.length}`);

    var logits = new Float32Array(65536);
    var probs = new Float32Array(65536);

    while (!out.includes("\n\n") && out.length < 500) {
        await runtime.run_one(tokens, logits, state);
        await runtime.softmax_one(logits, probs);

        let out_token = sampler.sample(probs);
        let word = tokenizer.decode(new Uint16Array([out_token]));
        tokens = new Uint16Array([out_token]);

        out += decoder.decode(word);
    }
    postMessage(out);
}, false);