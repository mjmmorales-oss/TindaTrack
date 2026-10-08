import { useState } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { useCreateCustomer } from '@/features/customers/hooks/useCustomers'

/**
 * Inline mini form to quickly register a new suki during POS checkout.
 *
 * @param {object} props
 * @param {(customer: object) => void} props.onSuccess - Callback with newly created customer
 * @param {() => void} props.onCancel - Cancel callback
 */
export function NewCustomerMiniForm({ onSuccess, onCancel }) {
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [creditLimit, setCreditLimit] = useState('1000.00')
  const [nameError, setNameError] = useState('')

  const createCustomerMutation = useCreateCustomer()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('Kailangan ang pangalan ng suki.')
      return
    }
    setNameError('')

    try {
      const res = await createCustomerMutation.mutateAsync({
        name: name.trim(),
        nickname: nickname.trim(),
        contact_number: contactNumber.trim(),
        credit_limit: parseFloat(creditLimit) || 1000,
      })
      onSuccess?.(res.data)
    } catch {
      // Handled by mutation onError toast
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
        <UserPlus className="h-4 w-4" />
        <span>Magrehistro ng Bagong Suki (New Customer)</span>
      </div>

      <div className="space-y-1">
        <Label htmlFor="suki-name" className="text-xs font-medium">
          Buong Pangalan <span className="text-destructive">*</span>
        </Label>
        <Input
          id="suki-name"
          placeholder="hal. Juan Dela Cruz"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (nameError) setNameError('')
          }}
          className="h-9 text-xs"
          autoFocus
        />
        {nameError && (
          <p className="text-[11px] text-destructive">{nameError}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="suki-nickname" className="text-xs font-medium">
            Palayaw (Nickname)
          </Label>
          <Input
            id="suki-nickname"
            placeholder="hal. Mang Juan"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="suki-phone" className="text-xs font-medium">
            Telepono (CP #)
          </Label>
          <Input
            id="suki-phone"
            placeholder="0912 345 6789"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="suki-credit-limit" className="text-xs font-medium">
          Credit Limit (₱)
        </Label>
        <MoneyInput
          id="suki-credit-limit"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="1000.00"
          className="h-9"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={createCustomerMutation.isPending}
          className="h-8 text-xs px-2.5"
        >
          Kanselahin
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={createCustomerMutation.isPending}
          className="h-8 text-xs px-3 gap-1"
        >
          {createCustomerMutation.isPending && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          I-save ang Suki
        </Button>
      </div>
    </form>
  )
}

export default NewCustomerMiniForm
