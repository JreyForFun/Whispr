import { useEffect, useState, useRef } from 'react'

interface EmojiBlastProps {
  incomingEmoji: { emoji: string, id: string } | null
}

interface Particle {
  id: number
  emoji: string
  x: number
  y: number
  rotation: number
  scale: number
  animationDuration: number
}

export function EmojiBlast({ incomingEmoji }: EmojiBlastProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const nextIdRef = useRef(0)

  // When a new emoji comes in, blast it!
  useEffect(() => {
    if (incomingEmoji) {
      triggerBlast(incomingEmoji.emoji)
    }
  }, [incomingEmoji])

  const triggerBlast = (emoji: string) => {
    const count = 15 // Number of particles per blast
    const newParticles: Particle[] = []

    for (let i = 0; i < count; i++) {
      // Random starting position near bottom center (or random spread)
      // Let's make them erupt from the bottom center or random positions
      const x = 20 + Math.random() * 60 // 20% to 80% width
      const y = 80 + Math.random() * 10 // Start near bottom

      newParticles.push({
        id: nextIdRef.current++,
        emoji,
        x,
        y,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1.5,
        animationDuration: 1.5 + Math.random() * 1.5 // 1.5s to 3s
      })
    }

    setParticles(prev => [...prev, ...newParticles])
  }

  // Cleanup particles (simplistic: we rely on CSS animation to hide them, but we should remove from state eventually)
  // To avoid performance issues, we can cleanup old particles periodically or set a timeout
  useEffect(() => {
    const timer = setInterval(() => {
      setParticles(prev => {
        if (prev.length > 50) return prev.slice(prev.length - 20) // Keep last 20
        return prev
      })
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-float-up opacity-0"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.scale * 2}rem`,
            '--tw-rotate': `${p.rotation}deg`,
            animationDuration: `${p.animationDuration}s`,
            animationFillMode: 'forwards'
          } as any}
        >
          {p.emoji}
        </div>
      ))}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) rotate(0deg) scale(0.5);
            opacity: 1;
          }
          50% {
             opacity: 1;
          }
          100% {
            transform: translateY(-100vh) rotate(${360}deg) scale(1);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation-name: float-up;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>
    </div>
  )
}
