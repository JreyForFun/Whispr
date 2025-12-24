import { useEffect, useRef } from 'react'

export function BackgroundEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    let particles: Particle[] = []
    const particleCount = Math.min(width * 0.1, 80) // Density based on screen width

    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      alpha: number

      constructor() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.size = Math.random() * 2 + 1
        this.alpha = Math.random() * 0.5 + 0.1
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        // Wrap around
        if (this.x < 0) this.x = width
        if (this.x > width) this.x = 0
        if (this.y < 0) this.y = height
        if (this.y > height) this.y = 0
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(147, 51, 234, ${this.alpha})` // Purple
        ctx.fill()
      }
    }

    const init = () => {
      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    const animate = () => {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      particles.forEach((p, index) => {
        p.update()
        p.draw()

        // Distances
        for (let j = index + 1; j < particles.length; j++) {
          const dx = particles[j].x - p.x
          const dy = particles[j].y - p.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(particles[j].x, particles[j].y)
            const opacity = 1 - distance / 150
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.3})` // Blue-ish purple lines
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      })
      requestAnimationFrame(animate)
    }

    init()
    animate()

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
      init()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-60"
    />
  )
}
