use anyhow::Result;
use itertools::Itertools;
use wasm_bindgen::prelude::*;
use web_rwkv::{
    context::{ContextBuilder, Instance},
    model::{
        loader::{Loader, Reader},
        v4, v5, v6, BackedState, Model, ModelBuilder, ModelInput, ModelOutput, ModelState,
        ModelVersion, Quant, StateBuilder,
    },
    tensor::TensorError,
};

use std::{
    cell::{Cell, RefCell},
    collections::HashMap,
    future::Future,
    pin::Pin,
};

use crate::{err, loader::TensorReader};

#[wasm_bindgen]
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Hash)]
pub struct StateId(uid::Id<StateId>);

#[wasm_bindgen]
impl StateId {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self(uid::Id::new())
    }
}

pub trait Runner {
    fn run_one<'a>(
        &'a self,
        tokens: &'a [u16],
        state: &'a StateId,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<f32>, TensorError>> + 'a>>;

    fn softmax_one<'a>(
        &'a self,
        input: &'a [f32],
    ) -> Pin<Box<dyn Future<Output = Result<Vec<f32>, TensorError>> + 'a>>;
}

#[derive(Debug)]
pub struct Runtime<M, S, B>
where
    B: BackedState,
    S: ModelState<BackedState = B>,
    M: Model<State = S>,
{
    model: M,
    state: (Cell<StateId>, S),
    backed: RefCell<HashMap<StateId, B>>,
}

impl<M, S, B> Runtime<M, S, B>
where
    B: BackedState,
    S: ModelState<BackedState = B>,
    M: Model<State = S>,
{
    pub async fn new<R: Reader>(
        model: R,
        quant: usize,
        quant_nf4: usize,
        turbo: bool,
    ) -> Result<Self> {
        let instance = Instance::new();
        let adapter = instance
            .adapter(web_rwkv::wgpu::PowerPreference::HighPerformance)
            .await
            .unwrap();
        let info = Loader::info(&model)?;

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
        let model = ModelBuilder::new(&context, &model)
            .with_quant(quant)
            .with_turbo(turbo)
            .build()?;

        let state = StateBuilder::new(&context, &info).with_num_batch(1).build();

        Ok(Self {
            model,
            state: (StateId::new().into(), state),
            backed: HashMap::new().into(),
        })
    }

    async fn checkout(&self, id: StateId) -> Result<(), TensorError> {
        if self.state.0.get() == id {
            return Ok(());
        }

        self.back().await;
        self.state.0.set(id);

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
        let id = self.state.0.get();
        let backed = self.state.1.back().await;
        self.backed.borrow_mut().insert(id, backed);
    }

    pub async fn run_one(&self, tokens: &[u16], state: &StateId) -> Result<Vec<f32>, TensorError> {
        self.checkout(*state).await?;

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

impl<M, S, B> Runner for Runtime<M, S, B>
where
    B: BackedState,
    S: ModelState<BackedState = B>,
    M: Model<State = S>,
{
    fn run_one<'a>(
        &'a self,
        tokens: &'a [u16],
        state: &'a StateId,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<f32>, TensorError>> + 'a>> {
        Box::pin(self.run_one(tokens, state))
    }

    fn softmax_one<'a>(
        &'a self,
        input: &'a [f32],
    ) -> Pin<Box<dyn Future<Output = Result<Vec<f32>, TensorError>> + 'a>> {
        Box::pin(self.softmax_one(input))
    }
}

#[wasm_bindgen(js_name = Runtime)]
pub struct RuntimeExport(Box<dyn Runner>);

#[wasm_bindgen(js_class = Runtime)]
impl RuntimeExport {
    #[wasm_bindgen(constructor)]
    pub async fn new(
        // data: &[u8],
        model: TensorReader,
        quant: usize,
        quant_nf4: usize,
        turbo: bool,
    ) -> Result<RuntimeExport, JsError> {
        // let model = SafeTensors::deserialize(data)?;
        let info = Loader::info(&model).map_err(err)?;
        let runtime = match info.version {
            ModelVersion::V4 => Self(Box::new(
                Runtime::<v4::Model<f32>, _, _>::new(model, quant, quant_nf4, turbo)
                    .await
                    .map_err(err)?,
            )),
            ModelVersion::V5 => Self(Box::new(
                Runtime::<v5::Model<f32>, _, _>::new(model, quant, quant_nf4, turbo)
                    .await
                    .map_err(err)?,
            )),
            ModelVersion::V6 => Self(Box::new(
                Runtime::<v6::Model<f32>, _, _>::new(model, quant, quant_nf4, turbo)
                    .await
                    .map_err(err)?,
            )),
        };
        Ok(runtime)
    }

    pub async fn run_one(
        &self,
        tokens: &[u16],
        output: &mut [f32],
        state: &StateId,
    ) -> Result<(), TensorError> {
        let temp = self.0.run_one(tokens, state).await?;
        output.copy_from_slice(&temp);
        Ok(())
    }

    pub async fn softmax_one(&self, input: &[f32], output: &mut [f32]) -> Result<(), TensorError> {
        let temp = self.0.softmax_one(input).await?;
        output.copy_from_slice(&temp);
        Ok(())
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
