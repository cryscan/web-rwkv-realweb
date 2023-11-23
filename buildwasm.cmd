@echo ====build wasm====
@wasm-pack build --target no-modules --dev

@echo ====copy pkg files====
@copy pkg\web_rwkv.js web_rwkv.js
@copy pkg\web_rwkv.d.ts web_rwkv.d.ts
@copy pkg\web_rwkv_bg.wasm web_rwkv_bg.wasm
@copy pkg\web_rwkv_bg.wasm web_rwkv_bg.bin