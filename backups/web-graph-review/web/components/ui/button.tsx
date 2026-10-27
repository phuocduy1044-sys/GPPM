import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px active:shadow-none",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-3d-1 hover:-translate-y-0.5 hover:shadow-3d-2 hover:bg-primary/95',
        destructive: 'bg-destructive text-destructive-foreground shadow-3d-1 hover:-translate-y-0.5 hover:shadow-3d-2 hover:bg-destructive/90',
        outline: 'border bg-card shadow-3d-1 hover:-translate-y-0.5 hover:shadow-3d-2 hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-3d-1 hover:-translate-y-0.5 hover:shadow-3d-2 hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5 active:translate-y-0',
        inverted: 'bg-foreground text-background shadow-3d-1 hover:-translate-y-0.5 hover:shadow-3d-2 hover:bg-foreground/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

// React 18 doesn't pass `ref` as a prop, so forward it: Radix `asChild` triggers
// anchor their popovers to this element through it.
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
