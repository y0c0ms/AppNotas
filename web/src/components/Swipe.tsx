import { useEffect, useRef } from 'react'

type SwipeableProps = {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
  children: React.ReactNode
}

export default function Swipeable({ onSwipeLeft, onSwipeRight, threshold = 60, children }: SwipeableProps) {
  const startX = useRef<number | null>(null)
  const deltaX = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onTouchStart = (e: TouchEvent) => { startX.current = e.touches[0].clientX; deltaX.current = 0 }
    const onTouchMove = (e: TouchEvent) => {
      if (startX.current == null) return
      deltaX.current = e.touches[0].clientX - startX.current
      el.style.transform = `translateX(${deltaX.current}px)`
    }
    const onTouchEnd = () => {
      const dx = deltaX.current
      el.style.transform = ''
      startX.current = null
      deltaX.current = 0
      if (dx <= -threshold && onSwipeLeft) onSwipeLeft()
      else if (dx >= threshold && onSwipeRight) onSwipeRight()
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, threshold])

  return <div ref={containerRef}>{children}</div>
}


