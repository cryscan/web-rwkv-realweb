#!/bin/bash
# Set RUSTFLAGS environment variable
RUSTFLAGS="--cfg=web_sys_unstable_apis"
# Build wasm
echo "== building wasm =="
cargo build --release --target no-modules
# Build typescript
echo "== building typescript =="
npx tsc
