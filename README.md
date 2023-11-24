# 这是 Web-RWKV 项目 的 一个修改版本

原项目地址

https://github.com/cryscan/web-rwkv

主要增加了web wasm 方面的内容



# 依赖

## 依赖 nodejs 和 typescript 

用来将ts 变成 js

nodejs 安装略

typescript 安装，使用命令 npm install -g typescript

## 依赖 rust 和 wasm-pack 

用来打包 wasm

rust 安装略

wasm-pack 安装，使用命令 cargo install wasm-pack

## 依赖下载

需要下载模型

下载模型的地址：

https://huggingface.co/cgisky/RWKV-safetensors-fp16/tree/main

https://huggingface.co/cgisky/RWKV-safetensors-fp16/resolve/main/RWKV-4-World-0.4B-v1-20230529-ctx4096.st?download=true

将这个文件放到 assets/models 目录下

如果你使用

# 打包

执行 buildwasm.cmd 打包 wasm文件

执行 tsc 指令 生成 app.js

# 执行

启动一个http服务器，执行index.html

用vscode 的 插件 liveserver 测试正常

如果使用其它httpserver 主要注意 wasm 文件 和 模型文件的扩展名特殊，需要 mime 处理或者改名

# 目前进展

已经通过 web 加载成功模型

下一步目标 完成一轮对话。

