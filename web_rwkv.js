let wasm_bindgen;
(function() {
    const __exports = {};
    let script_src;
    if (typeof document !== 'undefined' && document.currentScript !== null) {
        script_src = new URL(document.currentScript.src, location.href).toString();
    }
    let wasm = undefined;

    const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

    if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

    let cachedUint8Memory0 = null;

    function getUint8Memory0() {
        if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
            cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8Memory0;
    }

    function getStringFromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
    }

    const heap = new Array(128).fill(undefined);

    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');

        heap[idx] = obj;
        return idx;
    }

function getObject(idx) { return heap[idx]; }

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error('expected a boolean argument');
    }
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (typeof(arg) !== 'string') throw new Error('expected a string argument');

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);

            } else {
                state.a = a;
            }
        }
    };
    real.original = state;

    return real;
}

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        let error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch(_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error('expected a number argument');
}
function __wbg_adapter_28(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h82c930fc44d739e5(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_31(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h9e26f1165c72e698(arg0, arg1, addHeapObject(arg2));
}

/**
* @returns {Promise<void>}
*/
__exports.InitWGPU = function() {
    const ret = wasm.InitWGPU();
    return takeObject(ret);
};

/**
* @param {string} txt
*/
__exports.LoadTokenizer = function(txt) {
    const ptr0 = passStringToWasm0(txt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.LoadTokenizer(ptr0, len0);
};

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
* @param {Uint8Array} fileData
*/
__exports.LoadModel = function(fileData) {
    const ptr0 = passArray8ToWasm0(fileData, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.LoadModel(ptr0, len0);
};

/**
* @param {string} txt
*/
__exports.chat = function(txt) {
    const ptr0 = passStringToWasm0(txt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.chat(ptr0, len0);
};

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

let cachedUint32Memory0 = null;

function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.byteLength === 0) {
        cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
}
function __wbg_adapter_354(arg0, arg1, arg2, arg3) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h2ee096703b65f356(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_Window_7bd5d737b6110ed5 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).Window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_WorkerGlobalScope_10e1fa12a09a520b = function() { return logError(function (arg0) {
        const ret = getObject(arg0).WorkerGlobalScope;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'string';
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbg_crypto_58f13aa23ffcb166 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_msCrypto_abcb1295e768d1f2 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getRandomValues_504510b5564925af = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_randomFillSync_a0d98aa11c81fe89 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_require_2784e593a4674877 = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_process_5b786e71d465a513 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_versions_c2ab80650590b6a2 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).versions;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_node_523d7bd03ef69fba = function() { return logError(function (arg0) {
        const ret = getObject(arg0).node;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbg_queueMicrotask_e5949c35d772a669 = function() { return logError(function (arg0) {
        queueMicrotask(getObject(arg0));
    }, arguments) };
    imports.wbg.__wbg_queueMicrotask_2be8b97a81fe4d00 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).queueMicrotask;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_instanceof_Window_9029196b662bc42a = function() { return logError(function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Window;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_document_f7ace2b956f30a4f = function() { return logError(function (arg0) {
        const ret = getObject(arg0).document;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_navigator_7c9103698acde322 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).navigator;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_querySelectorAll_c03e8664a5a0f0c5 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).querySelectorAll(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_log_1d3ae0273d8f4f8a = function() { return logError(function (arg0) {
        console.log(getObject(arg0));
    }, arguments) };
    imports.wbg.__wbg_log_576ca876af0d4a77 = function() { return logError(function (arg0, arg1) {
        console.log(getObject(arg0), getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_navigator_41bd88b80ed4685e = function() { return logError(function (arg0) {
        const ret = getObject(arg0).navigator;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getPreferredCanvasFormat_1f6c9ef810196b92 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).getPreferredCanvasFormat();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_requestAdapter_d8298d7a27a391f0 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).requestAdapter(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_instanceof_GpuValidationError_af2aa2e306669317 = function() { return logError(function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof GPUValidationError;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_copyExternalImageToTexture_819ec294d299f624 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).copyExternalImageToTexture(getObject(arg1), getObject(arg2), getObject(arg3));
    }, arguments) };
    imports.wbg.__wbg_submit_3104e9b014f75846 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).submit(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_writeBuffer_becf0c8f0323ffd7 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).writeBuffer(getObject(arg1), arg2, getObject(arg3), arg4, arg5);
    }, arguments) };
    imports.wbg.__wbg_writeTexture_465ecc6146e5052c = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).writeTexture(getObject(arg1), getObject(arg2), getObject(arg3), getObject(arg4));
    }, arguments) };
    imports.wbg.__wbg_has_8720889cf3ad610c = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).has(getStringFromWasm0(arg1, arg2));
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_finish_863657abae52896e = function() { return logError(function (arg0) {
        const ret = getObject(arg0).finish();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_finish_e580ef236d53f04b = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).finish(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_e6d2dd2ab3573b6d = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_6bc8944422dbb3cd = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2), getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_draw_3958097471a10642 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).draw(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_drawIndexed_8856cc4ccffa3498 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).drawIndexed(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_drawIndexedIndirect_0404fa6cb9a6db25 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).drawIndexedIndirect(getObject(arg1), arg2);
    }, arguments) };
    imports.wbg.__wbg_drawIndirect_95c6eb1494a44d06 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).drawIndirect(getObject(arg1), arg2);
    }, arguments) };
    imports.wbg.__wbg_setIndexBuffer_4dc5432dc348458d = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).setIndexBuffer(getObject(arg1), takeObject(arg2), arg3);
    }, arguments) };
    imports.wbg.__wbg_setIndexBuffer_f3bae4da9e407eaf = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).setIndexBuffer(getObject(arg1), takeObject(arg2), arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_setPipeline_66f1e900256fc946 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).setPipeline(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_setVertexBuffer_c782d133fd439184 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).setVertexBuffer(arg1 >>> 0, getObject(arg2), arg3);
    }, arguments) };
    imports.wbg.__wbg_setVertexBuffer_4da0a96267ce82db = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).setVertexBuffer(arg1 >>> 0, getObject(arg2), arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_gpu_1678673f109c8aeb = function() { return logError(function (arg0) {
        const ret = getObject(arg0).gpu;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_size_6540ddb49e0d7120 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).size;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_usage_f5b34f3e0170424b = function() { return logError(function (arg0) {
        const ret = getObject(arg0).usage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_destroy_9b5398e5b148e210 = function() { return logError(function (arg0) {
        getObject(arg0).destroy();
    }, arguments) };
    imports.wbg.__wbg_getMappedRange_becef7e3d9dc5489 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getMappedRange(arg1, arg2);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_mapAsync_91acdcf41b7ae21d = function() { return logError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).mapAsync(arg1 >>> 0, arg2, arg3);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_unmap_1677c09514e08e64 = function() { return logError(function (arg0) {
        getObject(arg0).unmap();
    }, arguments) };
    imports.wbg.__wbg_label_c7970304720cf8b0 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg1).label;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_beginComputePass_579a2563c561da68 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).beginComputePass(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_beginRenderPass_d04327f7231bd5af = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).beginRenderPass(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_clearBuffer_c370e7adb8398388 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).clearBuffer(getObject(arg1), arg2);
    }, arguments) };
    imports.wbg.__wbg_clearBuffer_b8e6751290709d43 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).clearBuffer(getObject(arg1), arg2, arg3);
    }, arguments) };
    imports.wbg.__wbg_copyBufferToBuffer_79ac12f409453cf0 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).copyBufferToBuffer(getObject(arg1), arg2, getObject(arg3), arg4, arg5);
    }, arguments) };
    imports.wbg.__wbg_copyBufferToTexture_ac956e6d47c24e73 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).copyBufferToTexture(getObject(arg1), getObject(arg2), getObject(arg3));
    }, arguments) };
    imports.wbg.__wbg_copyTextureToBuffer_787ec8d8c4c216f1 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).copyTextureToBuffer(getObject(arg1), getObject(arg2), getObject(arg3));
    }, arguments) };
    imports.wbg.__wbg_copyTextureToTexture_a86e849469b0ef38 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).copyTextureToTexture(getObject(arg1), getObject(arg2), getObject(arg3));
    }, arguments) };
    imports.wbg.__wbg_finish_5153789564a5eee5 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).finish();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_finish_d1049a13335e8326 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).finish(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_resolveQuerySet_8ac49c71e15cdf6a = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).resolveQuerySet(getObject(arg1), arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_writeTimestamp_107647519ce52436 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).writeTimestamp(getObject(arg1), arg2 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_instanceof_GpuCanvasContext_7a77e275c38d41d8 = function() { return logError(function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof GPUCanvasContext;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_configure_93a57a4e5e0f8bcf = function() { return logError(function (arg0, arg1) {
        getObject(arg0).configure(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_getCurrentTexture_ecedc4f6f71990d2 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).getCurrentTexture();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_features_dfb2178c91fa1dd7 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).features;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_limits_45ceb777867eb768 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).limits;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_queue_f2aeb5c277e56f93 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).queue;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setonuncapturederror_b3c814f611d5e585 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).onuncapturederror = getObject(arg1);
    }, arguments) };
    imports.wbg.__wbg_createBindGroup_fa5515d52f9c6a69 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createBindGroup(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createBindGroupLayout_af3b9d9ee0a1f5f9 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createBindGroupLayout(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createBuffer_36e159f52cc644a7 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createBuffer(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createCommandEncoder_a50a1dab2b499b95 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createCommandEncoder(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createComputePipeline_89131452dfd12672 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createComputePipeline(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createPipelineLayout_1e10c8281fb85c01 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createPipelineLayout(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createQuerySet_ccb746122176f8e5 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createQuerySet(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createRenderBundleEncoder_ad2d0237f581427b = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createRenderBundleEncoder(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createRenderPipeline_745f00bcb1ca6edf = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createRenderPipeline(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createSampler_09cd36835c9befb3 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createSampler(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createShaderModule_59bbf537b8b5cf7c = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createShaderModule(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_createTexture_dbd00b550944125c = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createTexture(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_destroy_abb6deaa6cb27aa3 = function() { return logError(function (arg0) {
        getObject(arg0).destroy();
    }, arguments) };
    imports.wbg.__wbg_popErrorScope_19075fb98a08b740 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).popErrorScope();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_pushErrorScope_0728aae3f2d3ed48 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).pushErrorScope(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_instanceof_GpuOutOfMemoryError_45166ef4e2774fbe = function() { return logError(function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof GPUOutOfMemoryError;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxTextureDimension1D_4d1ddb46ed9dc470 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxTextureDimension1D;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxTextureDimension2D_37a46e61490c8297 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxTextureDimension2D;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxTextureDimension3D_7e3a97204d211743 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxTextureDimension3D;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxTextureArrayLayers_fee4db585706a5eb = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxTextureArrayLayers;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxBindGroups_dc8a5f97ba653c91 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxBindGroups;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxBindingsPerBindGroup_3d5ab311420be5df = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxBindingsPerBindGroup;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxDynamicUniformBuffersPerPipelineLayout_6b839b7dc97f34f0 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxDynamicUniformBuffersPerPipelineLayout;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxDynamicStorageBuffersPerPipelineLayout_5328cd2b9d884831 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxDynamicStorageBuffersPerPipelineLayout;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxSampledTexturesPerShaderStage_ac006b00cf776b4a = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxSampledTexturesPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxSamplersPerShaderStage_dc092d6a272be20a = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxSamplersPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxStorageBuffersPerShaderStage_dc5b58734b9ab932 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxStorageBuffersPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxStorageTexturesPerShaderStage_2fec939cb0d5bbfd = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxStorageTexturesPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxUniformBuffersPerShaderStage_b30d53cbf89caeae = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxUniformBuffersPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxUniformBufferBindingSize_eec576e1342504b5 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxUniformBufferBindingSize;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxStorageBufferBindingSize_1ef0cc5e43dad09b = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxStorageBufferBindingSize;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_minUniformBufferOffsetAlignment_3af8c32faa30c5d8 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).minUniformBufferOffsetAlignment;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_minStorageBufferOffsetAlignment_766ef8ea8f9fe6e1 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).minStorageBufferOffsetAlignment;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxVertexBuffers_b4d31be9e3f93990 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxVertexBuffers;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxBufferSize_2d8398a691b9a8ce = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxBufferSize;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxVertexAttributes_904c5eb19a6f6c65 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxVertexAttributes;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxVertexBufferArrayStride_6800975c373d83bc = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxVertexBufferArrayStride;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxInterStageShaderComponents_b9f179b1cde06d08 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxInterStageShaderComponents;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupStorageSize_9318e498283b79fb = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupStorageSize;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeInvocationsPerWorkgroup_2bfea723194ac5a0 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxComputeInvocationsPerWorkgroup;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupSizeX_91fc9ba04de4148f = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupSizeX;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupSizeY_9052627dce4a7d1f = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupSizeY;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupSizeZ_45a1a82f8446a750 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupSizeZ;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupsPerDimension_100ee7392cc04c20 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).maxComputeWorkgroupsPerDimension;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createView_3e46af1f54fdcd1f = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).createView(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_destroy_728f676d96e34538 = function() { return logError(function (arg0) {
        getObject(arg0).destroy();
    }, arguments) };
    imports.wbg.__wbg_dispatchWorkgroups_c484cd3530a3801d = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).dispatchWorkgroups(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_dispatchWorkgroupsIndirect_2b89ee1731fab5f8 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).dispatchWorkgroupsIndirect(getObject(arg1), arg2);
    }, arguments) };
    imports.wbg.__wbg_end_dab719019df5969c = function() { return logError(function (arg0) {
        getObject(arg0).end();
    }, arguments) };
    imports.wbg.__wbg_setPipeline_598117fdeb73cf8f = function() { return logError(function (arg0, arg1) {
        getObject(arg0).setPipeline(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_c619f49c16ef095b = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_dffce83253968cdd = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2), getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_getBindGroupLayout_20dc45d52b96fa42 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).getBindGroupLayout(arg1 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_error_f85e77a2651e41dc = function() { return logError(function (arg0) {
        const ret = getObject(arg0).error;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_gpu_24536c9523d924b1 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).gpu;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setwidth_15266a5e81f43cf0 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).width = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_setheight_2e9bab573f1775a6 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).height = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_instanceof_GpuAdapter_c0a5a310603ba618 = function() { return logError(function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof GPUAdapter;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_features_88901f43932fb28e = function() { return logError(function (arg0) {
        const ret = getObject(arg0).features;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_limits_a7f3fbf58768b61f = function() { return logError(function (arg0) {
        const ret = getObject(arg0).limits;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_requestDevice_068e794820eb88eb = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).requestDevice(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setwidth_a667a942dba6656e = function() { return logError(function (arg0, arg1) {
        getObject(arg0).width = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_setheight_a747d440760fe5aa = function() { return logError(function (arg0, arg1) {
        getObject(arg0).height = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_getContext_7c5944ea807bf5d3 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_message_c934153af8567cdb = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg1).message;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_end_bdfb66792e0c59a2 = function() { return logError(function (arg0) {
        getObject(arg0).end();
    }, arguments) };
    imports.wbg.__wbg_executeBundles_0a1fdfd83c1a3e57 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).executeBundles(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_setBlendConstant_e89574db5137b2f6 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).setBlendConstant(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_setScissorRect_0af8c89e90a6e89c = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).setScissorRect(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_setStencilReference_71be0db67db2f7ab = function() { return logError(function (arg0, arg1) {
        getObject(arg0).setStencilReference(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_setViewport_9c5fb686baf1cf4f = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).setViewport(arg1, arg2, arg3, arg4, arg5, arg6);
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_ed098a3302f084a7 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2));
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_ce4432036922cd83 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).setBindGroup(arg1 >>> 0, getObject(arg2), getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_draw_6357a5fbc8a6b097 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).draw(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_drawIndexed_5d1dd89d7375148c = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).drawIndexed(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_drawIndexedIndirect_526599171cfbbee5 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).drawIndexedIndirect(getObject(arg1), arg2);
    }, arguments) };
    imports.wbg.__wbg_drawIndirect_8dd595dc622e21ac = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).drawIndirect(getObject(arg1), arg2);
    }, arguments) };
    imports.wbg.__wbg_setIndexBuffer_1f4a86d1cc8c16d9 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).setIndexBuffer(getObject(arg1), takeObject(arg2), arg3);
    }, arguments) };
    imports.wbg.__wbg_setIndexBuffer_9f8493460611f96b = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).setIndexBuffer(getObject(arg1), takeObject(arg2), arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_setPipeline_18ce556bdea62cc5 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).setPipeline(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_setVertexBuffer_2a2c84d65c1063f9 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).setVertexBuffer(arg1 >>> 0, getObject(arg2), arg3);
    }, arguments) };
    imports.wbg.__wbg_setVertexBuffer_176c2dff823c42c1 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).setVertexBuffer(arg1 >>> 0, getObject(arg2), arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_getBindGroupLayout_dfc1b97f78c04beb = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).getBindGroupLayout(arg1 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_c77649dd3862b63a = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_08236689f0afb357 = function() { return logError(function () {
        const ret = new Array();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_push_fd3233d09cf81821 = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).push(getObject(arg1));
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_newnoargs_ccdcae30fd002262 = function() { return logError(function (arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_669127b9d730c650 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_53fc3abd42e24ec8 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_instanceof_Object_3c95bd459efa5c3c = function() { return logError(function (arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Object;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_c728d68b8b34487e = function() { return logError(function () {
        const ret = new Object();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_valueOf_10fedcc86f3d8ddc = function() { return logError(function (arg0) {
        const ret = getObject(arg0).valueOf();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_feb65b865d980ae2 = function() { return logError(function (arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_354(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    }, arguments) };
    imports.wbg.__wbg_resolve_a3252b2860f0a09e = function() { return logError(function (arg0) {
        const ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_then_89e1c559530b85cf = function() { return logError(function (arg0, arg1) {
        const ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_then_1bbc9edafd859b06 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_globalThis_17eff828815f7d84 = function() { return handleError(function () {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_self_3fad056edded10bd = function() { return handleError(function () {
        const ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_a4f46c98a61d4089 = function() { return handleError(function () {
        const ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_46f939f6541643c5 = function() { return handleError(function () {
        const ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_d8a000788389a31e = function() { return logError(function (arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newwithlength_13b5319ab422dcf6 = function() { return logError(function (arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newwithbyteoffsetandlength_2dc04d99088b15e3 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_buffer_b334b57bee6f611b = function() { return logError(function (arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_subarray_6ca5cfa7fbb9abbe = function() { return logError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_length_a5587d6cd79ab197 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).length;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_set_dcfd613a3420f908 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_buffer_344d9b41efe96da7 = function() { return logError(function (arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_set_40f7786a25a9cc7e = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper7562 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 700, __wbg_adapter_28);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper8404 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 742, __wbg_adapter_31);
        return addHeapObject(ret);
    }, arguments) };

    return imports;
}

function __wbg_init_memory(imports, maybe_memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedInt32Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;


    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(input) {
    if (wasm !== undefined) return wasm;

    if (typeof input === 'undefined' && script_src !== 'undefined') {
        input = script_src.replace(/\.js$/, '_bg.wasm');
    }
    const imports = __wbg_get_imports();

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await input, imports);

    return __wbg_finalize_init(instance, module);
}

wasm_bindgen = Object.assign(__wbg_init, { initSync }, __exports);

})();
