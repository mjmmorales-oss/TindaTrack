import i18n from '@/i18n'
import { notify } from '@/lib/notify'
import { isPhoneLike } from '@/lib/device'

/**
 * Reacts to a scanned TindaTrack pairing code (the laptop's "Use phone as
 * scanner" QR). On a phone it offers to pair this phone; on a desktop it
 * explains the code is meant for the phone. Never calls the barcode lookup.
 *
 * @param {string} code - Formatted pairing code (XXXX-XXXX)
 * @param {{ navigate?: (to: string) => void }} [options]
 */
export function handlePairingScan(code, { navigate } = {}) {
  const t = i18n.t.bind(i18n)
  const target = `/scan?code=${encodeURIComponent(code)}`

  if (isPhoneLike()) {
    notify.info(t('pos:pairingQrTitle'), {
      description: t('pos:pairingQrPhoneDesc'),
      action: {
        label: t('pos:pairThisPhone'),
        onClick: () => (navigate ? navigate(target) : window.location.assign(target)),
      },
    })
    return
  }

  notify.info(t('pos:pairingQrTitle'), t('pos:pairingQrDesktopDesc'))
}

/**
 * Friendly warning for scans that are not product barcodes (URLs, random QR codes, text).
 */
export function notifyNotProductBarcode() {
  notify.warning(i18n.t('pos:notProductBarcode'), i18n.t('pos:notProductBarcodeDesc'))
}
