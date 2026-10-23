import { describe, it, expect } from 'vitest'
import { resolvePairingBaseUrl, buildPairingUrl, isLocalhostUrl } from '@/lib/pairingUrl'

/** v2.2 A4: the pairing QR must never send the phone to its own localhost. */
describe('A4: resolvePairingBaseUrl', () => {
  it('prefers VITE_PUBLIC_APP_URL and trims a trailing slash', () => {
    expect(
      resolvePairingBaseUrl({
        publicAppUrl: 'https://tindatrack.vercel.app/',
        lanOrigin: 'https://192.168.1.5:5173',
        origin: 'https://localhost:5173',
      }),
    ).toEqual({ baseUrl: 'https://tindatrack.vercel.app', source: 'public', isLocalhost: false })
  })

  it('uses the dev LAN origin when this page is on localhost', () => {
    for (const origin of ['https://localhost:5173', 'http://127.0.0.1:5173']) {
      expect(resolvePairingBaseUrl({ lanOrigin: 'https://192.168.1.5:5173', origin })).toEqual({
        baseUrl: 'https://192.168.1.5:5173',
        source: 'lan',
        isLocalhost: false,
      })
    }
  })

  it('keeps a non-localhost origin even when a LAN origin exists', () => {
    expect(
      resolvePairingBaseUrl({ lanOrigin: 'https://192.168.1.5:5173', origin: 'https://10.0.0.7:5173' }),
    ).toEqual({ baseUrl: 'https://10.0.0.7:5173', source: 'origin', isLocalhost: false })
  })

  it('flags localhost when nothing better is available (dialog shows the warning)', () => {
    expect(resolvePairingBaseUrl({ lanOrigin: '', origin: 'https://localhost:5173' })).toEqual({
      baseUrl: 'https://localhost:5173',
      source: 'origin',
      isLocalhost: true,
    })
    expect(resolvePairingBaseUrl({ publicAppUrl: 'http://localhost:4173' }).isLocalhost).toBe(true)
  })

  it('builds the /scan URL and detects localhost hosts precisely', () => {
    expect(buildPairingUrl('https://192.168.1.5:5173/', 'ABCD-EFGH')).toBe(
      'https://192.168.1.5:5173/scan?code=ABCD-EFGH',
    )
    expect(isLocalhostUrl('https://localhost')).toBe(true)
    expect(isLocalhostUrl('https://localhost.example.com')).toBe(false)
    expect(isLocalhostUrl('https://my-localhost-store.vercel.app')).toBe(false)
  })
})
