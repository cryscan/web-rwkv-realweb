var worker = new Worker('worker.js');
worker.onmessage = function (e) {
    if (!e.data) {
        (document.getElementById("response") as HTMLElement).innerText = "";
    } else {
        (document.getElementById("response") as HTMLElement).innerText += e.data;
    }
    console.log(e.data);
};

document.getElementById("form")?.addEventListener("submit", function (event) {
    event.preventDefault();
    var input = (document.getElementById("input") as HTMLTextAreaElement).value;
    worker.postMessage(input);
});
