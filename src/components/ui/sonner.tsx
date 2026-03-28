"use client"

import {
  CircleCheckIcon,
  OctagonXIcon,
} from "lucide-react"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      richColors
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius, 0.75rem)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

/** Reusable toast helpers */
const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
}

export { Toaster, showToast }
