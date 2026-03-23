import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-[10px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
        {
          // Variants
          'bg-[var(--tg)] text-white hover:bg-[var(--tg2)] shadow-[0_0_24px_rgba(34,158,217,0.25)] hover:shadow-[0_0_32px_rgba(34,158,217,0.4)] hover:-translate-y-px active:translate-y-0': variant === 'primary',
          'bg-transparent border border-[var(--border2)] text-[var(--text2)] hover:text-[var(--text)] hover:border-white/20': variant === 'secondary',
          'bg-transparent text-[var(--text3)] hover:text-[var(--text2)]': variant === 'ghost',
          // Sizes
          'text-sm px-4 py-2': size === 'sm',
          'text-sm px-5 py-2.5': size === 'md',
          'text-base px-7 py-3.5': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
