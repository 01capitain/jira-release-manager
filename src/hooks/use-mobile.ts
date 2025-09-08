import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)

    const add = (m: MediaQueryList, l: (e: MediaQueryListEvent) => void) =>
      // Safari <15 fallback
      (m as any).addEventListener
        ? m.addEventListener("change", l)
        : (m as any).addListener(l)

    const remove = (m: MediaQueryList, l: (e: MediaQueryListEvent) => void) =>
      (m as any).removeEventListener
        ? m.removeEventListener("change", l)
        : (m as any).removeListener(l)

    add(mql, onChange)
    setIsMobile(mql.matches)
    return () => remove(mql, onChange)
  }, [])

  return !!isMobile
}
