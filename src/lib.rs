pub mod context;
pub mod export;
pub mod model;
pub mod num;
pub mod tensor;
pub mod tokenizer;

pub use wgpu;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use web_sys::console;

use anyhow::Result;
//use clap::{Args, Parser};
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
static mut g_state_v4: Option<model::v4::ModelState> = None;
static mut g_state_version: i32 = 0;
static mut g_state_v5: Option<model::v5::ModelState> = None;
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
                    g_state_version = 4;
                    g_state_v5 = Some(state);
                    console::log_1(&"LoadModel V5 done.".into());
                }
                //run_internal(model, state, tokenizer, prompt, sampler)
            }
        }
    }
  
}
