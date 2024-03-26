# Web-RWKV-RealWeb

Run the RWKV model locally in browser on your GPU. This demo is built upon the [web-rwkv](https://github.com/cryscan/web-rwkv) inference engine.

Check the [live demo](https://cryscan.github.io/web-rwkv-realweb/)!

## Dependencies

### `node.js` and `typescript`

To install `typescript`, use
```bash
$ npm install -g typescript
```

### `rust` and `wasm-pack`

To install `wasm-pack`, use
```bash
$ cargo install wasm-pack
```

### Model Download

Download the model [here](https://huggingface.co/cgisky/AI00_RWKV_V5/blob/main/RWKV-5-World-0.4B-v2-20231113-ctx4096.st),
and put it under `assets/models`.

## Compile and Pack

To build and pack, run
```bash
$ ./build.cmd
```

## Run

Start a local http server to serve the folder, open the page in your browser.
