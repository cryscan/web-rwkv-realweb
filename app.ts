var worker = new Worker('worker.js');
worker.onmessage = function (e) {
    (document.getElementById("response") as HTMLElement).innerText = e.data;
    console.log(e.data);
};

document.getElementById("form")?.addEventListener("submit", function (event) {
    event.preventDefault();
    (document.getElementById("response") as HTMLElement).innerText = "";
    var input = (document.getElementById("input") as HTMLTextAreaElement).value;
    worker.postMessage(input);
});
