#!/bin/bash
# Build wasm
echo "== building wasm =="
RUSTFLAGS=--cfg=web_sys_unstable_apis cargo build --release --target no-modules
# Build typescript
echo "== building typescript =="
npx tsc
