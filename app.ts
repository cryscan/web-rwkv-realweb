

window.onload = async () => {
    console.log("-----test web rwkv-----");
    await wasm_bindgen("./web_rwkv_realweb_bg.wasm");
    await wasm_bindgen.InitWGPU();

    await wasm_bindgen.testcallback((t:string)=>
    {
        console.log("from callback:"+t);
    })

    var req = await fetch("assets/rwkv_vocab_v20230424.json");
    var txt = await req.text();
    await wasm_bindgen.LoadTokenizer(txt);
    //console.log("get tokenlizer=" + txt);

    var reqm = await fetch("assets/models/RWKV-4-World-0.4B-v1-20230529-ctx4096.st");
    var bin = await reqm.arrayBuffer();
    console.log("get model len=" + bin.byteLength);
    await wasm_bindgen.LoadModel(new Uint8Array( bin),(info:string)=>
    {
        console.log("[加载模型log]:"+info);
    });

    var txt = await wasm_bindgen.ChatOnce("hello.",(type:string ,word:string)=>
    {
        console.log("[Chatlog]:"+type +"  ===  "+ word);
    });
    console.log("get chat=" + txt);

    var txt2 = await wasm_bindgen.ChatOnce("what is your name.",(type:string ,word:string)=>
    {
        console.log("[Chatlog]:"+type +"  ===  "+ word);
    });
    console.log("get chat2=" + txt2);
}