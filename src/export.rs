// pub mod context;

// use wasm_bindgen::prelude::*;
// use wasm_bindgen::JsCast;
// use wasm_bindgen_futures::*;
// use wgpu::*;






// static mut iv:i32 = 0;

// #[wasm_bindgen]
// extern "C" {
//     fn alert(s: &str);
// }


// #[wasm_bindgen]
// pub fn greet(name: &str) {
//     alert(&format!("Hello, {}!", name));


// }

// #[wasm_bindgen]
// pub async fn InitWGPU()
// {
//     let instance = Instance::new();
//     let adapter = instance.adapter(wgpu::PowerPreference::HighPerformance)
//              .await?;
//     //         .adapter(wgpu::PowerPreference::HighPerformance)
//     //         .await?;
// }

//  static mut g_context:Context = 0;
//  static mut instance:Instance = 0;
// //  pub async fn InitAsync()-> Result<Context> 
// //  {
// //      let instance = Instance::new();
// //     let adapter = instance
// //         .adapter(wgpu::PowerPreference::HighPerformance)
// //         .await?;
// //     let context = ContextBuilder::new(adapter)
// //         .with_default_pipelines()
// //         .build()
// //         .await?;
// //     println!("{:#?}", context.adapter.get_info());
// //     g_context =context;
// //     g_instance = instance;
// //     Ok(context)
// // }

// // 不需要自动入口
// // #[wasm_bindgen(start)]
// // pub fn run() -> Result<(), JsValue> {
// //     unsafe {
// //         return PROGRAM.init();
// //     }
// // }