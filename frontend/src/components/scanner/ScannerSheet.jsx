import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { CameraScanner } from '@/components/scanner/CameraScanner'

/**
 * Modal dialog / bottom drawer wrapping CameraScanner for single-device barcode scanning.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {(code: string) => void} props.onDetected - Callback on detected barcode
 * @param {string} [props.title='I-scan ang Barcode'] - Dialog header title
 * @param {boolean} [props.continuous=false] - Whether scanner stays open after a scan
 */
export function ScannerSheet({
  open,
  onOpenChange,
  onDetected,
  title = 'I-scan ang Barcode',
  continuous = false,
}) {
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
      title={title}
      description="Itapat ang camera sa barcode o QR code ng produkto."
      className="overflow-hidden p-0 sm:max-w-md"
    >
      <div className="p-3 sm:p-4">
        <CameraScanner onDetected={handleDetected} paused={!open} />
      </div>
    </ResponsiveDialog>
  )
}
