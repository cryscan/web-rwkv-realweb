function download(url: string, progress: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null): Promise<Response> {
    return new Promise((res, rej) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
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

    (document.getElementById("model") as HTMLElement).style.display = "none";
    (document.getElementById("loading") as HTMLElement).style.display = "";

    var cache = await caches.open("rwkv");
    var data = download(url, function (e) {
        var progress = document.getElementById("progress") as HTMLProgressElement;
        var status = document.getElementById("status") as HTMLElement;
        progress.value = e.loaded / e.total;
        status.innerHTML = `Downloading... ${e.loaded * 1.0e-6} / ${e.total * 1.0e-6} MB`;
    });

    var blob = await cache.match(url).then(async (response) => {
        if (response !== undefined) {
            return response;
        }
        return await data;
    });

    (document.getElementById("loading") as HTMLElement).style.display = "none";
    (document.getElementById("chat") as HTMLElement).style.display = "";
}

var worker = new Worker('worker.js');
worker.onmessage = function (e) {
    if (!e.data) {
        (document.getElementById("response") as HTMLElement).innerText = "";
    } else {
        (document.getElementById("response") as HTMLElement).innerText += e.data;
    }
};

document.getElementById("chat")?.addEventListener("submit", function (event) {
    event.preventDefault();
    var input = (document.getElementById("input") as HTMLInputElement).value;
    worker.postMessage(input);
});
