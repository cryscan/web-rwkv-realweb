"use strict";
var _a;
var worker = new Worker('worker.js');
worker.onmessage = function (e) {
    document.getElementById("response").innerText += e.data;
    console.log(e.data);
};
(_a = document.getElementById("form")) === null || _a === void 0 ? void 0 : _a.addEventListener("submit", function (event) {
    event.preventDefault();
    document.getElementById("response").innerText = "";
    var input = document.getElementById("input").value;
    worker.postMessage(input);
});
