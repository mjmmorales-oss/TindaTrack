import { useTranslation } from 'react-i18next'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { CameraScanner } from '@/components/scanner/CameraScanner'

/**
 * Modal dialog / bottom drawer wrapping CameraScanner for single-device barcode scanning.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {(code: string) => void} props.onDetected - Callback on detected barcode
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
  const resolvedTitle = title || t('scanner:scanAtPosTitle', 'Scan Barcode in POS')

  const handleDetected = (code) => {
    onDetected?.(code)
    if (!continuous) {
      onOpenChange?.(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={resolvedTitle}
      description={t('scanner:scanAtPosDesc', 'Point the camera at the product barcode or QR code.')}
      className="overflow-hidden p-0 sm:max-w-md"
    >
      <div className="p-3 sm:p-4">
        <CameraScanner onDetected={handleDetected} paused={!open} />
      </div>
    </ResponsiveDialog>
  )
}

export default ScannerSheet
