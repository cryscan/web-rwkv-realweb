function download(url: string, progress: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null): Promise<Response> {
    return new Promise((res, rej) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.onprogress = progress;
        xhr.onload = function (e) {
            if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 /* Loaded from local file */)) {
                res(this.response);
            } else if (xhr.status === 404 && url.startsWith('http://localhost')) {
                rej(`Model not found locally.  Please download and place in the assets/models/ folder.  Make sure you are running on port 8080`);
            } else {
                console.log('onload: Loading model error', xhr, e);
                rej(`Loading model error: ${xhr.status}: ${xhr.statusText}`);
            }
        };
        xhr.onerror = function (e) {
            console.log('onerror: Loading model error', xhr, e);
            if (xhr.status === 0 && !xhr.statusText) {
                // There's no information to show
                // https://bugs.chromium.org/p/chromium/issues/detail?id=118096
                rej('Failed to load the model from Hugging Face. Might be related to a problem on their end.  Please try waiting a bit and then trying again, or use local copy (see README).')
            } else {
                rej(`Loading model error: ${xhr.status}: ${xhr.statusText}`);
            }
        }
        xhr.send();
    });
}

async function load() {
    var url = (document.getElementById("url") as HTMLInputElement).value;

    const modelElem = document.getElementById("model")!;
    const downloadElem = document.getElementById("download")!;
    const progressElem = document.getElementById("progress") as HTMLProgressElement;
    const statusElem = document.getElementById("status")!;
    const chatElem = document.getElementById("chat")!;
    const replyElem = document.getElementById("reply")!;

    modelElem.style.display = "none";
    downloadElem.style.display = "";

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
        statusElem.innerHTML = `Downloading... ${receivedLength * 1.0e-6} / ${contentLength * 1.0e-6} MB`;
    }

    let blob = new Blob(chunks);
    console.log(blob);

    // const progress = function (e: ProgressEvent) {
    //     var progress = document.getElementById("progress") as HTMLProgressElement;
    //     var status = document.getElementById("status") as HTMLElement;
    //     progress.value = e.loaded / e.total;
    //     status.innerHTML = `Downloading... ${e.loaded * 1.0e-6} / ${e.total * 1.0e-6} MB`;
    // };

    // var blob = await download(url, function (e) {
    //     var progress = document.getElementById("progress") as HTMLProgressElement;
    //     var status = document.getElementById("status") as HTMLElement;
    //     progress.value = e.loaded / e.total;
    //     status.innerHTML = `Downloading... ${e.loaded * 1.0e-6} / ${e.total * 1.0e-6} MB`;
    // });

    // var blob = await cache.match(url).then(async (response) => {
    //     if (response !== undefined) {
    //         return response;
    //     }
    //     var res = await data;
    //     cache.put(url, res);
    //     return res;
    // }).then(async (response) => new Blob([await response.arrayBuffer()]));

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