#!/bin/bash

# Build wasm
echo "==== building wasm ===="
RUSTFLAGS=--cfg=web_sys_unstable_apis wasm-pack build --release --target no-modules

echo "==== copy pkg files ===="
cp pkg/web_rwkv_realweb.js web/
cp pkg/web_rwkv_realweb.d.ts web/
cp pkg/web_rwkv_realweb_bg.wasm web/
cp pkg/web_rwkv_realweb_bg.wasm.d.ts web/
cp pkg/web_rwkv_rewlweb_bg.bin web/

# Build typescript
echo "==== building typescript ===="
npx tsc
