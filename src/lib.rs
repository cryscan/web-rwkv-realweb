use anyhow::Result;
use itertools::Itertools;
use std::{cell::RefCell, collections::HashMap};
use wasm_bindgen::prelude::*;
use web_rwkv::{
    context::{ContextBuilder, Instance},
    model::{
        loader::Loader, v4, v5, v6, BackedState, Model, ModelBuilder, ModelInput, ModelOutput,
        ModelState, ModelVersion, Quant, StateBuilder,
    },
    tensor::TensorError,
    tokenizer::{Tokenizer, TokenizerError},
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct StateIdKind;

#[wasm_bindgen]
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Hash)]
pub struct StateId(uid::Id<StateIdKind>);

#[wasm_bindgen]
impl StateId {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self(uid::Id::new())
    }
}

#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Clone)]
pub struct Vocab(pub Vec<f32>);

impl std::ops::Deref for Vocab {
    type Target = [f32];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(Debug)]
pub struct Runtime<M, S, B>
where
    B: BackedState,
    S: ModelState<BackedState = B>,
    M: Model<State = S>,
{
    tokenizer: Tokenizer,
    model: M,
    state: (RefCell<StateId>, S),
    backed: RefCell<HashMap<StateId, B>>,
}

impl<M, S, B> Runtime<M, S, B>
where
    B: BackedState,
    S: ModelState<BackedState = B>,
    M: Model<State = S>,
{
    pub async fn new(
        vocab: &str,
        data: &[u8],
        quant: usize,
        quant_nf4: usize,
        turbo: bool,
    ) -> Result<Self> {
        let instance = Instance::new();
        let adapter = instance
            .adapter(web_rwkv::wgpu::PowerPreference::HighPerformance)
            .await
            .unwrap();
        let info = Loader::info(data)?;

        let context = ContextBuilder::new(adapter)
            .with_auto_limits(&info)
            .build()
            .await
            .unwrap();

        let quant = (0..quant).map(|layer| (layer, Quant::Int8)).collect_vec();
        let quant_nf4 = (0..quant_nf4)
            .map(|layer| (layer, Quant::NF4))
            .collect_vec();
        let quant = quant.into_iter().chain(quant_nf4.into_iter()).collect();
        let model = ModelBuilder::new(&context, data)
            .with_quant(quant)
            .with_turbo(turbo)
            .build()?;

        let state = StateBuilder::new(&context, &info).with_num_batch(1).build();

        let tokenizer = Tokenizer::new(vocab)?;

        Ok(Self {
            tokenizer,
            model,
            state: (StateId::new().into(), state),
            backed: HashMap::new().into(),
        })
    }

    async fn checkout(&self, id: StateId) -> Result<(), TensorError> {
        if *self.state.0.borrow() == id {
            return Ok(());
        }

        self.back().await;
        *self.state.0.borrow_mut() = id;

        let backed = self.backed.borrow();
        if let Some(backed) = backed.get(&id) {
            self.state.1.load(backed)?;
        } else {
            let context = self.model.context();
            let info = self.model.info();
            let backed = StateBuilder::new(context, info)
                .with_num_batch(1)
                .build_backed();
            self.state.1.load(&backed)?;
        }

        Ok(())
    }

    async fn back(&self) {
        let id = *self.state.0.borrow();
        let backed = self.state.1.back().await;
        self.backed.borrow_mut().insert(id, backed);
    }

    pub fn encode(&self, input: &str) -> Result<Vec<u16>, TokenizerError> {
        self.tokenizer.encode(input.as_bytes())
    }

    pub fn decode(&self, tokens: &[u16]) -> Result<Vec<u8>, TokenizerError> {
        self.tokenizer.decode(tokens)
    }

    pub async fn run_one(&self, tokens: &[u16], state: StateId) -> Result<Vec<f32>, TensorError> {
        self.checkout(state).await?;

        let tokens = tokens.to_owned();
        let mut tokens = vec![ModelInput {
            tokens,
            ..Default::default()
        }];

        let mut outputs = vec![ModelOutput::None];
        while outputs.iter().all(ModelOutput::is_none) {
            outputs = self.model.run(&mut tokens, &self.state.1).await?;
        }

        let output = std::mem::take(&mut outputs[0]);
        let output = match output {
            ModelOutput::Last(data) => data,
            _ => unreachable!(),
        };
        Ok(output)
    }

    pub async fn softmax_one(&self, input: &[f32]) -> Result<Vec<f32>, TensorError> {
        let input = vec![ModelOutput::Last(input.to_vec())];
        let mut output = self.model.softmax(input).await?;

        let output = std::mem::take(&mut output[0]);
        let output = match output {
            ModelOutput::Last(data) => data,
            _ => unreachable!(),
        };
        Ok(output)
    }
}

#[derive(Debug)]
pub enum RuntimeUntyped<'a> {
    V4(Runtime<v4::Model<'a>, v4::ModelState, v4::BackedState>),
    V5(Runtime<v5::Model<'a>, v5::ModelState, v5::BackedState>),
    V6(Runtime<v6::Model<'a>, v6::ModelState, v6::BackedState>),
}

#[wasm_bindgen(js_name = Runtime)]
#[derive(Debug)]
pub struct RuntimeExport(RuntimeUntyped<'static>);

impl std::ops::Deref for RuntimeExport {
    type Target = RuntimeUntyped<'static>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[wasm_bindgen(js_class = Runtime)]
impl RuntimeExport {
    #[wasm_bindgen(constructor)]
    pub async fn new(
        vocab: &str,
        data: &[u8],
        quant: usize,
        quant_nf4: usize,
        turbo: bool,
    ) -> Result<RuntimeExport, JsError> {
        let err = |err: anyhow::Error| JsError::new(err.to_string().leak());
        let info = Loader::info(data).map_err(err)?;
        Ok(match info.version {
            ModelVersion::V4 => Self(RuntimeUntyped::V4(
                Runtime::new(vocab, data, quant, quant_nf4, turbo)
                    .await
                    .map_err(err)?,
            )),
            ModelVersion::V5 => Self(RuntimeUntyped::V5(
                Runtime::new(vocab, data, quant, quant_nf4, turbo)
                    .await
                    .map_err(err)?,
            )),
            ModelVersion::V6 => Self(RuntimeUntyped::V6(
                Runtime::new(vocab, data, quant, quant_nf4, turbo)
                    .await
                    .map_err(err)?,
            )),
        })
    }

    pub fn encode(&self, input: &str) -> Result<Vec<u16>, TokenizerError> {
        match &self.0 {
            RuntimeUntyped::V4(rt) => rt.encode(input),
            RuntimeUntyped::V5(rt) => rt.encode(input),
            RuntimeUntyped::V6(rt) => rt.encode(input),
        }
    }

    pub fn decode(&self, tokens: &[u16]) -> Result<String, TokenizerError> {
        let temp = match &self.0 {
            RuntimeUntyped::V4(rt) => rt.decode(tokens),
            RuntimeUntyped::V5(rt) => rt.decode(tokens),
            RuntimeUntyped::V6(rt) => rt.decode(tokens),
        }?;
        Ok(String::from_utf8_lossy(&temp).into())
    }

    pub async fn run_one(&self, tokens: &[u16], state: StateId) -> Result<Vocab, TensorError> {
        let temp = match &self.0 {
            RuntimeUntyped::V4(rt) => rt.run_one(tokens, state).await,
            RuntimeUntyped::V5(rt) => rt.run_one(tokens, state).await,
            RuntimeUntyped::V6(rt) => rt.run_one(tokens, state).await,
        }?;
        Ok(Vocab(temp))
    }

    pub async fn softmax_one(&self, input: Vocab) -> Result<Vocab, TensorError> {
        let temp = match &self.0 {
            RuntimeUntyped::V4(rt) => rt.softmax_one(&input).await,
            RuntimeUntyped::V5(rt) => rt.softmax_one(&input).await,
            RuntimeUntyped::V6(rt) => rt.softmax_one(&input).await,
        }?;
        Ok(Vocab(temp))
    }
}

// struct Prompt {
//     user: String,
//     bot: String,
//     intro: String,
//     text: Vec<[String; 2]>,
// }

// impl Prompt {
//     fn build(&self) -> String {
//         let user = self.user.trim();
//         let bot = self.bot.trim();
//         let intro = self.intro.trim();
//         let text = self
//             .text
//             .iter()
//             .map(|turn| {
//                 let user_text = turn[0].trim();
//                 let bot_text = turn[1].trim();
//                 format!("{user}: {user_text}\n\n{bot}: {bot_text}\n\n")
//             })
//             .join("");
//         format!("{intro}\n\n{text}")
//             .replace("{user}", user)
//             .replace("{bot}", bot)
//     }
// }

#[wasm_bindgen]
pub struct Sampler {
    pub temp: f32,
    pub top_p: f32,
}

impl Default for Sampler {
    fn default() -> Self {
        Self {
            temp: 1.0,
            top_p: 0.5,
        }
    }
}

#[wasm_bindgen]
impl Sampler {
    #[wasm_bindgen(constructor)]
    pub fn new(temp: f32, top_p: f32) -> Sampler {
        Self { temp, top_p }
    }

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

        let rand: f32 = fastrand::f32();
        let token = sorted
            .into_iter()
            .find_or_first(|&(_, cum)| rand <= cum)
            .map(|(id, _)| id)
            .unwrap_or_default();
        token as u16
    }
}
