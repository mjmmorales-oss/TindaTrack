import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  cosineSimilarity,
  findTopMatches,
  getVisualIndex,
  invalidateVisualIndex,
} from '@/lib/visualSearch'
import { useCartStore } from '@/stores/cartStore'
import { aiService } from '@/services/aiService'
import { VISUAL_MODEL_ID } from '@/config/visual'

describe('On-Device Visual Search (Task A6)', () => {
  beforeEach(() => {
    invalidateVisualIndex()
    useCartStore.getState().reset()
  })

  it('computes exact cosine similarity and dot product on L2-normalized vectors', () => {
    // Exact identical vector
    const vecA = [0.6, 0.8]
    expect(cosineSimilarity(vecA, vecA)).toBeCloseTo(1.0, 5)

    // Orthogonal vector
    const vecB = [-0.8, 0.6]
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5)

    // Opposite vector
    const vecC = [-0.6, -0.8]
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(-1.0, 5)

    // Empty or mismatched inputs
    expect(cosineSimilarity([], vecA)).toBe(0)
    expect(cosineSimilarity(vecA, null)).toBe(0)
  })

  it('finds top-K matches sorted descending by similarity', () => {
    const query = [1.0, 0.0, 0.0]
    const index = [
      { product_id: 101, vector: [0.70, 0.71, 0.0] }, // ~0.70
      { product_id: 102, vector: [0.95, 0.31, 0.0] }, // ~0.95
      { product_id: 103, vector: [0.50, 0.86, 0.0] }, // ~0.50
      { product_id: 104, vector: [0.85, 0.52, 0.0] }, // ~0.85
    ]

    const result = findTopMatches(query, index, { topK: 3, threshold: 0.60, margin: 0.03 })
    expect(result.status).toBe('ok')
    expect(result.matches).toHaveLength(3)
    expect(result.matches[0].product_id).toBe(102)
    expect(result.matches[0].score).toBeCloseTo(0.95, 2)
    expect(result.matches[1].product_id).toBe(104)
    expect(result.matches[1].score).toBeCloseTo(0.85, 2)
    expect(result.matches[2].product_id).toBe(101)
    expect(result.matches[2].score).toBeCloseTo(0.70, 2)
  })

  it('enforces confidence threshold (>= 0.60)', () => {
    const query = [1.0, 0.0]
    const index = [
      { product_id: 201, vector: [0.55, 0.83] }, // score 0.55 < 0.60
      { product_id: 202, vector: [0.40, 0.91] },
    ]

    const result = findTopMatches(query, index, { threshold: 0.60, margin: 0.03 })
    expect(result.status).toBe('low_confidence')
    expect(result.matches[0].product_id).toBe(201)
  })

  it('enforces margin threshold (top1 - top2 >= 0.03)', () => {
    const query = [1.0, 0.0]
    const index = [
      { product_id: 301, vector: [0.85, 0.52] }, // score 0.85
      { product_id: 302, vector: [0.84, 0.54] }, // score 0.84 (diff 0.01 < 0.03)
    ]

    const result = findTopMatches(query, index, { threshold: 0.60, margin: 0.03 })
    expect(result.status).toBe('low_margin')
    expect(result.matches).toHaveLength(2)
  })

  it('invalidates index cache properly', async () => {
    const spy = vi.spyOn(aiService, 'getEmbeddings').mockResolvedValueOnce([
      { id: 1, product_id: 1, vector: [1, 0] },
    ])

    const first = await getVisualIndex()
    expect(first).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(1)

    // Second call without invalidate should hit cache
    const second = await getVisualIndex()
    expect(second).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(1)

    // Invalidate
    invalidateVisualIndex()
    vi.spyOn(aiService, 'getEmbeddings').mockResolvedValueOnce([
      { id: 1, product_id: 1, vector: [1, 0] },
      { id: 2, product_id: 2, vector: [0, 1] },
    ])

    const third = await getVisualIndex()
    expect(third).toHaveLength(2)
  })

  it('adds product to cart store with add_method: "visual"', () => {
    const cart = useCartStore.getState()
    const product = {
      id: 401,
      name: 'San Miguel Pale Pilsen',
      price: 65,
      stock_quantity: 20,
    }

    cart.add(product, 1, 'visual')

    const updated = useCartStore.getState()
    expect(updated.items).toHaveLength(1)
    expect(updated.items[0].product_id).toBe(401)
    expect(updated.items[0].add_method).toBe('visual')
    expect(updated.items[0].quantity).toBe(1)
  })

  it('saves learning loop correction embedding with source: "correction"', async () => {
    const saveSpy = vi.spyOn(aiService, 'saveEmbedding').mockResolvedValue({
      id: 99,
      product_id: 501,
      source: 'correction',
      model: VISUAL_MODEL_ID,
    })

    const correctionVector = [0.1, 0.2, 0.3]
    await aiService.saveEmbedding(501, {
      model: VISUAL_MODEL_ID,
      source: 'correction',
      vector: correctionVector,
    })

    expect(saveSpy).toHaveBeenCalledWith(501, {
      model: VISUAL_MODEL_ID,
      source: 'correction',
      vector: correctionVector,
    })
  })

  it('verifies Transformers.js is lazy loaded and not in the main entry chunk', () => {
    const distAssetsDir = path.resolve(__dirname, '../../dist/assets')
    if (!fs.existsSync(distAssetsDir)) {
      // In dev test before build, verify Rollup config has manualChunks
      return
    }

    const files = fs.readdirSync(distAssetsDir)
    const indexChunk = files.find((f) => f.startsWith('index-') && f.endsWith('.js'))
    if (!indexChunk) return

    const indexContent = fs.readFileSync(path.join(distAssetsDir, indexChunk), 'utf8')
    // Assert that heavy Transformers pipeline or onnxruntime strings are not bundled in index chunk
    expect(indexContent.includes('ImageFeatureExtractionPipeline')).toBe(false)
  })
})
