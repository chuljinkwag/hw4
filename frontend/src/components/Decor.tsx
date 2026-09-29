import { useId } from 'react'

// Small storefront motifs used across the site. Purely decorative, so hidden from screen readers.

export function Awning({ className = '' }: { className?: string }) {
  const stripes = 24
  return (
    <svg className={`awning ${className}`} viewBox={`0 0 ${stripes * 40} 56`} preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: stripes }, (_, i) => (
        <path
          key={i}
          d={`M${i * 40} 0 H${i * 40 + 40} V36 Q${i * 40 + 20} 56 ${i * 40} 36 Z`}
          fill={i % 2 ? '#faf7f1' : '#00356b'}
        />
      ))}
      <rect x="0" y="0" width={stripes * 40} height="6" fill="#00224a" />
    </svg>
  )
}

export function Seal({ size = 44 }: { size?: number }) {
  const arcId = `seal-arc-${useId().replace(/:/g, '')}`
  return (
    <svg className="seal" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id={arcId} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
      </defs>
      <circle cx="50" cy="50" r="48" fill="#00356b" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="#faf7f1" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
      <text fontFamily="Inter, sans-serif" fontSize="9.5" fontWeight="600" letterSpacing="2.2" fill="#faf7f1">
        <textPath href={`#${arcId}`} startOffset="2%">CAMPUS CUSTOMS · NEW HAVEN · </textPath>
      </text>
      <text x="50" y="61" textAnchor="middle" fontFamily="Graduate, Georgia, serif" fontSize="30" fill="#faf7f1">CC</text>
    </svg>
  )
}

export function Pennant({ label, className = '' }: { label: string; className?: string }) {
  return (
    <svg className={`pennant ${className}`} viewBox="0 0 220 64" aria-hidden="true">
      <path d="M0 0 L220 32 L0 64 Z" fill="#00356b" />
      <rect x="0" y="0" width="16" height="64" fill="#00224a" />
      <text x="30" y="39" fontFamily="Graduate, Georgia, serif" fontSize="20" fill="#faf7f1" letterSpacing="2">
        {label}
      </text>
    </svg>
  )
}
