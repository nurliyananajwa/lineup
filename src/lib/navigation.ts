// Reject network paths, backslashes and control characters before Next.js resolves a URL.
export function safeNext(value: unknown) {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\u0000-\u0020\u007f]/.test(value)
    ? value
    : '/dashboard'
}
