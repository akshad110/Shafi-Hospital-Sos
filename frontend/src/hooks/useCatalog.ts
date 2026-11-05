import { useQuery } from '@tanstack/react-query'
import { catalog } from '../services/api'
import type { Catalog } from '../types/domain'

const EMPTY: Catalog = {
  roles: [],
  supportTopics: [],
  faqs: [],
  supportContact: { email: '', phone: '', hours: '' },
  payoutMethods: [],
}

export function useCatalog() {
  const query = useQuery({ queryKey: ['catalog'], queryFn: catalog, staleTime: 5 * 60_000 })
  return { ...(query.data || EMPTY), ready: Boolean(query.data) }
}

export function useRoleOptions(hospital: { customRoles?: string[] }) {
  const { roles } = useCatalog()
  return [...roles, ...(hospital.customRoles || []).filter((item) => !roles.includes(item))]
}
