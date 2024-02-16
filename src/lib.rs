use wasm_bindgen::prelude::*;

pub mod run;
pub mod sampler;

fn err(err: impl ToString) -> JsError {
    JsError::new(&err.to_string())
}
