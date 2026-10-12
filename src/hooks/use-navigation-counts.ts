import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchApi, getPatients, getPayments } from '@/lib/api'
import { useAccountStore } from '@/stores/account-store'

export type NavigationCounts = Partial<Record<string, number>>

export function useNavigationCounts(allowedUrls: string[]): NavigationCounts {
  const [counts, setCounts] = useState<NavigationCounts>({})
  const { pathname } = useLocation()
  const token = useAccountStore(state => state.token)
  const allowedKey = allowedUrls.join('|')

  useEffect(() => {
    let disposed = false
    let refreshing = false
    const allowed = allowedKey.split('|')
    setCounts({})
    const refresh = async () => {
      if (refreshing) return
      refreshing = true
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const todayFrench = now.toLocaleDateString('fr-FR')
      const requests: Array<[string, () => Promise<number>]> = [
        ['/patients', async () => (await getPatients({ page: 1, page_size: 1 })).total],
        ['/chat', async () => (await fetchApi<{ unread: number }>('/messages/unread-count')).unread],
        ['/payments', async () => (await getPayments()).filter(payment => Number(payment.paid_amount) > 0 && (payment.date?.slice(0, 10) === today || payment.date?.slice(0, 10) === todayFrench)).length],
      ]
      await Promise.allSettled(requests.filter(([url]) => allowed.includes(url)).map(async ([url, getCount]) => {
        const count = await getCount()
        if (!disposed) setCounts(previous => ({ ...previous, [url]: count }))
      }))
      refreshing = false
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 15000)
    const onRefresh = () => { void refresh() }
    window.addEventListener('focus', onRefresh)
    window.addEventListener('clinic-data-changed', onRefresh)
    return () => {
      disposed = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onRefresh)
      window.removeEventListener('clinic-data-changed', onRefresh)
    }
  }, [allowedKey, token, pathname])

  return counts
}
