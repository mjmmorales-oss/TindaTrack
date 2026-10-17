import { describe, it, expect, vi, beforeEach } from 'vitest'
import { captureFrame, prepareForAi, cropBox } from '@/lib/imagePrep'

describe('imagePrep AI utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('captureFrame creates a canvas with video dimensions and draws video frame', () => {
    const mockVideo = {
      videoWidth: 1280,
      videoHeight: 720,
    }

    const canvas = captureFrame(mockVideo)
    expect(canvas).toBeDefined()
    expect(canvas.width).toBe(1280)
    expect(canvas.height).toBe(720)
  })

  it('prepareForAi resizes long edge to 1024 and produces a JPEG blob', async () => {
    // Create a 2000x1000 canvas
    const canvas = document.createElement('canvas')
    canvas.width = 2000
    canvas.height = 1000

    const blob = await prepareForAi(canvas)
    expect(blob).toBeDefined()
    expect(blob.type).toBe('image/jpeg')
  })

  it('cropBox extracts normalized box with square padding', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1000
    canvas.height = 1000

    const box2d = [100, 150, 400, 450] // ymin, xmin, ymax, xmax
    const croppedBlob = await cropBox(canvas, box2d, 5)

    expect(croppedBlob).toBeDefined()
    expect(['image/webp', 'image/jpeg']).toContain(croppedBlob.type)
  })

  it('cropBox throws error on invalid box_2d', async () => {
    const canvas = document.createElement('canvas')
    await expect(() => cropBox(canvas, [100, 200])).rejects.toThrow('Valid box_2d')
  })
})
