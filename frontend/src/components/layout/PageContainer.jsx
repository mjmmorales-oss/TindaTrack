import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export function PageContainer({ className, children, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8 lg:px-8',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}

