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
function load() {
    return __awaiter(this, void 0, void 0, function* () {
        const modelElem = document.getElementById("model");
        const downloadElem = document.getElementById("download");
        const progressElem = document.getElementById("progress");
        const statusElem = document.getElementById("status");
        const chatElem = document.getElementById("chat");
        const replyElem = document.getElementById("reply");
        var url = document.getElementById("url").value;
        var cache = yield caches.open("rwkv");
        let response = yield cache.match(url).then((value) => __awaiter(this, void 0, void 0, function* () {
            if (value !== undefined) {
                console.log("load cached model");
                return value;
            }
            console.log("load uncached model");
            let response = yield fetch(url);
            cache.put(url, response.clone());
            return response;
        }));
        // let response = await fetch(url);
        if ((response.status >= 200 && response.status < 300) || (response.status === 0 /* Loaded from local file */)) {
            replyElem.innerText = "";
            modelElem.style.display = "none";
            downloadElem.style.display = "";
        }
        else if (response.status === 404 && url.startsWith('http://localhost')) {
            replyElem.innerText = "Model not found locally.";
            return;
        }
        else {
            replyElem.innerText = "Incorrect URL.";
            return;
        }
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        let receivedLength = 0;
        let chunks = [];
        while (true) {
            const { done, value } = yield reader.read();
            if (done) {
                break;
            }
            chunks.push(value);
            receivedLength += value.length;
            // console.log(`Received ${receivedLength} of ${contentLength}`)
            progressElem.value = receivedLength / contentLength;
            statusElem.innerHTML = `<p>${url}</p><p>${receivedLength * 1.0e-6} / ${contentLength * 1.0e-6} MB</p>`;
        }
        let blob = new Blob(chunks);
        console.log(blob);
        downloadElem.style.display = "none";
        chatElem.style.display = "";
        var worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            e.data ? replyElem.innerText += e.data : replyElem.innerText = "";
        };
        worker.postMessage(blob);
        chatElem.addEventListener("submit", (e) => {
            e.preventDefault();
            const inputElem = document.getElementById("input");
            var input = inputElem.value;
            worker.postMessage(input);
        });
    });
}
const urls = new Map([
    ["v4", "https://huggingface.co/cgisky/RWKV-safetensors-fp16/resolve/main/RWKV-4-World-0.4B-v1-20230529-ctx4096.st"],
    ["v5", "https://huggingface.co/cgisky/AI00_RWKV_V5/resolve/main/RWKV-5-World-0.4B-v2-20231113-ctx4096.st"],
    ["v5 local", "http://localhost:5500/assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st"]
]);
function loadUrl(key) {
    document.getElementById("url").value = urls.get(key);
}
