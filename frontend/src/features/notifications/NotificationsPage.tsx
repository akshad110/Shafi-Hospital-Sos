import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CalendarClock, CreditCard, FileText, Mail, MailOpen, Settings2, ShieldCheck, Trash2, Wallet } from 'lucide-react'
import { clearReadNotices, deleteNotice, markAllRead, notifications, setNoticeRead } from '../../services/api'
import { cn, errorMessage, when } from '../../lib/utils'
import type { NoticeCategory, NoticeList } from '../../types/domain'
import { buttonClass, Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Chip, Segmented } from '../../components/ui/Chip'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, PageSkeleton } from '../../components/ui/States'

const CATEGORY: Record<NoticeCategory, { label: string; icon: typeof Bell }> = {
  applications: { label: 'Applications', icon: FileText },
  reviews: { label: 'Reviews', icon: ShieldCheck },
  shifts: { label: 'Shifts', icon: CalendarClock },
  payroll: { label: 'Payroll', icon: Wallet },
  billing: { label: 'Billing', icon: CreditCard },
  system: { label: 'System', icon: Bell },
}

type View = 'all' | 'unread'

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('all')
  const [category, setCategory] = useState<NoticeCategory | ''>('')
  const filters = { status: view === 'unread' ? ('unread' as const) : undefined, category: category || undefined }
  const key = ['notifications', 'list', filters]
  const query = useQuery({ queryKey: key, queryFn: () => notifications(filters), placeholderData: (previous) => previous })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  const patchList = (update: (data: NoticeList) => NoticeList) => queryClient.setQueryData<NoticeList>(key, (data) => (data ? update(data) : data))

  const toggle = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => setNoticeRead(id, read),
    onMutate: ({ id, read }) => patchList((data) => ({ ...data, items: data.items.map((item) => (item.id === id ? { ...item, read } : item)) })),
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: deleteNotice,
    onMutate: (id) => patchList((data) => ({ ...data, items: data.items.filter((item) => item.id !== id) })),
    onSettled: refresh,
  })
  const readAll = useMutation({ mutationFn: () => markAllRead(category || undefined), onSettled: refresh })
  const clear = useMutation({ mutationFn: clearReadNotices, onSettled: refresh })

  if (query.isLoading) return <PageSkeleton />
  if (query.isError || !query.data) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />

  const notes = query.data
  const scopeUnread = category ? notes.categories[category].unread : notes.unread
  const readCount = notes.total - notes.unread
  const groups = new Map<string, typeof notes.items>()
  for (const item of notes.items) {
    const day = new Date(item.createdAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
    groups.set(day, [...(groups.get(day) || []), item])
  }
  const error = toggle.error || remove.error || readAll.error || clear.error

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Desk updates"
        description="Applications, reviews, shifts, payroll and billing, delivered the moment they happen."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={!scopeUnread || readAll.isPending} onClick={() => readAll.mutate()}>
              <MailOpen className="h-4 w-4" /> Mark all read
            </Button>
            <Button variant="ghost" size="sm" disabled={!readCount || clear.isPending} onClick={() => clear.mutate()}>
              <Trash2 className="h-4 w-4" /> Clear read
            </Button>
          </div>
        }
      />

      <div className="space-y-3">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'all', label: `All (${category ? notes.categories[category].total : notes.total})` },
            { value: 'unread', label: `Unread (${scopeUnread})` },
          ]}
        />
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Chip active={!category} onClick={() => setCategory('')}>Everything</Chip>
          {(Object.keys(CATEGORY) as NoticeCategory[]).filter((key) => notes.categories[key].total > 0 || key === category).map((key) => (
            <Chip key={key} active={category === key} onClick={() => setCategory(key)}>
              {CATEGORY[key].label}
              {notes.categories[key].unread > 0 && <span className={cn('ml-1.5 rounded-full px-1.5 text-[10px]', category === key ? 'bg-white/25' : 'bg-mint text-brand-deep')}>{notes.categories[key].unread}</span>}
            </Chip>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{errorMessage(error)}</p>}

      {notes.items.length === 0 && (
        <Card>
          <EmptyState
            title={view === 'unread' ? "You're all caught up" : 'Nothing here yet'}
            body="New updates about requests, shifts, salaries and billing land here instantly."
          />
        </Card>
      )}

      {[...groups.entries()].map(([day, items]) => (
        <section key={day}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{day}</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {items.map((item) => {
                const Icon = CATEGORY[item.category]?.icon || Bell
                return (
                  <li key={item.id} className={cn('group flex items-start gap-3 px-4 py-3.5 transition-colors md:px-5', item.read ? 'hover:bg-canvas' : 'bg-mint/40 hover:bg-mint/70')}>
                    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', item.priority === 'high' && !item.read ? 'bg-sos-soft text-sos' : item.read ? 'bg-canvas text-muted' : 'bg-white text-brand ring-1 ring-brand/20')}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <Link to={item.href || '/notifications'} onClick={() => { if (!item.read) toggle.mutate({ id: item.id, read: true }) }} className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink group-hover:text-brand-deep">
                        {item.title}
                        {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-label="Unread" />}
                        {item.priority === 'high' && <span className="rounded bg-sos-soft px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-sos">Action</span>}
                      </p>
                      <p className="mt-0.5 text-sm leading-5 text-muted">{item.body}</p>
                      <p className="mt-1 text-xs text-faint">{CATEGORY[item.category]?.label} · {when(item.createdAt)}</p>
                    </Link>
                    <div className="flex shrink-0 gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => toggle.mutate({ id: item.id, read: !item.read })}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-white hover:text-ink"
                        aria-label={item.read ? 'Mark as unread' : 'Mark as read'}
                        title={item.read ? 'Mark as unread' : 'Mark as read'}
                      >
                        {item.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove.mutate(item.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                        aria-label="Delete notification"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </section>
      ))}

      <Link to="/profile#alerts" className={buttonClass('ghost', 'sm', 'w-fit')}>
        <Settings2 className="h-4 w-4" /> Choose which alerts you get
      </Link>
    </div>
  )
}
