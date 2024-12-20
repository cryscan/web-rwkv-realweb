import { defineConfig } from "vite";
import wasmPack from "vite-plugin-wasm-pack";

export default defineConfig({
  base: "./",
  plugins: [wasmPack("./web-rwkv-realweb")],
});
