use std::collections::HashMap;

use safetensors::{tensor::TensorView, Dtype, SafeTensorError};
use wasm_bindgen::prelude::*;
use web_rwkv::model::loader::Reader;

#[wasm_bindgen(js_name = Tensor)]
#[derive(Debug)]
pub struct JsTensor {
    name: String,
    shape: Vec<usize>,
    data: Vec<u8>,
}

#[wasm_bindgen(js_class = Tensor)]
impl JsTensor {
    #[wasm_bindgen(constructor)]
    pub fn new(name: String, shape: &[usize], data: &[u8]) -> Self {
        let mut buf = vec![0; data.len()];
        buf.copy_from_slice(data);
        Self {
            name,
            shape: shape.to_vec(),
            data: buf,
        }
    }
}

#[wasm_bindgen]
pub struct TensorReader {
    names: Vec<String>,
    tensors: HashMap<String, JsTensor>,
}

#[wasm_bindgen]
impl TensorReader {
    #[wasm_bindgen(constructor)]
    pub fn new(tensors: Vec<JsTensor>) -> Self {
        let names = tensors.iter().map(|x| x.name.clone()).collect();
        let tensors = tensors.into_iter().map(|x| (x.name.clone(), x)).collect();
        Self { names, tensors }
    }
}

impl Reader for TensorReader {
    fn names(&self) -> Vec<&str> {
        self.names.iter().map(AsRef::as_ref).collect()
    }

    fn tensor<'a>(&'a self, name: &str) -> Result<TensorView<'a>, SafeTensorError> {
        let JsTensor { shape, data, .. } = self
            .tensors
            .get(name)
            .ok_or(SafeTensorError::TensorNotFound(name.to_string()))?;
        TensorView::new(Dtype::F16, shape.clone(), data)
    }
}
