import { HIDE, Hospitals, Invoices, Jobs, Plans, Subscriptions } from '../models.js'
import { TRIAL, periodLabel } from '../billing.js'
import { changed } from '../realtime.js'
import { httpError, nowIso, uid } from '../lib/util.js'
import { notify } from './notifications.js'
import type { Hospital, Plan, PlanCode, Subscription } from '../types.js'

export async function activeRequestCount(hospitalId: string) {
  return Jobs.countDocuments({ hospitalId, status: { $in: ['pending_review', 'approved'] } })
}

export async function currentSubscription(hospitalId: string) {
  const subscription = await Subscriptions.findOne({ hospitalId }, HIDE).lean<Subscription>()
  if (subscription && subscription.status !== 'expired' && +new Date(subscription.renewalDate) < Date.now()) {
    await Subscriptions.updateOne({ hospitalId }, { $set: { status: 'expired' } })
    subscription.status = 'expired'
  }
  return subscription
}

export async function assertCanPost(hospitalId: string) {
  const subscription = await currentSubscription(hospitalId)
  if (!subscription) return
  if (subscription.status === 'expired') {
    throw httpError(403, subscription.plan === 'trial' ? 'Your free trial has ended. Choose a plan to keep posting requests.' : 'Your plan has expired. Renew it to keep posting requests.')
  }
  if ((await activeRequestCount(hospitalId)) >= subscription.requestLimit) {
    throw httpError(403, `Your plan allows ${subscription.requestLimit} active requests. Upgrade or close a request first.`)
  }
}

export async function getSubscription(hospitalId: string) {
  const [subscription, plans, activeRequests, hospital] = await Promise.all([
    currentSubscription(hospitalId),
    Plans.find({}, HIDE).sort({ months: 1 }).lean<Plan[]>(),
    activeRequestCount(hospitalId),
    Hospitals.findOne({ id: hospitalId }, { locations: 1 }).lean<Pick<Hospital, 'locations'>>(),
  ])
  return {
    subscription,
    plans,
    trial: TRIAL,
    usage: { activeRequests, locations: hospital?.locations.length || 0 },
  }
}

export async function changePlan(hospitalId: string, code: PlanCode) {
  const [plan, subscription, hospital] = await Promise.all([
    Plans.findOne({ code }, HIDE).lean<Plan>(),
    currentSubscription(hospitalId),
    Hospitals.findOne({ id: hospitalId }, HIDE).lean<Hospital>(),
  ])
  if (!plan) throw httpError(400, 'Choose a valid plan')
  if (!subscription || !hospital) throw httpError(404, 'Subscription not found')
  if (subscription.status === 'active' && subscription.plan === code) throw httpError(409, `${plan.name} is already your active plan`)

  const active = await activeRequestCount(hospitalId)
  if (active > plan.activeRequests) {
    throw httpError(409, `You have ${active} active requests, but ${plan.name} allows ${plan.activeRequests}. Close some requests first.`)
  }
  if (hospital.locations.length > plan.locations) {
    throw httpError(409, `You have ${hospital.locations.length} locations, but ${plan.name} allows ${plan.locations}.`)
  }

  const previousPlan = subscription.plan === 'trial' ? null : await Plans.findOne({ code: subscription.plan }, { name: 1 }).lean()
  const previous = previousPlan ? `${previousPlan.name} plan` : 'the free trial'
  const label = periodLabel(plan.months)
  const now = new Date()
  const end = new Date(now)
  end.setMonth(end.getMonth() + plan.months)

  const next = await Subscriptions.findOneAndUpdate(
    { hospitalId },
    {
      $set: {
        plan: code,
        status: 'active',
        months: plan.months,
        startedAt: now.toISOString(),
        renewalDate: end.toISOString(),
        locationLimit: plan.locations,
        requestLimit: plan.activeRequests,
      },
    },
    { new: true, projection: HIDE },
  ).lean<Subscription>()
  await Hospitals.updateOne({ id: hospitalId }, { $set: { plan: code, renewalDate: end.toISOString() } })
  await Invoices.create({
    id: uid(),
    hospitalId,
    number: `SOS-${1001 + (await Invoices.countDocuments())}`,
    amount: plan.price,
    currency: 'INR',
    status: 'due',
    issuedAt: nowIso(),
    description: `${plan.name} · ${label}`,
  })
  changed(hospitalId, 'subscription', 'billing', 'session')
  await notify(hospitalId, {
    type: 'billing',
    title: `${plan.name} plan is active`,
    body: `Replaced ${previous}. Valid for ${label}.`,
    href: '/subscription',
  })
  return next
}

export async function listBilling(hospitalId: string) {
  return { invoices: await Invoices.find({ hospitalId }, HIDE).sort({ issuedAt: -1 }).lean() }
}
