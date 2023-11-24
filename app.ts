

window.onload = async () => {
    console.log("-----test web rwkv-----");
    await wasm_bindgen("./web_rwkv_bg.wasm");
    await wasm_bindgen.InitWGPU();
    var req = await fetch("assets/rwkv_vocab_v20230424.json");
    var txt = await req.text();
    await wasm_bindgen.LoadTokenizer(txt);
    //console.log("get tokenlizer=" + txt);

    var reqm = await fetch("assets/models/RWKV-4-World-0.4B-v1-20230529-ctx4096.st");
    var bin = await reqm.arrayBuffer();
    console.log("get model len=" + bin.byteLength);
    await wasm_bindgen.LoadModel(new Uint8Array( bin));

    await wasm_bindgen.chat("试试说句话呢。");
}