import { useState, type SyntheticEvent } from 'react'

type Tone = 'light' | 'dark' | 'unknown'

// Catalogue photos are shot on either pure white or pure black. Sampling the corner pixels lets the frame match:
// white shots blend into the warm paper (they look cut out), black shots sit in a dark display case.
function detectTone(img: HTMLImageElement): Tone {
  try {
    const size = 8
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return 'unknown'
    ctx.drawImage(img, 0, 0, size, size)
    const corners = [
      [0, 0],
      [size - 1, 0],
      [0, size - 1],
      [size - 1, size - 1],
    ].map(([x, y]) => {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
      return (r + g + b) / 3
    })
    if (Math.min(...corners) > 225) return 'light'
    if (Math.max(...corners) < 40) return 'dark'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

interface Props {
  src: string
  alt: string
  className?: string
  eager?: boolean
}

export default function ProductImage({ src, alt, className = '', eager = false }: Props) {
  const [tone, setTone] = useState<Tone>('unknown')
  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => setTone(detectTone(e.currentTarget))
  return (
    <div className={`product-image tone-${tone} ${className}`}>
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onLoad={onLoad} />
    </div>
  )
}
