import {
  VISUAL_MODEL_ID,
  VISUAL_SIMILARITY_THRESHOLD,
  VISUAL_MARGIN_THRESHOLD,
} from '@/config/visual.js'
import { aiService } from '@/services/aiService.js'

let workerInstance = null
let workerReady = false
let workerInitPromise = null
let cachedIndex = null
let requestIdCounter = 0
const pendingRequests = new Map()

// Observable model status for "Loading Visual Match model… X%"
let modelStatus = { status: 'idle', progress: 0, device: null, error: null }
const statusListeners = new Set()
const fileProgress = new Map()
let hasFallenBackToWasm = false
let forcedDevice = null

function setModelStatus(patch) {
  modelStatus = { ...modelStatus, ...patch }
  statusListeners.forEach((cb) => cb(modelStatus))
}

/** @returns {{ status: 'idle'|'loading'|'ready'|'error', progress: number, device: string|null, error: string|null }} */
export function getVisualModelStatus() {
  return modelStatus
}

/**
 * Subscribes to model load status changes. Returns an unsubscribe function.
 *
 * @param {(status: object) => void} cb
 */
export function subscribeVisualModelStatus(cb) {
  statusListeners.add(cb)
  return () => statusListeners.delete(cb)
}

/**
 * Aggregates Transformers.js progress_callback events (one per model file) into 0–100.
 *
 * @param {object} info - { status, file, loaded, total, progress }
 * @returns {number|null}
 */
export function aggregateModelProgress(info) {
  if (!info?.file) return null
  if (info.status === 'progress' && info.total) {
    fileProgress.set(info.file, { loaded: info.loaded || 0, total: info.total })
  } else if (info.status === 'done') {
    const prev = fileProgress.get(info.file)
    if (prev) fileProgress.set(info.file, { loaded: prev.total, total: prev.total })
  }
  let loaded = 0
  let total = 0
  for (const f of fileProgress.values()) {
    loaded += f.loaded
    total += f.total
  }
  return total ? Math.min(100, Math.round((loaded / total) * 100)) : null
}

/**
 * True for iPhone/iPad/iPod (all iOS browsers are WebKit), including iPadOS
 * that reports itself as a Mac.
 *
 * @param {string} userAgent
 * @param {number} [maxTouchPoints=0]
 */
export function isIOSWebKit(userAgent = '', maxTouchPoints = 0) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

/**
 * Picks the inference backend. WebGPU only when an adapter really exists and the
 * browser is not iOS Safari/WebKit (WebGPU there is missing or unreliable);
 * otherwise wasm (with q8 weights).
 *
 * @param {{ userAgent?: string, maxTouchPoints?: number, gpu?: { requestAdapter?: () => Promise<unknown> } }} [env]
 * @returns {Promise<'webgpu'|'wasm'>}
 */
export async function pickVisualDevice(env = {}) {
  const nav = typeof navigator !== 'undefined' ? navigator : {}
  const userAgent = env.userAgent ?? nav.userAgent ?? ''
  const maxTouchPoints = env.maxTouchPoints ?? nav.maxTouchPoints ?? 0
  const gpu = 'gpu' in env ? env.gpu : nav.gpu

  if (isIOSWebKit(userAgent, maxTouchPoints)) return 'wasm'
  if (!gpu || typeof gpu.requestAdapter !== 'function') return 'wasm'
  try {
    const adapter = await gpu.requestAdapter()
    return adapter ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

/** Weight precision per backend: q8 keeps the wasm download small and fast. */
export function dtypeForDevice(device) {
  return device === 'webgpu' ? 'fp32' : 'q8'
}

/**
 * Creates or retrieves the singleton Web Worker for Transformers.js feature extraction.
 */
export function getVisualWorker() {
  if (typeof window === 'undefined') {
    return null
  }

  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../workers/embedder.worker.js', import.meta.url),
      { type: 'module' },
    )

    workerInstance.onmessage = (e) => {
      const { type, id, payload } = e.data || {}

      if (id && pendingRequests.has(id)) {
        const { resolve, reject } = pendingRequests.get(id)
        pendingRequests.delete(id)

        if (type === 'ERROR') {
          reject(new Error(payload?.message || 'Worker execution error'))
        } else {
          resolve(payload)
        }
        return
      }

      if (type === 'PROGRESS') {
        const onProgress = pendingRequests.get('__init__')?.onProgress
        onProgress?.(payload)
        const pct = aggregateModelProgress(payload)
        if (pct !== null) setModelStatus({ status: 'loading', progress: pct })
      } else if (type === 'READY') {
        workerReady = true
        setModelStatus({ status: 'ready', progress: 100, device: payload?.device || modelStatus.device, error: null })
        const initReq = pendingRequests.get('__init__')
        if (initReq) {
          pendingRequests.delete('__init__')
          initReq.resolve(payload)
        }
      } else if (type === 'ERROR' && pendingRequests.has('__init__')) {
        const initReq = pendingRequests.get('__init__')
        pendingRequests.delete('__init__')
        initReq.reject(new Error(payload?.message || 'Failed to initialize model'))
        setModelStatus({ status: 'error', error: payload?.message || 'Failed to initialize model' })
      }
    }

    workerInstance.onerror = (err) => {
      workerReady = false
      for (const [, req] of pendingRequests) {
        req.reject(new Error(err?.message || 'Worker fatal error'))
      }
      pendingRequests.clear()
    }
  }

  return workerInstance
}

/**
 * Initializes the on-device visual model inside the worker.
 *
 * @param {(progress: object) => void} [onProgress]
 * @returns {Promise<object>}
 */
export async function initVisualModel(onProgress) {
  if (workerReady) {
    return { modelId: VISUAL_MODEL_ID, status: 'ready' }
  }

  if (workerInitPromise) {
    return workerInitPromise
  }

  let worker
  try {
    worker = getVisualWorker()
  } catch (err) {
    setModelStatus({ status: 'error', error: err?.message || 'Web Workers are not supported.' })
    throw err
  }
  if (!worker) {
    throw new Error('Web Workers are not supported in this environment.')
  }

  workerInitPromise = (async () => {
    const device = forcedDevice || (await pickVisualDevice())
    setModelStatus({ status: 'loading', device, error: null })
    return new Promise((resolve, reject) => {
      pendingRequests.set('__init__', { resolve, reject, onProgress })
      worker.postMessage({
        type: 'INIT',
        payload: { modelId: VISUAL_MODEL_ID, device, dtype: dtypeForDevice(device) },
      })
    })
  })()
    .catch((err) => {
      setModelStatus({ status: 'error', error: err?.message || 'Failed to initialize model' })
      throw err
    })
    .finally(() => {
      workerInitPromise = null
    })

  return workerInitPromise
}

/**
 * Starts loading the model in the background (idle time) so the Visual Match
 * tab opens instantly. Errors are surfaced through the status store only.
 */
export function preloadVisualModel() {
  if (workerReady || workerInitPromise || typeof window === 'undefined' || typeof Worker === 'undefined') return
  const start = () => initVisualModel().catch(() => {})
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 5000 })
  } else {
    setTimeout(start, 1500)
  }
}

/**
 * Rasterizes an image source (HTMLImageElement, Canvas, URL, SVG, Blob) to an ImageData object.
 *
 * @param {HTMLCanvasElement|HTMLImageElement|Blob|string} source
 * @param {number} [targetSize=224]
 * @returns {Promise<ImageData>}
 */
export async function rasterizeToImageData(source, targetSize = 224) {
  if (typeof document === 'undefined') {
    // Vitest / Node fallback
    const dummy = new Uint8ClampedArray(targetSize * targetSize * 4)
    return { data: dummy, width: targetSize, height: targetSize }
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetSize
  canvas.height = targetSize
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  // Same framing for live frames and reference photos: center square, never stretched.
  const drawCenterSquare = (drawable, w, h) => {
    const side = Math.min(w, h) || targetSize
    ctx.drawImage(drawable, (w - side) / 2, (h - side) / 2, side, side, 0, 0, targetSize, targetSize)
  }

  if (source instanceof HTMLCanvasElement) {
    drawCenterSquare(source, source.width, source.height)
    return ctx.getImageData(0, 0, targetSize, targetSize)
  }

  if (source instanceof ImageData) {
    if (source.width === targetSize && source.height === targetSize) {
      return source
    }
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = source.width
    tempCanvas.height = source.height
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(source, 0, 0)
    drawCenterSquare(tempCanvas, source.width, source.height)
    return ctx.getImageData(0, 0, targetSize, targetSize)
  }

  let srcUrl = ''
  let revokeUrl = false

  if (typeof source === 'string') {
    srcUrl = source
  } else if (source instanceof Blob) {
    srcUrl = URL.createObjectURL(source)
    revokeUrl = true
  }

  if (srcUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          drawCenterSquare(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
          const data = ctx.getImageData(0, 0, targetSize, targetSize)
          if (revokeUrl) URL.revokeObjectURL(srcUrl)
          resolve(data)
        } catch (err) {
          if (revokeUrl) URL.revokeObjectURL(srcUrl)
          reject(err)
        }
      }
      img.onerror = (err) => {
        if (revokeUrl) URL.revokeObjectURL(srcUrl)
        reject(new Error(`Failed to load image for visual embedding: ${err?.message || 'Network/CORS error'}`))
      }
      img.src = srcUrl
    })
  }

  if (source instanceof HTMLImageElement) {
    drawCenterSquare(source, source.naturalWidth || source.width, source.naturalHeight || source.height)
    return ctx.getImageData(0, 0, targetSize, targetSize)
  }

  throw new Error('Unsupported image source for visual embedding.')
}

/**
 * Computes L2 normalized embedding for an image source.
 *
 * @param {HTMLCanvasElement|HTMLImageElement|Blob|string|ImageData} source
 * @returns {Promise<number[]>}
 */
export async function embedImage(source) {
  try {
    return await embedOnce(source)
  } catch (err) {
    // WebGPU can initialise fine and still fail on the first run: retry once on wasm.
    if (modelStatus.device === 'webgpu' && !hasFallenBackToWasm) {
      hasFallenBackToWasm = true
      forcedDevice = 'wasm'
      terminateVisualWorker()
      return embedOnce(source)
    }
    throw err
  }
}

async function embedOnce(source) {
  const worker = getVisualWorker()
  if (!worker) {
    throw new Error('Visual search worker unavailable.')
  }

  await initVisualModel()

  const imageData = await rasterizeToImageData(source, 224)
  const id = `embed_${++requestIdCounter}`

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: (payload) => resolve(payload.vector),
      reject,
    })

    const rawBuffer = imageData.data.buffer
    worker.postMessage(
      {
        type: 'EMBED_IMAGE',
        id,
        payload: {
          rawData: rawBuffer,
          width: imageData.width,
          height: imageData.height,
          channels: 4,
        },
      },
      [rawBuffer],
    )
  })
}

/**
 * Computes cosine similarity between two L2-normalized vectors.
 *
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0
  let dot = 0
  const len = Math.min(vecA.length, vecB.length)
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i]
  }
  return dot
}

/**
 * Calculates top matches from an embedding index given a query vector.
 *
 * @param {number[]} queryVector
 * @param {Array<{ product_id: number, vector: number[], id?: number, source?: string }>} index
 * @param {object} [options]
 * @param {number} [options.topK=3]
 * @param {number} [options.threshold=VISUAL_SIMILARITY_THRESHOLD]
 * @param {number} [options.margin=VISUAL_MARGIN_THRESHOLD]
 * @returns {{ matches: Array<{ product_id: number, score: number, embedding_id?: number, source?: string }>, status: 'ok'|'low_confidence'|'low_margin'|'empty' }}
 */
export function findTopMatches(
  queryVector,
  index = [],
  {
    topK = 3,
    threshold = VISUAL_SIMILARITY_THRESHOLD,
    margin = VISUAL_MARGIN_THRESHOLD,
  } = {},
) {
  if (!queryVector || !queryVector.length || !index || !index.length) {
    return { matches: [], status: 'empty' }
  }

  const productScores = new Map()

  for (const item of index) {
    if (!item.vector || !item.product_id) continue
    const score = cosineSimilarity(queryVector, item.vector)

    const existing = productScores.get(item.product_id)
    if (existing === undefined || score > existing.score) {
      productScores.set(item.product_id, {
        product_id: item.product_id,
        score,
        embedding_id: item.id,
        source: item.source,
      })
    }
  }

  const sorted = Array.from(productScores.values()).sort(
    (a, b) => b.score - a.score,
  )

  const topMatches = sorted.slice(0, topK)

  if (topMatches.length === 0) {
    return { matches: [], status: 'empty' }
  }

  if (topMatches[0].score < threshold) {
    return { matches: topMatches, status: 'low_confidence' }
  }

  if (
    topMatches.length > 1 &&
    topMatches[0].score - topMatches[1].score < margin
  ) {
    return { matches: topMatches, status: 'low_margin' }
  }

  return { matches: topMatches, status: 'ok' }
}

/**
 * Retrieves the cached visual search index or fetches it from the backend.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Array<object>>}
 */
export async function getVisualIndex(forceRefresh = false) {
  if (cachedIndex && !forceRefresh) {
    return cachedIndex
  }

  try {
    const res = await aiService.getEmbeddings({ model: VISUAL_MODEL_ID })
    const data = Array.isArray(res) ? res : res?.data || []
    cachedIndex = data
    return cachedIndex
  } catch (err) {
    console.error('Failed to load visual search embeddings index:', err)
    return cachedIndex || []
  }
}

/**
 * Number of distinct products that have at least one taught reference vector.
 *
 * @param {Array<{ product_id: number|string }>} index
 */
export function countIndexedProducts(index = []) {
  return new Set((index || []).filter((e) => e?.product_id && e?.vector).map((e) => String(e.product_id))).size
}

const indexListeners = new Set()

/**
 * Subscribes to index invalidations (e.g. after teaching a photo). Returns an unsubscribe function.
 *
 * @param {() => void} cb
 */
export function subscribeVisualIndex(cb) {
  indexListeners.add(cb)
  return () => indexListeners.delete(cb)
}

/**
 * Invalidates the in-memory visual search index.
 */
export function invalidateVisualIndex() {
  cachedIndex = null
  indexListeners.forEach((cb) => cb())
}

/**
 * 16×12 luma thumbnail of the frame, for cheap "did the scene change?" checks.
 *
 * @param {CanvasRenderingContext2D} ctx - context of the 224×224 frame canvas
 * @returns {Uint8Array|null}
 */
export function frameSignature(ctx) {
  try {
    const small = document.createElement('canvas')
    small.width = 16
    small.height = 12
    const sctx = small.getContext('2d', { willReadFrequently: true })
    if (!sctx || !ctx?.canvas) return null
    sctx.drawImage(ctx.canvas, 0, 0, 16, 12)
    const { data } = sctx.getImageData(0, 0, 16, 12)
    const out = new Uint8Array(16 * 12)
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      out[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
    }
    return out
  } catch {
    return null
  }
}

/**
 * Mean absolute luma difference between two signatures is above `threshold`
 * (0–255). Missing signatures always count as changed.
 *
 * @param {Uint8Array|null} prev
 * @param {Uint8Array|null} next
 * @param {number} [threshold=6]
 */
export function hasSceneChanged(prev, next, threshold = 6) {
  if (!prev || !next || prev.length !== next.length) return true
  let sum = 0
  for (let i = 0; i < next.length; i++) sum += Math.abs(next[i] - prev[i])
  return sum / next.length > threshold
}

/**
 * Terminates the active worker instance.
 */
export function terminateVisualWorker() {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
    workerReady = false
    workerInitPromise = null
    pendingRequests.clear()
    fileProgress.clear()
    setModelStatus({ status: 'idle', progress: 0 })
  }
}
