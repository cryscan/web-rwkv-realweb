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
    yield wasm_bindgen("./web_rwkv_bg.wasm");
    yield wasm_bindgen.InitWGPU();
    var req = yield fetch("assets/rwkv_vocab_v20230424.json");
    var txt = yield req.text();
    yield wasm_bindgen.LoadTokenizer(txt);
    //console.log("get tokenlizer=" + txt);
    var reqm = yield fetch("assets/models/RWKV-4-World-0.4B-v1-20230529-ctx4096.st");
    var bin = yield reqm.arrayBuffer();
    console.log("get model len=" + bin.byteLength);
    yield wasm_bindgen.LoadModel(new Uint8Array(bin));
    yield wasm_bindgen.chat("试试说句话呢。");
});
