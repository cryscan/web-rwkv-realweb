async function load() {
    const modelElem = document.getElementById("model")!;
    const downloadElem = document.getElementById("download")!;
    const progressElem = document.getElementById("progress") as HTMLProgressElement;
    const statusElem = document.getElementById("status")!;
    const chatElem = document.getElementById("chat")!;
    const replyElem = document.getElementById("reply")!;
    var url = (document.getElementById("url") as HTMLInputElement).value;

    var cache = await caches.open("rwkv");

    let response = await cache.match(url).then(async (value) => {
        if (value !== undefined) {
            console.log("load cached model");
            return value;
        }
        console.log("load uncached model");
        let response = await fetch(url);
        cache.put(url, response.clone());
        return response;
    });
    // let response = await fetch(url);

    if ((response.status >= 200 && response.status < 300) || (response.status === 0 /* Loaded from local file */)) {
        replyElem.innerText = "";
        modelElem.style.display = "none";
        downloadElem.style.display = "";
    } else if (response.status === 404 && url.startsWith('http://localhost')) {
        replyElem.innerText = "Model not found locally.";
        return;
    } else {
        replyElem.innerText = "Incorrect URL.";
        return;
    }

    const reader = response.body!.getReader();
    const contentLength = +response.headers!.get('Content-Length')!;

    let receivedLength = 0;
    let chunks = [];
    while (true) {
        const { done, value } = await reader.read();
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
        const inputElem = document.getElementById("input") as HTMLInputElement;
        var input = inputElem.value;
        worker.postMessage(input);
    });
}

const urls = new Map([
    ["v4", "https://huggingface.co/cgisky/RWKV-safetensors-fp16/resolve/main/RWKV-4-World-0.4B-v1-20230529-ctx4096.st"],
    ["v5", "https://huggingface.co/cgisky/AI00_RWKV_V5/resolve/main/RWKV-5-World-0.4B-v2-20231113-ctx4096.st"],
    ["v5 local", "http://localhost:5500/assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st"]
]);

function loadUrl(key: string) {
    (document.getElementById("url") as HTMLInputElement).value = urls.get(key)!;
}
