
import * as React from "react"
import { Link, LinkProps } from "react-router-dom"
import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonProps } from "@/components/ui/button"

type ButtonLinkProps = ButtonProps & LinkProps & {
  children: React.ReactNode
}

const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <Link
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Link>
    )
  }
)
ButtonLink.displayName = "ButtonLink"

export { ButtonLink }
