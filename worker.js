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
importScripts("./pkg/web_rwkv_realweb.js");
const { Runtime, Sampler, StateId } = wasm_bindgen;
function make_tokenizer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield wasm_bindgen("./pkg/web_rwkv_realweb_bg.wasm");
        var req = yield fetch("assets/rwkv_vocab_v20230424.json");
        var vocab = yield req.text();
        console.log("tokenizer: " + vocab.length);
        return new wasm_bindgen.Tokenizer(vocab);
    });
}
function make_runtime(blob) {
    return __awaiter(this, void 0, void 0, function* () {
        yield wasm_bindgen("./pkg/web_rwkv_realweb_bg.wasm");
        // var req = await fetch("assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st");
        // var bin = await req.arrayBuffer();
        // console.log("model: ", bin.byteLength);
        let bin = yield blob.arrayBuffer();
        console.log("model: ", bin.byteLength);
        let runtime = yield new Runtime(new Uint8Array(bin), 0, 0, true);
        console.log("runtime loaded");
        return runtime;
    });
}
var _tokenizer = make_tokenizer();
var _runtime = undefined;
this.addEventListener("message", function (e) {
    return __awaiter(this, void 0, void 0, function* () {
        if (e.data instanceof Blob) {
            _runtime = make_runtime(e.data);
            return;
        }
        if ((yield _runtime) === undefined) {
            this.postMessage(null);
            this.postMessage("Error: Model is not loaded.");
            return;
        }
        var tokenizer = yield _tokenizer;
        var runtime = yield _runtime;
        var sampler = new Sampler(1.0, 0.5);
        var input = e.data;
        console.log(input);
        var prompt = `User: Hi!\n\nAssistant: Hello! I'm your AI assistant. I'm here to help you with various tasks, such as answering questions, brainstorming ideas, drafting emails, writing code, providing advice, and much more.\n\nUser: ${input}\n\nAssistant:`;
        var state = new StateId;
        var encoder = new TextEncoder;
        var decoder = new TextDecoder;
        var tokens = tokenizer.encode(encoder.encode(prompt));
        var response = "";
        var out = [];
        console.log(`prompt length: ${tokens.length}`);
        var logits = new Float32Array(65536);
        var probs = new Float32Array(65536);
        yield this.navigator.locks.request("model", (lock) => __awaiter(this, void 0, void 0, function* () {
            this.postMessage(null);
            while (!response.includes("\n\n") && out.length < 500) {
                yield runtime.run_one(tokens, logits, state);
                yield runtime.softmax_one(logits, probs);
                let out_token = sampler.sample(probs);
                let word = decoder.decode(tokenizer.decode(new Uint16Array([out_token])));
                tokens = new Uint16Array([out_token]);
                out.push(out_token);
                response += word;
                this.postMessage(word);
            }
        }));
    });
}, false);
