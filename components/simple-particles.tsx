"use client"

import { useEffect } from "react"

export function SimpleParticles() {
  useEffect(() => {
    const particleCount = 80
    const particles: HTMLDivElement[] = []

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div")
      p.className = "particle"

      const size = Math.random() * 15 + 3
      const isGlowing = Math.random() > 0.7

      p.style.width = size + "px"
      p.style.height = size + "px"
      p.style.left = Math.random() * 100 + "vw"
      p.style.top = Math.random() * 100 + "vh"
      p.style.animationDuration = 3 + Math.random() * 12 + "s"
      p.style.animationDelay = Math.random() * 5 + "s"

      const colors = [
        "rgba(168, 85, 247, 0.4)", // purple
        "rgba(236, 72, 153, 0.4)", // pink
        "rgba(34, 211, 238, 0.3)", // cyan
        "rgba(255, 255, 255, 0.2)", // white
      ]
      p.style.background = colors[Math.floor(Math.random() * colors.length)]

      if (isGlowing) {
        p.style.boxShadow = `0 0 ${size * 2}px ${size}px ${p.style.background}`
      }

      document.body.appendChild(p)
      particles.push(p)
    }

    return () => {
      particles.forEach((p) => p.remove())
    }
  }, [])

  return null
}
