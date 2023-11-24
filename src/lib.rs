pub mod context;
pub mod export;
pub mod model;
pub mod num;
pub mod tensor;
pub mod tokenizer;

use anyhow::Ok;
pub use wgpu;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use web_sys::console;

use anyhow::Result;

#[cfg(not(debug_assertions))]
use dialoguer::{theme::ColorfulTheme, Select};
use itertools::Itertools;

use context::{Context, ContextBuilder, Instance};
use model::{
    loader::Loader, v4, v5, FromBuilder, Lora, Model, ModelBuilder, ModelState, ModelVersion,
    Quant, StateBuilder,
};
use serde::Deserialize;
use std::{
    collections::HashMap,
    io::{BufReader, Read, Write},
    path::PathBuf,
};
use tokenizer::Tokenizer;

static mut iv: i32 = 0;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

static mut g_context: Option<context::Context> = None;
static mut g_instance: Option<context::Instance> = None;
static mut g_tokenizer: Option<tokenizer::Tokenizer> = None;
static mut g_model_v4: Option<model::v4::Model> = None;
static mut g_state_v4: Option<model::v4::ModelState> = None;
static mut g_state_version: i32 = 0;
static mut g_state_v5: Option<model::v5::ModelState> = None;
static mut g_model_v5: Option<model::v5::Model> = None;
#[wasm_bindgen]
pub async fn InitWGPU() {
    console::log_1(&"hi".into());

    let instance = context::Instance::new();

    let adapter = instance
        .adapter(wgpu::PowerPreference::HighPerformance)
        .await
        .unwrap();

    let context = context::ContextBuilder::new(adapter)
        .with_default_pipelines()
        .build()
        .await
        .unwrap();
    println!("{:#?}", context.adapter.get_info());
    let v = format!("{:#?}", context.adapter.get_info());
    console::log_2(&"adapter=".into(), &v.into());
    unsafe {
        iv = 7;
        g_instance = Some(instance);
        g_context = Some(context);
    }
}

#[wasm_bindgen]
pub fn LoadTokenizer(txt: &str) {
    console::log_1(&"LoadTokenizer.".into());
    let _token = tokenizer::Tokenizer::new(&txt).unwrap();
    unsafe {
        g_tokenizer = Some(_token);
    }
    console::log_1(&"LoadTokenizer done.".into());
}

fn load_model<'a, M>(
    context: &context::Context,
    data: &'a [u8],
    lora: Option<PathBuf>,
    quant: Option<usize>,
    quant_nf4: Option<usize>,
    turbo: bool,
) -> Result<M>
where
    M: model::Model + FromBuilder<Builder<'a> = ModelBuilder<'a>, Error = anyhow::Error>,
{
    let quant = quant
        .map(|layer| (0..layer).map(|layer| (layer, Quant::Int8)).collect_vec())
        .unwrap_or_default();
    let quant_nf4 = quant_nf4
        .map(|layer| (0..layer).map(|layer| (layer, Quant::NF4)).collect_vec())
        .unwrap_or_default();
    let quant = quant.into_iter().chain(quant_nf4.into_iter()).collect();
    let model = ModelBuilder::new(context, data)
        .with_quant(quant)
        .with_turbo(turbo);

    //  match lora {
    //      Some(lora) => {
    //          let file = File::open(lora)?;
    //        let map = unsafe { Mmap::map(&file)? };
    //      model
    //             .add_lora(Lora {
    //                data: map.to_vec(),
    //                blend: Default::default(),
    //            })
    //          .build()
    //     }
    //      None => model.build(),
    //  }
    return model.build();
}

#[wasm_bindgen]
pub fn LoadModel(fileData: &[u8]) {
    console::log_1(&"LoadModel wait.".into());
    let info = model::loader::Loader::info(fileData).unwrap();
    let v = format!("{:#?}", info);
    console::log_2(&"LoadModel info.=".into(), &v.into());
    unsafe {
        let refc: &Context = g_context.as_ref().unwrap();
        match info.version {
            model::ModelVersion::V4 => {
                console::log_1(&"LoadModel V4 wait.".into());
                let model: model::v4::Model =
                    load_model(refc, &fileData, None, None, None, false).unwrap();
                let state: model::v4::ModelState =
                    model::StateBuilder::new(refc, model.info()).build();
                unsafe {
                    g_state_version = 4;
                    g_state_v4 = Some(state);
                    g_model_v4 = Some(model);
                    console::log_1(&"LoadModel V4".into());
                }
                //run_internal(model, state, g_tokenizer.unwrap(), prompt, sampler)
            }
            model::ModelVersion::V5 => {
                console::log_1(&"LoadModel V5 wait.".into());
                let model: model::v5::Model =
                    load_model(refc, &fileData, None, None, None, false).unwrap();
                let state: model::v5::ModelState =
                    model::StateBuilder::new(refc, model.info()).build();
                unsafe {
                    g_state_version = 5;
                    g_state_v5 = Some(state);
                    g_model_v5 = Some(model);
                    console::log_1(&"LoadModel V5 done.".into());
                }
                //run_internal(model, state, tokenizer, prompt, sampler)
            }
        }
    }
}

#[wasm_bindgen]
pub fn chat(txt: &str) {

    unsafe {
        if (g_state_version == 4) {
            let prompt=Prompt {
                user: String::from("User"),
                bot: String::from("Assistant"),
                intro: String::new(),
                text: vec![
                    [
                        String::from("Hi!"),
                        String::from("Hello! I'm your AI assistant. I'm here to help you with various tasks, such as answering questions, brainstorming ideas, drafting emails, writing code, providing advice, and much more.")
                    ]
                ],
            };
            let sampler = Sampler {
                top_p: 0.5,
                temp: 0.5,
                presence_penalty: 0.5,
                frequency_penalty: 0.5,
            };
            chat_once(
                g_model_v4.as_ref().unwrap(),
                g_state_v4.as_ref().unwrap(),
                g_tokenizer.as_ref().unwrap(),
                prompt,
                sampler,
                txt
            );
        }
        if (g_state_version == 5) {
            let prompt=Prompt {
                user: String::from("User"),
                bot: String::from("Assistant"),
                intro: String::new(),
                text: vec![
                    [
                        String::from("Hi!"),
                        String::from("Hello! I'm your AI assistant. I'm here to help you with various tasks, such as answering questions, brainstorming ideas, drafting emails, writing code, providing advice, and much more.")
                    ]
                ],
            };
            let sampler = Sampler {
                top_p: 0.5,
                temp: 0.5,
                presence_penalty: 0.5,
                frequency_penalty: 0.5,
            };
            chat_once(
                g_model_v5.as_ref().unwrap(),
                g_state_v5.as_ref().unwrap(),
                g_tokenizer.as_ref().unwrap(),
                prompt,
                sampler,
                txt
            );
        }
    }
}

fn chat_once<M, S>(
    model: &M,
    state: &S,
    tokenizer: &Tokenizer,
    prompt: Prompt,
    sampler: Sampler,
    usertext:&str
) -> Result<String>
where
    S: ModelState,
    M: Model<ModelState = S>,
{
    let user = &prompt.user;
    let bot = &prompt.bot;
    let prompt = prompt.build();

    //prompt 第一句话
    let mut tokens = vec![tokenizer.encode(prompt.as_bytes())?];

    println!("\n\nInstructions:\n\n+: Alternative reply\n-: Exit chatting\n\n------------");
    print!("{}", prompt);
    std::io::stdout().flush()?;

    //打印？

    //跑模型
    // run initial prompt
    loop {
        let logits = model.run(&mut tokens, &state)?;
        if logits.iter().any(Option::is_some) {
            break;
        }
    }

    tokens[0].clear();

    let mut backed = state.back();
    let mut last_user_text = String::from("Hi!");
    let mut last_tokens = vec![];

    //loop {
        let mut model_text = String::new();
        let mut user_text = String::from(usertext);
        let mut occurrences = HashMap::new();

        // print!("{}: ", user);
        // std::io::stdout().flush()?;

        // while user_text.is_empty() {
        //     std::io::stdin().read_line(&mut user_text)?;
        //     user_text = user_text.trim().into();
        // }
        //用户输入一行文字？

        if &user_text == "-" {
            return Ok(String::from("notxt"));
        } else if &user_text == "+" {
            state.load(&backed)?;
            user_text = last_user_text.clone();
            tokens = last_tokens.clone();
        } else {
            backed = state.back();
            last_user_text = user_text.clone();
            last_tokens = tokens.clone();
        }

        print!("\n{}:", bot);
        std::io::stdout().flush()?;

        let prompt = format!("{user}: {user_text}\n\n{bot}:");
        tokens[0].append(&mut tokenizer.encode(prompt.as_bytes())?);
        //向量化prompt

        //跑模型
        loop {
            let mut logits = loop {
                let logits = model.run(&mut tokens, &state)?;
                if logits.iter().any(Option::is_some) {
                    break logits;
                }
            };

            //这一段是在干啥？
            logits.iter_mut().for_each(|logits| {
                if let Some(logits) = logits {
                    logits[0] = f32::NEG_INFINITY;
                    for (&token, &count) in occurrences.iter() {
                        let penalty =
                            sampler.presence_penalty + count as f32 * sampler.frequency_penalty;
                        logits[token as usize] -= penalty;
                    }
                }
            });

            //这一段总之是在输出
            let probs = model.softmax(logits)?;
            if let Some(probs) = &probs[0] {
                let token = sampler.sample(probs);
                let decoded = tokenizer.decode(&[token])?;
                let word = String::from_utf8_lossy(&decoded);

                model_text += &word;
                print!("{}", word);
                std::io::stdout().flush()?;

                let v = format!("{}", word);
                console::log_2(&"Chat info.=".into(), &v.into());

                tokens[0] = vec![token];
                let count = occurrences.get(&token).unwrap_or(&1);
                occurrences.insert(token, *count);

                if token == 0 || model_text.contains("\n\n") {
                    break;
                }
            }
        }
    //}

    Ok(model_text)
}

struct Prompt {
    user: String,
    bot: String,
    intro: String,
    text: Vec<[String; 2]>,
}

impl Prompt {
    fn build(&self) -> String {
        let user = self.user.trim();
        let bot = self.bot.trim();
        let intro = self.intro.trim();
        let text = self
            .text
            .iter()
            .map(|turn| {
                let user_text = turn[0].trim();
                let bot_text = turn[1].trim();
                format!("{user}: {user_text}\n\n{bot}: {bot_text}\n\n")
            })
            .join("");
        format!("{intro}\n\n{text}")
            .replace("{user}", user)
            .replace("{bot}", bot)
    }
}

struct Sampler {
    //#[arg(long, default_value_t = 0.5)]
    top_p: f32,
    //#[arg(long, default_value_t = 1.0)]
    temp: f32,
    //#[arg(long, default_value_t = 0.3)]
    presence_penalty: f32,
    //#[arg(long, default_value_t = 0.3)]
    frequency_penalty: f32,
}

impl Sampler {
    pub fn sample(&self, probs: &[f32]) -> u16 {
        let sorted: Vec<_> = probs
            .iter()
            .copied()
            .enumerate()
            .sorted_unstable_by(|(_, x), (_, y)| x.total_cmp(y).reverse())
            .scan((0, 0.0, 0.0), |(_, cum, _), (id, x)| {
                if *cum > self.top_p {
                    None
                } else {
                    *cum += x;
                    Some((id, *cum, x))
                }
            })
            .map(|(id, _, x)| (id, x.powf(1.0 / self.temp)))
            .collect();

        let sum: f32 = sorted.iter().map(|(_, x)| x).sum();
        let sorted: Vec<_> = sorted
            .into_iter()
            .map(|(id, x)| (id, x / sum))
            .scan((0, 0.0), |(_, cum), (id, x)| {
                *cum += x;
                Some((id, *cum))
            })
            .collect();

        let rand: f32 = 0.1; // fastrand::f32();
        let token = sorted
            .into_iter()
            .find_or_first(|&(_, cum)| rand <= cum)
            .map(|(id, _)| id)
            .unwrap_or_default();
        token as u16
    }
}
