# Web-RWKV-RealWeb

Run the RWKV model locally in browser on your GPU. This demo is built upon the [web-rwkv](https://github.com/cryscan/web-rwkv) inference engine.

Check the [live demo](https://cryscan.github.io/web-rwkv-realweb/)!

## Development

### `rust` and `wasm-pack` setup

To install `wasm-pack`, use

```bash
cd web-rwkv-wasm-pack
cargo install wasm-pack
```

### Project setup

We use [pnpm](https://pnpm.io) to manage the packages. To install the project dependencies, use:

```bash
pnpm install
```

### Run & Build

To run the development server, use:

```bash
pnpm run dev
```

To build wasm package only, use:

```bash
pnpm run wasm:build
```

To build the project, use:

```bash
pnpm run build
pnpm run preview
```

## Available Models

You can find the available models on [cryscan's huggingface page](https://huggingface.co/cgisky).
The model files name should end in `.st`.
