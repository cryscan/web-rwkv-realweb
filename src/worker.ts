import { initSession, initTokenizer, pipeline } from "./common";
import { Session, NucleusSampler } from "web-rwkv-realweb";

var _tokenizer = initTokenizer();
var _session: undefined | Promise<Session> = undefined;
var _state: undefined | Float32Array = undefined;

self.addEventListener(
  "message",
  async function (e: MessageEvent<Uint8Array[] | String>) {
    if (e.data instanceof Array) {
      let blob = new Blob(e.data);
      _session = initSession(blob);
      return;
    }

    if ((await _session) === undefined) {
      this.postMessage(null);
      this.postMessage("Error: Model is not loaded.");
      return;
    }

    var tokenizer = await _tokenizer;
    var session = await _session!;
    var info = session.info();
    var sampler = new NucleusSampler(info, 1.0, 0.5, 0.5, 0.5, 0.996);
    console.log(info);

    if (_state === undefined) {
      _state = new Float32Array(session.state_len());
      await session.back(_state);
    } else {
      session.load(_state);
    }

    var input = e.data;
    console.log(input);

    var prompt = `User: Hi!\n\nAssistant: Hello! I'm your AI assistant. I'm here to help you with various tasks, such as answering questions, brainstorming ideas, drafting emails, writing code, providing advice, and much more.\n\nUser: ${input}\n\nAssistant:`;

    var encoder = new TextEncoder();
    var decoder = new TextDecoder();

    var tokens = tokenizer.encode(encoder.encode(prompt));
    var response = "";

    const out = [] as number[];
    console.log(`prompt length: ${tokens.length}`);

    await this.navigator.locks.request("model", async (lock) => {
      let p = pipeline(session, tokens, sampler, [], 500);

      this.postMessage(null);

      for await (let token of p) {
        let word = decoder.decode(tokenizer.decode(new Uint16Array([token])));
        out.push(token);
        response += word;

        this.postMessage(word);

        if (word.includes("\n\n")) break;
      }
    });
  },
  false
);
