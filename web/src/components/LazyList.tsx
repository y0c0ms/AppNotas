import React, { useEffect, useRef, useState } from 'react'

type LazyListProps<T> = {
  items: readonly T[]
  renderItem: (item: T, index: number) => React.ReactElement
  initialCount?: number
  step?: number
  rootMargin?: string
}

export default function LazyList<T>({ items, renderItem, initialCount = 30, step = 30, rootMargin = '200px' }: LazyListProps<T>) {
  const [count, setCount] = useState(Math.min(initialCount, items.length))
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setCount(Math.min(initialCount, items.length))
  }, [items, initialCount])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setCount((c) => Math.min(items.length, c + step))
        }
      }
    }, { rootMargin })
    io.observe(node)
    return () => io.disconnect()
  }, [items.length, rootMargin, step])

  return (
    <>
      {items.slice(0, count).map((item, idx) => renderItem(item, idx))}
      {count < items.length && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}
    </>
  )
}


