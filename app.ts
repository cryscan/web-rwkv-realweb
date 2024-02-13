const { Runtime, Sampler, StateId } = wasm_bindgen;

window.onload = async () => {
    console.log("-----test web rwkv-----");
    await wasm_bindgen("./pkg/web_rwkv_realweb_bg.wasm");

    var req = await fetch("assets/rwkv_vocab_v20230424.json");
    var vocab = await req.text();
    console.log("tokenizer: " + vocab.length);

    var req = await fetch("assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st");
    var bin = await req.arrayBuffer();
    console.log("model: ", bin.byteLength);

    var runtime = await new Runtime(vocab, new Uint8Array(bin), 0, 0, true);
    var sampler = new Sampler(1.0, 0.5);

    var state = new StateId;
    var prompt = "The Eiffel Tower is located in the city of";
    console.log(prompt);

    var tokens = runtime.encode(prompt);
    console.log(tokens);

    var logits = await runtime.run_one(tokens, state);
    var probs = await runtime.softmax_one(logits);

    var out_token = sampler.sample(probs[0]);
    var out = runtime.decode(new Uint16Array([out_token]));
    console.log(out);
}

// document.getElementById("myForm")?.addEventListener("submit", function (event) {
//     event.preventDefault();
//     var textFieldValue = (document.getElementById("textField") as HTMLTextAreaElement).value;
//     console.log(textFieldValue);
// });
