import { useQuery } from '@tanstack/react-query'
import { catalog } from '../services/api'
import type { Catalog } from '../types/domain'

const EMPTY: Catalog = {
  roles: [],
  supportTopics: [],
  faqs: [],
  supportContact: { email: '', phone: '', hours: '' },
  payoutMethods: [],
  documentRequests: [],
  documentRejectReasons: [],
}

export function useCatalog() {
  const query = useQuery({ queryKey: ['catalog'], queryFn: catalog, staleTime: 5 * 60_000 })
  const data = query.data
  return {
    ...EMPTY,
    ...data,
    roles: data?.roles || EMPTY.roles,
    supportTopics: data?.supportTopics || EMPTY.supportTopics,
    faqs: data?.faqs || EMPTY.faqs,
    supportContact: data?.supportContact || EMPTY.supportContact,
    payoutMethods: data?.payoutMethods || EMPTY.payoutMethods,
    documentRequests: data?.documentRequests || EMPTY.documentRequests,
    documentRejectReasons: data?.documentRejectReasons || EMPTY.documentRejectReasons,
    ready: Boolean(data),
  }
}

export function useRoleOptions(hospital: { customRoles?: string[] }) {
  const { roles } = useCatalog()
  return [...roles, ...(hospital.customRoles || []).filter((item) => !roles.includes(item))]
}
