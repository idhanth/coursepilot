import type { ReactNode } from 'react'

/** The main content area. Every page uses it, so widths and spacing match the navbar. */
export default function Page({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return <main className={`mx-auto w-full px-4 ${narrow ? 'max-w-sm py-10 sm:py-14' : 'max-w-6xl py-8'}`}>{children}</main>
}
