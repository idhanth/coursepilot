import { useEffect } from 'react'

/** Sets the browser tab title, e.g. "Dashboard · CoursePilot". */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · CoursePilot`
  }, [title])
}
