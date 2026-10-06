import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUri, getInitials } from '@/lib/avatar'
import { cn } from '@/lib/utils'

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg font-bold',
}

/**
 * Avatar displaying a local offline DiceBear SVG avatar with initials fallback.
 *
 * @component
 * @param {object} props
 * @param {string} [props.name] - User or customer name
 * @param {string} [props.email] - Optional fallback seed
 * @param {'initials'|'notionists'|'thumbs'} [props.style='initials'] - DiceBear style
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md'] - Avatar diameter size
 * @param {string} [props.className] - Additional class names
 * @returns {React.JSX.Element}
 */
export function UserAvatar({
  name = '',
  email = '',
  style = 'initials',
  size = 'md',
  className,
  ...props
}) {
  const seed = name || email || 'User'
  const avatarUri = getAvatarUri(seed, style)
  const initials = getInitials(name || email)

  return (
    <Avatar
      className={cn(sizeClasses[size] || sizeClasses.md, className)}
      {...props}
    >
      <AvatarImage src={avatarUri} alt={name || 'User avatar'} />
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export default UserAvatar
