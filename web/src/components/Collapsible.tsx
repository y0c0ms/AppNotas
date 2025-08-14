import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  text: string
  maxLines?: number
  onToggle?: (collapsed: boolean) => void
}

export default function Collapsible({ text, maxLines = 8, onToggle }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState(true)
  const needsCollapse = useMemo(() => (text || '').split('\n').length > maxLines, [text, maxLines])
  useEffect(() => { if (onToggle) onToggle(collapsed) }, [collapsed, onToggle])
  return (
    <div>
      <div ref={ref} style={{ whiteSpace: 'pre-wrap', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: collapsed && needsCollapse ? maxLines : 'unset', WebkitBoxOrient: 'vertical' as any }}>{text}</div>
      {needsCollapse && (
        <button className="chip" style={{ marginTop: 6 }} onClick={() => setCollapsed(v => !v)}>{collapsed ? 'Show more' : 'Show less'}</button>
      )}
    </div>
  )
}


