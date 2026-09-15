/** A quiet "Loading…" line. role="status" lets screen readers announce it. */
export default function LoadingMessage({ children }: { children: string }) {
  return (
    <p role="status" className="mt-6 text-sm text-slate-600">
      {children}
    </p>
  )
}
