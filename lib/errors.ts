export function formatError(error: unknown): string {
  if (error instanceof Error) {
    console.error(error)
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    console.error(error)
    return String((error as { message: unknown }).message)
  }
  console.error(error)
  return 'An unexpected error occurred. Please try again.'
}
