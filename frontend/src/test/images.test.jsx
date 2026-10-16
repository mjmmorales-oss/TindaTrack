import { describe, it, expect } from 'vitest'
import { resolveImageUrl } from '@/lib/images'
import { resizeImage } from '@/lib/imageResize'
import { productService } from '@/services/productService'

describe('Product Image Utilities & Services', () => {
  describe('resolveImageUrl', () => {
    it('returns null for empty or invalid input', () => {
      expect(resolveImageUrl(null)).toBeNull()
      expect(resolveImageUrl(undefined)).toBeNull()
      expect(resolveImageUrl('')).toBeNull()
      expect(resolveImageUrl('   ')).toBeNull()
    })

    it('returns external HTTP/HTTPS URLs as-is', () => {
      const url = 'https://images.openfoodfacts.org/images/products/480/001/front.jpg'
      expect(resolveImageUrl(url)).toBe(url)
      const httpUrl = 'http://example.com/item.png'
      expect(resolveImageUrl(httpUrl)).toBe(httpUrl)
    })

    it('returns data and blob URLs as-is', () => {
      const dataUrl = 'data:image/webp;base64,UklGRm...'
      expect(resolveImageUrl(dataUrl)).toBe(dataUrl)
      const blobUrl = 'blob:http://localhost:5173/abc-123'
      expect(resolveImageUrl(blobUrl)).toBe(blobUrl)
    })

    it('resolves relative /api paths correctly against API origin', () => {
      const relative = '/api/product-images/01JM7T4K8W2NZR5C3T99V0EF1G'
      const resolved = resolveImageUrl(relative)
      expect(resolved).toBeTruthy()
      expect(resolved).toContain('/api/product-images/01JM7T4K8W2NZR5C3T99V0EF1G')
    })

    it('resolves /demo-products/ paths against window.location.origin, not API origin', () => {
      const demoPath = '/demo-products/tt-drk-001.svg'
      const resolved = resolveImageUrl(demoPath)
      expect(resolved).toBe(`${window.location.origin}/demo-products/tt-drk-001.svg`)
      expect(resolved).not.toContain(':8000') // Not backend port
    })

    it('resolves any non-/api/ root-relative path against window.location.origin', () => {
      const staticAsset = '/logo.svg'
      const resolved = resolveImageUrl(staticAsset)
      expect(resolved).toBe(`${window.location.origin}/logo.svg`)
    })
  })

  describe('resizeImage', () => {
    it('handles files safely with fallback in headless test environment', async () => {
      const mockBlob = new Blob(['sample-image-content'], { type: 'image/jpeg' })
      const result = await resizeImage(mockBlob)

      expect(result).toBeDefined()
      expect(result.file).toBeInstanceOf(File)
      expect(result.sizeBytes).toBeGreaterThan(0)
      expect(result.mimeType).toBe('image/jpeg')
    })
  })

  describe('productService image methods (mock implementation)', () => {
    it('uploads an image and updates product image_url', async () => {
      const res = await productService.uploadImage(1, new Blob(['data'], { type: 'image/png' }))
      expect(res.data).toBeDefined()
      expect(res.data.image_url).toBeTruthy()
    })

    it('imports an image URL from Open Food Facts', async () => {
      const sampleUrl = 'https://images.openfoodfacts.org/products/sample.jpg'
      const res = await productService.importImage(1, sampleUrl)
      expect(res.data).toBeDefined()
      expect(res.data.image_url).toBe(sampleUrl)
    })

    it('deletes an image and resets image_url to null', async () => {
      const res = await productService.deleteImage(1)
      expect(res.data).toBeDefined()
      expect(res.data.image_url).toBeNull()
    })
  })
})
