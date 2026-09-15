import { Link } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import Page from '../components/Page.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { buttonClass } from '../styles.ts'

/** Shown for any address that doesn't match a page. */
export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <Page>
      <EmptyState title="Page not found" message="The address may be mistyped, or the page may have moved.">
        <Link to="/courses" className={buttonClass()}>
          Search courses
        </Link>
      </EmptyState>
    </Page>
  )
}
