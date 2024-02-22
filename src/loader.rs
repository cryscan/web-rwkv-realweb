use std::{borrow::Cow, collections::HashMap, future::Future, pin::Pin};

use js_sys::{Promise, Uint8Array};
use safetensors::SafeTensorError;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_rwkv::model::loader::Reader;

#[wasm_bindgen(js_name = Tensor)]
#[derive(Debug, Clone)]
pub struct JsTensor {
    name: String,
    shape: Vec<usize>,
    data: Promise,
}

#[wasm_bindgen(js_class = Tensor)]
impl JsTensor {
    #[wasm_bindgen(constructor)]
    pub fn new(name: String, shape: &[usize], data: Promise) -> Self {
        Self {
            name,
            shape: shape.to_vec(),
            data,
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

    fn tensor<'a>(
        &'a self,
        name: &str,
    ) -> Pin<Box<dyn Future<Output = Result<(Vec<usize>, Cow<'a, [u8]>), SafeTensorError>> + 'a>>
    {
        let name = name.to_string();
        Box::pin(async move {
            let tensor = self
                .tensors
                .get(&name)
                .ok_or(SafeTensorError::TensorNotFound(name.clone()))?;

            let value = JsFuture::from(tensor.data.clone())
                .await
                .map_err(|_| SafeTensorError::TensorNotFound(name))?;
            let array = Uint8Array::new(&value);
            let data = array.to_vec();

            Ok((tensor.shape.clone(), data.into()))
            // TensorView::new(Dtype::F16, shape.clone(), data)
        })
    }
}
