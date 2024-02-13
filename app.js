var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var Runtime = wasm_bindgen.Runtime, Sampler = wasm_bindgen.Sampler, StateId = wasm_bindgen.StateId;
window.onload = function () { return __awaiter(_this, void 0, void 0, function () {
    var req, vocab, req, bin, runtime, sampler, state, prompt, tokens, logits, probs, out_token, out;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("-----test web rwkv-----");
                return [4 /*yield*/, wasm_bindgen("./pkg/web_rwkv_realweb_bg.wasm")];
            case 1:
                _a.sent();
                return [4 /*yield*/, fetch("assets/rwkv_vocab_v20230424.json")];
            case 2:
                req = _a.sent();
                return [4 /*yield*/, req.text()];
            case 3:
                vocab = _a.sent();
                console.log("tokenizer: " + vocab.length);
                return [4 /*yield*/, fetch("assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st")];
            case 4:
                req = _a.sent();
                return [4 /*yield*/, req.arrayBuffer()];
            case 5:
                bin = _a.sent();
                console.log("model: ", bin.byteLength);
                return [4 /*yield*/, new Runtime(vocab, new Uint8Array(bin), 0, 0, true)];
            case 6:
                runtime = _a.sent();
                sampler = new Sampler(1.0, 0.5);
                state = new StateId;
                prompt = "The Eiffel Tower is located in the city of";
                console.log(prompt);
                tokens = runtime.encode(prompt);
                console.log(tokens);
                return [4 /*yield*/, runtime.run_one(tokens, state)];
            case 7:
                logits = _a.sent();
                return [4 /*yield*/, runtime.softmax_one(logits)];
            case 8:
                probs = _a.sent();
                out_token = sampler.sample(probs[0]);
                out = runtime.decode(new Uint16Array([out_token]));
                console.log(out);
                return [2 /*return*/];
        }
    });
}); };
// document.getElementById("myForm")?.addEventListener("submit", function (event) {
//     event.preventDefault();
//     var textFieldValue = (document.getElementById("textField") as HTMLTextAreaElement).value;
//     console.log(textFieldValue);
// });
