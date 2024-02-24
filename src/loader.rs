use std::collections::HashMap;

use js_sys::Uint8Array;
use safetensors::SafeTensorError;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_rwkv::model::loader::{Reader, ReaderTensor};
use web_sys::Blob;

#[wasm_bindgen(js_name = Tensor)]
#[derive(Debug, Clone)]
pub struct JsTensor {
    name: String,
    shape: Vec<usize>,
    blob: Blob,
}

#[wasm_bindgen(js_class = Tensor)]
impl JsTensor {
    #[wasm_bindgen(constructor)]
    pub fn new(name: String, shape: &[usize], blob: Blob) -> Self {
        Self {
            name,
            shape: shape.to_vec(),
            blob,
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

    fn contains(&self, name: &str) -> bool {
        self.names.contains(&name.to_string())
    }

    async fn tensor(&self, name: &str) -> Result<ReaderTensor, SafeTensorError> {
        let tensor = self
            .tensors
            .get(name)
            .ok_or(SafeTensorError::TensorNotFound(name.to_string()))?;

        let value = JsFuture::from(tensor.blob.array_buffer())
            .await
            .map_err(|_| SafeTensorError::TensorNotFound(name.to_string()))?;
        let array = Uint8Array::new(&value);
        let data = array.to_vec();

        Ok((tensor.shape.clone(), data.into()))
        // TensorView::new(Dtype::F16, shape.clone(), data)
    }
}
