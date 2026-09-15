import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  // Remove whatever a test rendered, and any token it saved, before the next test starts.
  cleanup()
  localStorage.clear()
})
