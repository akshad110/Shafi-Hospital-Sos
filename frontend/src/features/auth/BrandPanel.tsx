import { CalendarClock, ShieldCheck, Siren } from 'lucide-react'

const POINTS = [
  { icon: Siren, title: 'Urgent cover in minutes', body: 'Raise a Quick SOS and track it until a worker is confirmed.' },
  { icon: ShieldCheck, title: 'Admin-reviewed requests', body: 'Every request and placement is checked before it goes live.' },
  { icon: CalendarClock, title: 'Attendance on record', body: 'Check-ins and completions for every shift, in one place.' },
]

export function BrandPanel() {
  return (
    <section className="relative hidden flex-col justify-between overflow-hidden bg-navy px-12 py-12 text-white lg:flex">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border border-white/10" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-lg font-bold">S</span>
          <span>
            <span className="block text-[15px] font-semibold">Shafi SOS</span>
            <span className="block text-xs text-white/70">Hospital Portal</span>
          </span>
        </div>
        <h2 className="mt-14 max-w-md text-[40px] font-semibold leading-[1.1] tracking-tight">Staff the next shift without the scramble.</h2>
        <p className="mt-4 max-w-sm text-[15px] leading-7 text-white/75">One desk for staffing requests, applications, confirmed placements and attendance.</p>
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
