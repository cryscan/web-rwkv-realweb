use itertools::Itertools;
use wasm_bindgen::prelude::*;
use web_rwkv::runtime::model::ModelInfo;

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SimpleSampler {
    info: ModelInfo,
}

#[wasm_bindgen]
impl SimpleSampler {
    #[wasm_bindgen(constructor)]
    pub fn new(info: ModelInfo) -> Self {
        Self { info }
    }

    pub fn sample(&self, probs: &[f32]) -> u16 {
        let token = probs
            .iter()
            .take(self.info.num_vocab)
            .copied()
            .enumerate()
            .max_by(|(_, x), (_, y)| x.total_cmp(y))
            .map(|(id, _)| id)
            .unwrap_or_default();
        token as u16
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct NucleusSampler {
    info: ModelInfo,
    pub temp: f32,
    pub top_p: f32,
}

#[wasm_bindgen]
impl NucleusSampler {
    #[wasm_bindgen(constructor)]
    pub fn new(info: ModelInfo, temp: f32, top_p: f32) -> Self {
        Self { info, temp, top_p }
    }

    pub fn sample(&self, probs: &[f32]) -> u16 {
        let sorted: Vec<_> = probs
            .iter()
            .take(self.info.num_vocab)
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
