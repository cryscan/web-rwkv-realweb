@echo ==== build wasm ====
@set RUSTFLAGS=--cfg=web_sys_unstable_apis
@wasm-pack build --release --target no-modules

@echo ==== copy pkg files ====
@copy pkg\web_rwkv_realweb.js web\
@copy pkg\web_rwkv_realweb.d.ts web\
@copy pkg\web_rwkv_realweb_bg.wasm web\
@copy pkg\web_rwkv_realweb_bg.wasm.d.ts web\
@copy pkg\web_rwkv_rewlweb_bg.bin web\

@echo ==== build typescript ====
@npx tsc