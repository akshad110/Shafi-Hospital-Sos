import type { ReactNode } from 'react'
import { CalendarClock, ShieldCheck, Siren } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { cn } from '../../lib/utils'

const POINTS = [
  { icon: Siren, title: 'Need someone today?', body: 'Send a request. You confirm who is hired.' },
  { icon: ShieldCheck, title: 'You review the papers', body: 'Check certificates, then confirm the hire or ask them to update.' },
  { icon: CalendarClock, title: 'Mark and pay', body: 'Tap who came in, then pay them.' },
]

export function AuthLayout({
  children,
  className,
  mainClassName,
}: {
  children: ReactNode
  className?: string
  mainClassName?: string
}) {
  return (
    <div className={cn('min-h-screen bg-navy lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.14fr)]', className)}>
      <BrandPanel />
      <main
        className={cn(
          'relative z-[1] flex min-h-screen min-w-0 items-center justify-center bg-canvas px-4 py-8 sm:py-10',
          'lg:-ml-48 lg:pl-64 lg:pr-8 lg:[clip-path:ellipse(90%_90%_at_100%_50%)] lg:[filter:drop-shadow(-16px_0_24px_rgba(8,20,50,0.14))]',
          mainClassName,
        )}
      >
        {children}
      </main>
    </div>
  )
}

export function BrandPanel() {
  return (
    <section className="relative hidden flex-col justify-between overflow-hidden px-12 py-12 pr-28 text-white lg:flex">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border border-white/10" />
      <div className="relative">
        <div className="inline-flex items-center rounded-2xl bg-white px-3 py-2">
          <Logo className="h-12 w-auto max-w-[240px]" />
        </div>
        <h2 className="mt-14 max-w-md text-[40px] font-semibold leading-[1.1] tracking-tight">Get staff for the next shift.</h2>
        <p className="mt-4 max-w-sm text-[15px] leading-7 text-white/75">Ask for people, see who applied, mark who came in, and pay.</p>
      </div>
      <ul className="relative mt-10 max-w-md space-y-5">
        {POINTS.map((point) => (
          <li key={point.title} className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10"><point.icon className="h-4 w-4" /></span>
            <span>
              <span className="block text-sm font-semibold">{point.title}</span>
              <span className="block text-sm text-white/70">{point.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
