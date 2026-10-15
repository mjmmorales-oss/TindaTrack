import { useTranslation } from 'react-i18next'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { BarcodeCapture } from '@/components/scanner/BarcodeCapture'

/**
 * Modal dialog / bottom drawer wrapping BarcodeCapture for single-device barcode scanning.
 * Supports USB wedge scanners, manual typing fallback, and inline camera preview.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {(code: string, meta: { source: string }) => void} props.onDetected - Callback on detected barcode
 * @param {string} [props.title] - Dialog header title
 * @param {boolean} [props.continuous=false] - Whether scanner stays open after a scan
 */
export function ScannerSheet({
  open,
  onOpenChange,
  onDetected,
  title,
  continuous = false,
}) {
  const { t } = useTranslation(['scanner', 'common'])
  const resolvedTitle = title || t('scanner:scanAtPosTitle', 'Scan Barcode')

  const handleDetected = (code, meta) => {
    onDetected?.(code, meta)
    if (!continuous) {
      onOpenChange?.(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={resolvedTitle}
      description={t('scanner:scanAtPosDesc', 'Scan with camera, USB scanner, or type barcode numbers.')}
      className="sm:max-w-md"
    >
      <div className="p-1">
        <BarcodeCapture
          onCode={handleDetected}
          continuous={continuous}
          autoFocus={open}
          cameraDefault="auto"
        />
      </div>
    </ResponsiveDialog>
  )
}

export default ScannerSheet

