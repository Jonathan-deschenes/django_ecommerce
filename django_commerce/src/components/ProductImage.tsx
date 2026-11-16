import { useEffect, useState } from 'react'
import { getInitials } from '../lib/format'

interface ProductImageProps {
  product: { id: string; name: string; image?: string }
  className?: string
}

function hashString(value: string): number {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }

  return Math.abs(hash)
}

export function ProductImage({ product, className = '' }: ProductImageProps) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [product.image])

  const hue = hashString(product.id) % 360
  const background = `linear-gradient(135deg, hsl(${hue} 82% 93%), hsl(${(hue + 42) % 360} 68% 78%))`
  const showImage = Boolean(product.image) && !imageFailed

  return (
    <div
      role="img"
      aria-label={`Image de ${product.name}`}
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background }}
    >
      {showImage ? (
        <img
          src={product.image}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <span className="absolute -right-6 -top-8 size-24 rounded-full bg-white/35 blur-2xl" />
          <span className="absolute -bottom-10 -left-8 size-28 rounded-full bg-white/25 blur-2xl" />
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-white/70 text-2xl font-semibold text-slate-700 shadow-sm backdrop-blur">
            {getInitials(product.name)}
          </span>
        </>
      )}
    </div>
  )
}
