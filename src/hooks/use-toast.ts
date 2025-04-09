
import * as React from "react"
import { type ToastActionElement } from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000000

export type Toast = {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: "default" | "destructive"
}

export type ToasterToast = Toast & {
  id: string
}

let toasts: ToasterToast[] = []

export const useToast = () => {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      forceUpdate()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // This is a no-op toast function that doesn't display anything
  function toast(props: Toast) {
    const id = props.id || crypto.randomUUID()
    console.log('Toast (disabled):', props);
    return {
      id,
      dismiss: () => {},
      update: () => {},
    }
  }

  function dismiss() {
    // No-op
  }

  function update() {
    // No-op
  }

  return {
    toast,
    dismiss,
    toasts: [],
  }
}

// Create a standalone toast function that can be used without the hook
export const toast = (props: Toast) => {
  console.log('Toast standalone (disabled):', props);
  return {
    id: crypto.randomUUID(),
    dismiss: () => {},
    update: () => {},
  }
}
