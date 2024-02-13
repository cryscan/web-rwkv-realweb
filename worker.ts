importScripts("./pkg/web_rwkv_realweb.js")

const { Runtime, Sampler, StateId } = wasm_bindgen;

async function make_runtime() {
    await wasm_bindgen("./pkg/web_rwkv_realweb_bg.wasm");

    var req = await fetch("assets/rwkv_vocab_v20230424.json");
    var vocab = await req.text();
    console.log("tokenizer: " + vocab.length);

    var req = await fetch("assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st");
    var bin = await req.arrayBuffer();
    console.log("model: ", bin.byteLength);

    var runtime = await new Runtime(vocab, new Uint8Array(bin), 0, 0, true);
    console.log("runtime loaded")
    return runtime;
}

var runtime = make_runtime();

this.addEventListener("message", async function (e) {
    var rt = await runtime;
    var sampler = new Sampler(1.0, 0.5);

    var input = e.data as string;
    console.log(input);

    var prompt = `User: ${input}\n\nAssistant:`;
    var state = new StateId;

    var tokens = rt.encode(prompt);
    var out = "";

    var logits = new Float32Array(65536);
    var probs = new Float32Array(65536);

    while (!out.includes("\n\n") && out.length < 500) {
        await rt.run_one(tokens, logits, state);
        await rt.softmax_one(logits, probs);

        let out_token = sampler.sample(probs);
        let word = rt.decode(new Uint16Array([out_token]));
        tokens = new Uint16Array([out_token]);

        out += word;
        postMessage(word);
    }
}, false);