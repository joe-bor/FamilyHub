import type React from "react"

import { useState, useEffect } from "react"

interface CurrentTimeIndicatorProps {
  startHour?: number
}

export function CurrentTimeIndicator({ startHour = 6 }: CurrentTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const hours = currentTime.getHours()
  const minutes = currentTime.getMinutes()

  const hourOffset = hours - startHour
  const minuteOffset = minutes / 60
  const topPosition = (hourOffset + minuteOffset) * 80

  if (hours < startHour || hours >= 23) {
    return null
  }

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${topPosition}px` }}>
      {/* Line */}
      <div
        className="absolute left-3 right-0 h-[2px] bg-primary shadow-[0_0_6px_2px_rgba(139,92,246,0.4)]"
        style={{ top: "-1px" }}
      />
      {/* Dot - positioned at the left edge, centered on the line */}
      <div
        className="absolute left-0 w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_3px_rgba(139,92,246,0.5)] animate-pulse"
        style={{ top: "-6px" }}
      />
    </div>
  )
}

export function useAutoScrollToNow(containerRef: React.RefObject<HTMLElement | null>, startHour = 6) {
  useEffect(() => {
    if (!containerRef.current) return

    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()

    const hourOffset = hours - startHour
    const minuteOffset = minutes / 60
    const scrollPosition = (hourOffset + minuteOffset) * 80 - 200

    containerRef.current.scrollTo({
      top: Math.max(0, scrollPosition),
      behavior: "smooth",
    })
  }, [containerRef, startHour])
}
