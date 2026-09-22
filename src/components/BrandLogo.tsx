'use client'

type AppLogoIconProps = {
  className?: string
}

export function AppLogoIcon({ className = 'h-11 w-16 sm:h-16 sm:w-24' }: AppLogoIconProps) {
  return (
    <svg
      viewBox="0 0 168 112"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="logoPathClip">
          <rect x="0" y="0" width="168" height="112" rx="18" />
        </clipPath>
      </defs>
      <g clipPath="url(#logoPathClip)">
        <path d="M7 74 41 43l21 18 27-30 34 36 19-13 27 24v35H7Z" fill="var(--logo-landscape)" opacity="0.28" />
        <circle cx="128" cy="25" r="13" fill="var(--logo-sun)" opacity="var(--logo-sun-opacity)" />
        <path
          d="M135 13a14 14 0 1 0 10 24 11 11 0 1 1-10-24Z"
          fill="var(--logo-moon)"
          opacity="var(--logo-moon-opacity)"
        />
        <path d="M18 82c20-22 39-29 58-21 22 10 39 8 74-14" fill="none" stroke="var(--logo-landscape)" strokeWidth="7" strokeLinecap="round" opacity="0.7" />

        <path d="M21 63 49 39l28 24v31H21Z" fill="var(--logo-primary)" />
        <path d="M15 64 49 34l34 30-5 6-29-25-29 25Z" fill="var(--logo-secondary)" />
        <rect x="37" y="67" width="10" height="10" rx="2" fill="var(--logo-moon)" />
        <rect x="51" y="67" width="10" height="10" rx="2" fill="var(--logo-moon)" />

        <path d="M92 61 123 35l31 26v33H92Z" fill="var(--logo-secondary)" />
        <path d="M86 62 123 30l37 32-5 7-32-27-32 27Z" fill="var(--logo-primary)" />
        <rect x="111" y="66" width="10" height="10" rx="2" fill="var(--logo-moon)" />
        <rect x="125" y="66" width="10" height="10" rx="2" fill="var(--logo-moon)" />

        <path
          d="M76 111c4-23 6-40 7-53 1 13 4 30 9 53Z"
          fill="var(--logo-path)"
        />
        <path
          d="M83 58c-9 14-24 28-44 41M84 58c13 16 27 29 43 41"
          fill="none"
          stroke="var(--logo-path)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M83 60c-3 13-4 30-2 52" fill="none" stroke="var(--surface)" strokeWidth="2.5" strokeLinecap="round" opacity="0.72" />
      </g>
    </svg>
  )
}

export function BrandLogo() {
  return (
    <div className="app-logo flex items-center gap-2 sm:gap-4" aria-label="Brothers House">
      <AppLogoIcon />
      <div className="hidden min-w-0 sm:block">
        <div className="app-logo-text text-sm font-black uppercase tracking-[0.2em]">
          Brothers House
        </div>
      </div>
    </div>
  )
}
