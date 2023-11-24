@echo ====build wasm====
@set RUSTFLAGS=--cfg=web_sys_unstable_apis
@wasm-pack build --dev --target no-modules

@echo ====copy pkg files====
@copy pkg\web_rwkv_realweb.js web_rwkv_realweb.js
@copy pkg\web_rwkv_realweb.d.ts web_rwkv_realweb.d.ts
@copy pkg\web_rwkv_realweb_bg.wasm web_rwkv_realweb_bg.wasm
@copy pkg\web_rwkv_rewlweb_bg.bin web_rwkv_rewlweb_bg.bin