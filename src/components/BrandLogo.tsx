'use client'

export function BrandLogo() {
  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox="0 0 240 120"
        className="h-16 w-24 shrink-0"
        aria-hidden="true"
      >
        <g fill="#6984A9">
          <path d="M37 73h45l38-48 38 48h45l-18-22h-14l-13 16-38-48-38 48-13-16H55z" />
          <path d="M82 73h19l19-24 19 24h19l-38-48z" />
          <path d="M56 42h26v8H56z" />
          <path d="M158 42h26v8h-26z" />
          <path d="M49 53h31v8H49z" />
          <path d="M160 53h31v8h-31z" />
        </g>
        <g fill="#263B6A">
          <rect x="111" y="55" width="8" height="8" rx="1" />
          <rect x="121" y="55" width="8" height="8" rx="1" />
          <rect x="111" y="65" width="8" height="8" rx="1" />
          <rect x="121" y="65" width="8" height="8" rx="1" />
        </g>
      </svg>
      <div className="min-w-0">
        <div className="text-[0.72rem] font-black uppercase tracking-[0.28em] text-[#263b6a] sm:text-sm">
          Day By Day And
        </div>
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-[#6984a9] sm:text-xs">
          House To House
        </div>
      </div>
    </div>
  )
}
