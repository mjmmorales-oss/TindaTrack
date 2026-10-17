/**
 * Web Worker for running on-device image feature extraction via @huggingface/transformers.
 * Offloads model downloading, WebGPU/WASM tensor inference, and vector normalization
 * from the main UI thread.
 */

let extractor = null
let currentModelId = null
let currentDevice = null
let currentDtype = 'q8'

function l2Normalize(vector) {
  let sumSq = 0
  for (let i = 0; i < vector.length; i++) {
    sumSq += vector[i] * vector[i]
  }
  const norm = Math.sqrt(sumSq) || 1e-12
  const normalized = new Float32Array(vector.length)
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / norm
  }
  return Array.from(normalized)
}

function extractVectorFromTensor(tensor) {
  const { dims, data } = tensor
  if (!dims || dims.length <= 1) {
    return l2Normalize(data)
  }

  if (dims.length === 2) {
    // [batch, hidden_size]
    return l2Normalize(data)
  }

  if (dims.length === 3) {
    // [batch, tokens, hidden] -> mean pool over tokens
    const [, tokens, hidden] = dims
    const pooled = new Float32Array(hidden)
    for (let t = 0; t < tokens; t++) {
      const offset = t * hidden
      for (let h = 0; h < hidden; h++) {
        pooled[h] += data[offset + h]
      }
    }
    for (let h = 0; h < hidden; h++) {
      pooled[h] /= tokens
    }
    return l2Normalize(pooled)
  }

  return l2Normalize(data)
}

self.onmessage = async (e) => {
  const { type, id, payload } = e.data || {}

  switch (type) {
    case 'INIT': {
      try {
        const {
          modelId = 'onnx-community/dinov2-small',
          device: requestedDevice,
          dtype = 'q8',
        } = payload || {}

        if (extractor && currentModelId === modelId) {
          self.postMessage({
            type: 'READY',
            id,
            payload: { modelId, device: currentDevice, dtype: currentDtype },
          })
          return
        }

        const { pipeline, env } = await import('@huggingface/transformers')

        // Optimize browser caching and disable remote python lookups
        env.allowLocalModels = false
        env.useBrowserCache = true

        const hasGpu = typeof navigator !== 'undefined' && Boolean(navigator.gpu)
        const device = requestedDevice || (hasGpu ? 'webgpu' : 'wasm')

        currentModelId = modelId
        currentDevice = device
        currentDtype = dtype

        extractor = await pipeline('image-feature-extraction', modelId, {
          device,
          dtype,
          progress_callback: (info) => {
            self.postMessage({ type: 'PROGRESS', payload: info })
          },
        })

        self.postMessage({
          type: 'READY',
          id,
          payload: { modelId, device, dtype },
        })
      } catch (err) {
        self.postMessage({
          type: 'ERROR',
          id,
          payload: { message: err?.message || String(err) },
        })
      }
      break
    }

    case 'EMBED_IMAGE': {
      try {
        if (!extractor) {
          throw new Error('Embedder worker not initialized. Call INIT first.')
        }

        const { RawImage } = await import('@huggingface/transformers')
        const { rawData, width, height, channels = 4, url } = payload || {}

        let imageInput
        if (rawData && width && height) {
          imageInput = new RawImage(new Uint8Array(rawData), width, height, channels)
        } else if (url) {
          imageInput = await RawImage.read(url)
        } else {
          throw new Error('No valid image data or URL provided for embedding.')
        }

        const tensor = await extractor(imageInput)
        const vector = extractVectorFromTensor(tensor)

        self.postMessage({
          type: 'EMBED_SUCCESS',
          id,
          payload: { vector },
        })
      } catch (err) {
        self.postMessage({
          type: 'ERROR',
          id,
          payload: { message: err?.message || String(err) },
        })
      }
      break
    }

    case 'COMPUTE_SIMILARITY': {
      try {
        const {
          queryVector,
          index = [],
          topK = 3,
          threshold = 0.60,
          margin = 0.03,
        } = payload || {}

        if (!queryVector || !queryVector.length) {
          self.postMessage({
            type: 'SIMILARITY_SUCCESS',
            id,
            payload: { matches: [], status: 'empty' },
          })
          return
        }

        // Map product_id -> max cosine similarity
        const productScores = new Map()

        for (const item of index) {
          if (!item.vector || !item.product_id) continue
          const v = item.vector
          let dot = 0
          const len = Math.min(queryVector.length, v.length)
          for (let i = 0; i < len; i++) {
            dot += queryVector[i] * v[i]
          }

          const existing = productScores.get(item.product_id)
          if (existing === undefined || dot > existing.score) {
            productScores.set(item.product_id, {
              product_id: item.product_id,
              score: dot,
              embedding_id: item.id,
              source: item.source,
            })
          }
        }

        const sorted = Array.from(productScores.values()).sort(
          (a, b) => b.score - a.score,
        )

        const topMatches = sorted.slice(0, topK)
        let status = 'ok'

        if (topMatches.length === 0) {
          status = 'empty'
        } else if (topMatches[0].score < threshold) {
          status = 'low_confidence'
        } else if (
          topMatches.length > 1 &&
          topMatches[0].score - topMatches[1].score < margin
        ) {
          status = 'low_margin'
        }

        self.postMessage({
          type: 'SIMILARITY_SUCCESS',
          id,
          payload: { matches: topMatches, status },
        })
      } catch (err) {
        self.postMessage({
          type: 'ERROR',
          id,
          payload: { message: err?.message || String(err) },
        })
      }
      break
    }

    default:
      break
  }
}
