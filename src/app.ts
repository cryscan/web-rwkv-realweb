interface LoadOk {
  ok: undefined
}

export async function load() {
  const modelElem = document.getElementById('model')!
  const downloadElem = document.getElementById('download')!
  const progressElem = document.getElementById(
    'progress'
  ) as HTMLProgressElement
  const statusElem = document.getElementById('status')!
  const chatElem = document.getElementById('chat')!
  const replyElem = document.getElementById('reply')!
  var url = (document.getElementById('url') as HTMLInputElement).value

  var cache = await caches.open('rwkv')

  let response = await cache.match(url).then(async (value) => {
    if (value !== undefined) {
      console.log('loaded cached model')
      return value
    }
    console.log('loading uncached model...')
    let response = await fetch(url)
    cache.put(url, response.clone())
    return response
  })
  // let response = await fetch(url);

  if (
    (response.status >= 200 && response.status < 300) ||
    response.status === 0 /* Loaded from local file */
  ) {
    replyElem.innerText = ''
    modelElem.style.display = 'none'
    downloadElem.style.display = ''
  } else if (response.status === 404 && url.startsWith('http://localhost')) {
    replyElem.innerText = 'Model not found locally.'
    return
  } else {
    replyElem.innerText = 'Incorrect URL.'
    return
  }

  const reader = response.body!.getReader()
  const contentLength = +response.headers!.get('Content-Length')!

  let receivedLength = 0
  let chunks = [] as Uint8Array<ArrayBufferLike>[]
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
    receivedLength += value.length
    // console.log(`Received ${receivedLength} of ${contentLength}`)

    progressElem.value = receivedLength / contentLength
    statusElem.innerHTML = `<p>${url}</p><p>${receivedLength * 1.0e-6} / ${
      contentLength * 1.0e-6
    } MB</p>`
  }

  downloadElem.style.display = 'none'
  chatElem.style.display = ''

  var worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  })
  worker.onmessage = (e: MessageEvent<string | null>) => {
    e.data ? (replyElem.innerText += e.data) : (replyElem.innerText = '')
  }

  worker.postMessage(
    chunks,
    chunks.map((x) => x.buffer)
  )

  chatElem.addEventListener('submit', (e) => {
    e.preventDefault()
    const inputElem = document.getElementById('input') as HTMLInputElement
    var input = new String(inputElem.value)
    worker.postMessage(input)
    console.log('submit: ' + input)
  })
}

const urls = new Map([
  [
    'v6 1b6',
    'https://huggingface.co/cgisky/ai00_rwkv_x060/resolve/main/rwkv-x606-1b6-world-v2.st',
  ],
  [
    'v5 1b5',
    'https://huggingface.co/cgisky/AI00_RWKV_V5/resolve/main/RWKV-5-World-1B5-v2-20231025-ctx4096.st',
  ],
  [
    'v5',
    'https://huggingface.co/cgisky/AI00_RWKV_V5/resolve/main/RWKV-5-World-0.4B-v2-20231113-ctx4096.st',
  ],
  [
    'v4',
    'https://huggingface.co/cgisky/RWKV-safetensors-fp16/resolve/main/RWKV-4-World-0.4B-v1-20230529-ctx4096.st',
  ],
  [
    'v7 local',
    'http://localhost:5500/assets/models/RWKV-x070-World-0.1B-v2.8-20241210-ctx4096.st',
  ],
  [
    'v6 local',
    'http://localhost:5500/assets/models/RWKV-x060-World-1B6-v2-20240208-ctx4096.st',
  ],
  [
    'v5 local',
    'http://localhost:5500/assets/models/RWKV-5-World-0.4B-v2-20231113-ctx4096.st',
  ],
])

export function loadUrl(key: string) {
  ;(document.getElementById('url') as HTMLInputElement).value = urls.get(key)!
}

window['load'] = load
window['loadUrl'] = loadUrl
