@echo ====build wasm====
@set RUSTFLAGS=--cfg=web_sys_unstable_apis
@wasm-pack build --release --target no-modules

@REM @echo ====copy pkg files====
@REM @copy pkg\web_rwkv_realweb.js web_rwkv_realweb.js
@REM @copy pkg\web_rwkv_realweb.d.ts web_rwkv_realweb.d.ts
@REM @copy pkg\web_rwkv_realweb_bg.wasm web_rwkv_realweb_bg.wasm
@REM @copy pkg\web_rwkv_rewlweb_bg.bin web_rwkv_rewlweb_bg.bin