"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
window.onload = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("-----test web rwkv-----");
    yield wasm_bindgen("./web_rwkv_realweb_bg.wasm");
    yield wasm_bindgen.InitWGPU();
    yield wasm_bindgen.testcallback((t) => {
        console.log("from callback:" + t);
    });
    var req = yield fetch("assets/rwkv_vocab_v20230424.json");
    var txt = yield req.text();
    yield wasm_bindgen.LoadTokenizer(txt);
    //console.log("get tokenlizer=" + txt);
    var reqm = yield fetch("assets/models/RWKV-4-World-0.4B-v1-20230529-ctx4096.st");
    var bin = yield reqm.arrayBuffer();
    console.log("get model len=" + bin.byteLength);
    yield wasm_bindgen.LoadModel(new Uint8Array(bin), (info) => {
        console.log("[加载模型log]:" + info);
    });
    var txt = yield wasm_bindgen.ChatOnce("hello.", (type, word) => {
        console.log("[Chatlog]:" + type + "  ===  " + word);
    });
    console.log("get chat=" + txt);
    var txt2 = yield wasm_bindgen.ChatOnce("what is your name.", (type, word) => {
        console.log("[Chatlog]:" + type + "  ===  " + word);
    });
    console.log("get chat2=" + txt2);
});
