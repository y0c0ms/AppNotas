export function insertPrefixAtCursor(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart || 0
  const val = textarea.value
  const lineStart = val.lastIndexOf('\n', start - 1) + 1
  const updated = val.slice(0, lineStart) + prefix + val.slice(lineStart)
  textarea.value = updated
  const pos = start + prefix.length
  textarea.setSelectionRange(pos, pos)
  textarea.focus()
}

export function continueMarkdownListOnEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  const ta = e.currentTarget
  if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return
  const val = ta.value
  const pos = ta.selectionStart || 0
  const lineStart = val.lastIndexOf('\n', pos - 1) + 1
  const line = val.slice(lineStart, pos)
  const bulletMatch = /^\s*(•\s)/.exec(line)
  const numMatch = /^\s*(\d+)\.[\s]/.exec(line)
  if (bulletMatch) {
    e.preventDefault()
    insertAtCursor(ta, '\n' + bulletMatch[1])
  } else if (numMatch) {
    e.preventDefault()
    const next = (parseInt(numMatch[1], 10) + 1) + '. '
    insertAtCursor(ta, '\n' + next)
  }
}

export function insertAtCursor(ta: HTMLTextAreaElement, text: string) {
  const start = ta.selectionStart || 0
  const end = ta.selectionEnd || 0
  const val = ta.value
  ta.value = val.slice(0, start) + text + val.slice(end)
  const pos = start + text.length
  ta.setSelectionRange(pos, pos)
  ta.focus()
}


