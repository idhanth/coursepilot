import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Remove whatever a test rendered before the next test starts.
afterEach(() => {
  cleanup()
})
