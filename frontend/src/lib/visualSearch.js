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
      } else if (type === 'READY') {
        workerReady = true
        const initReq = pendingRequests.get('__init__')
        if (initReq) {
          pendingRequests.delete('__init__')
          initReq.resolve(payload)
        }
      } else if (type === 'ERROR' && pendingRequests.has('__init__')) {
        const initReq = pendingRequests.get('__init__')
        pendingRequests.delete('__init__')
        initReq.reject(new Error(payload?.message || 'Failed to initialize model'))
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

  const worker = getVisualWorker()
  if (!worker) {
    throw new Error('Web Workers are not supported in this environment.')
  }

  workerInitPromise = new Promise((resolve, reject) => {
    pendingRequests.set('__init__', { resolve, reject, onProgress })
    worker.postMessage({
      type: 'INIT',
      payload: { modelId: VISUAL_MODEL_ID },
    })
  }).finally(() => {
    workerInitPromise = null
  })

  return workerInitPromise
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

  if (source instanceof HTMLCanvasElement) {
    ctx.drawImage(source, 0, 0, targetSize, targetSize)
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
    ctx.drawImage(tempCanvas, 0, 0, targetSize, targetSize)
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
          ctx.drawImage(img, 0, 0, targetSize, targetSize)
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
    ctx.drawImage(source, 0, 0, targetSize, targetSize)
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
 * Invalidates the in-memory visual search index.
 */
export function invalidateVisualIndex() {
  cachedIndex = null
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
  }
}
