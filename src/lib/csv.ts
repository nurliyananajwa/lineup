export function csvCell(value: string | null | undefined) {
  let text = value ?? ''
  // Quoting alone does not stop spreadsheet formula execution.
  if (/^[=+\-@\t\r\n]|^\s+[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}
