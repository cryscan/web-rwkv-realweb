use itertools::Itertools;
use wasm_bindgen::prelude::*;

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
