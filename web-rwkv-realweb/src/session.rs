use std::cell::RefCell;

use anyhow::Result;
use half::f16;
use wasm_bindgen::prelude::*;
use web_rwkv::{
    context::{Context, ContextBuilder, InstanceExt},
    runtime::{
        infer::{InferInput, InferInputBatch, InferOption},
        loader::{Loader, Reader},
        model::{Bundle, ContextAutoLimits, ModelBuilder, ModelInfo, ModelVersion, Quant, State},
        softmax::softmax_one,
        v4, v5, v6, v7, Runtime, SimpleRuntime,
    },
    tensor::TensorCpu,
    wgpu::{Instance, PowerPreference},
};

use crate::{cache::Cache, loader::TensorReader};

pub const TOKEN_CHUNK_SIZE: usize = 128;

pub struct Session {
    context: Context,
    info: ModelInfo,
    runtime: Box<dyn Runtime>,
    state: Box<dyn State>,
    cache: RefCell<Cache>,
}

impl Session {
    pub async fn new<R: Reader>(model: R, quant: usize, quant_nf4: usize) -> Result<Self> {
        let instance = Instance::new(Default::default());
        let adapter = instance
            .adapter(PowerPreference::HighPerformance)
            .await
            .expect("failed to request adapter");
        let info = Loader::info(&model)?;

        let context = ContextBuilder::new(adapter)
            .auto_limits(&info)
            .build()
            .await?;

        let quant = (0..quant)
            .map(|layer| (layer, Quant::Int8))
            .chain((0..quant_nf4).map(|layer| (layer, Quant::NF4)))
            .collect();
        let builder = ModelBuilder::new(&context, model).quant(quant);
        let (runtime, state): (Box<dyn Runtime>, Box<dyn State>) = match info.version {
            ModelVersion::V4 => {
                let model = builder.build_v4().await?;
                let bundle = v4::Bundle::<f16>::new(model, 1);
                let state = bundle.state();
                let runtime = SimpleRuntime::new(bundle);
                (Box::new(runtime), Box::new(state))
            }
            ModelVersion::V5 => {
                let model = builder.build_v5().await?;
                let bundle = v5::Bundle::<f16>::new(model, 1);
                let state = bundle.state();
                let runtime = SimpleRuntime::new(bundle);
                (Box::new(runtime), Box::new(state))
            }
            ModelVersion::V6 => {
                let model = builder.build_v6().await?;
                let bundle = v6::Bundle::<f16>::new(model, 1);
                let state = bundle.state();
                let runtime = SimpleRuntime::new(bundle);
                (Box::new(runtime), Box::new(state))
            }
            ModelVersion::V7 => {
                let model = builder.build_v7().await?;
                let bundle = v7::Bundle::<f16>::new(model, 1);
                let state = bundle.state();
                let runtime = SimpleRuntime::new(bundle);
                (Box::new(runtime), Box::new(state))
            }
        };

        let cache = RefCell::new(Default::default());

        Ok(Self {
            context,
            info,
            runtime,
            state,
            cache,
        })
    }

    pub async fn back(&self) -> Result<TensorCpu<f32>> {
        Ok(self.state.back(0).await?)
    }

    pub fn load(&self, backed: TensorCpu<f32>) -> Result<()> {
        Ok(self.state.load(backed, 0)?)
    }

    pub async fn run(&self, tokens: &[u16]) -> Result<TensorCpu<f32>> {
        let tokens = tokens.to_owned();
        let mut inference = Some(InferInput::new(
            vec![InferInputBatch {
                tokens,
                option: InferOption::Last,
            }],
            TOKEN_CHUNK_SIZE,
        ));

        let output = loop {
            let input = inference.take().unwrap();
            let (input, output) = self.runtime.infer(input).await?;
            inference = Some(input);

            let output = output[0].0.clone();
            if !output.is_empty() {
                break output;
            }
        };

        Ok(output)
    }

    pub async fn softmax(&self, logits: TensorCpu<f32>) -> Result<TensorCpu<f32>> {
        Ok(softmax_one(&self.context, logits).await?)
    }
}

fn err(err: impl ToString) -> JsError {
    JsError::new(&err.to_string())
}

#[wasm_bindgen(js_name = Session)]
pub struct SessionExport(Session);

#[wasm_bindgen(js_class = Session)]
impl SessionExport {
    #[wasm_bindgen(constructor)]
    pub async fn new(model: TensorReader, quant: usize, quant_nf4: usize) -> Result<Self, JsError> {
        let session = Session::new(model, quant, quant_nf4).await.map_err(err)?;
        Ok(Self(session))
    }

    pub async fn run(&self, tokens: &[u16], output: &mut [f32]) -> Result<(), JsError> {
        let data = self.0.run(tokens).await.map_err(err)?;
        output.copy_from_slice(&data.data()[..output.len()]);
        Ok(())
    }

    pub async fn softmax(&self, input: &[f32], output: &mut [f32]) -> Result<(), JsError> {
        assert_eq!(input.len(), output.len());
        let input = self
            .0
            .context
            .tensor_from_data([input.len(), 1, 1, 1], input.to_vec())
            .map_err(err)?;
        let data = self.0.softmax(input).await.map_err(err)?;
        output.copy_from_slice(&data.data()[..output.len()]);
        Ok(())
    }

    pub fn info(&self) -> ModelInfo {
        self.0.info.clone()
    }

    pub fn state_len(&self) -> usize {
        self.0.state.init_shape().len()
    }

    pub async fn back(&self, state: &mut [f32]) -> Result<(), JsError> {
        let data = self.0.back().await.map_err(err)?;
        assert_eq!(data.len(), state.len());
        state.copy_from_slice(&data);
        Ok(())
    }

    pub fn load(&self, state: &[f32]) -> Result<(), JsError> {
        let shape = self.0.state.init_shape();
        let state = self.0.context.tensor_from_data(shape, state.to_vec())?;
        self.0.load(state).map_err(err)
    }

    pub fn checkout(
        &self,
        tokens: &[u16],
        state: &mut [f32],
        output: &mut [f32],
    ) -> Result<usize, JsError> {
        let cache = self.0.cache.borrow();
        let checkout = cache.checkout(tokens);

        let cutoff = match checkout.item {
            Some(item) => {
                assert_eq!(item.state.len(), state.len());
                state.copy_from_slice(&item.state);

                assert_eq!(item.output.len(), output.len());
                output.copy_from_slice(&item.output);

                checkout.prefix.len()
            }
            None => {
                let data = self.0.state.init().to_vec();
                assert_eq!(data.len(), state.len());
                state.copy_from_slice(&data);

                let data = vec![0.0; output.len()];
                output.copy_from_slice(&data);

                0
            }
        };

        Ok(cutoff)
    }

    pub fn cache(&self, tokens: &[u16], state: &[f32], output: &[f32]) -> Result<(), JsError> {
        let mut cache = self.0.cache.borrow_mut();

        let shape = self.0.state.init_shape();
        let state = self
            .0
            .context
            .tensor_from_data(shape, state.to_vec())
            .map_err(err)?;

        let output = self
            .0
            .context
            .tensor_from_data([output.len(), 1, 1, 1], output.to_vec())
            .map_err(err)?;

        cache.insert(tokens, state, output);

        Ok(())
    }

    pub fn clear_cache(&self) {
        let mut cache = self.0.cache.borrow_mut();
        cache.clear();
    }
}
