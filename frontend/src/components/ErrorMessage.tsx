type ErrorMessageProps = {
  message: string
  onRetry?: () => void // shows a "Try again" button when given
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p role="alert">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded font-medium text-red-900 underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          Try again
        </button>
      )}
    </div>
  )
}
