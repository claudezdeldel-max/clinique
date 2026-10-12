import { useEffect, useRef } from 'react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { useAccountStore } from '@/stores/account-store'

export default function FinancePage() {
  const frame = useRef<HTMLIFrameElement>(null)
  const token = useAccountStore(state => state.token)

  useEffect(() => {
    const refresh = () => frame.current?.contentWindow?.postMessage({ type: 'finance-refresh' }, window.location.origin)
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'finance-data-changed') window.dispatchEvent(new Event('clinic-data-changed'))
    }
    window.addEventListener('message', onMessage)
    window.addEventListener('clinic-data-changed', refresh)
    refresh()
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('clinic-data-changed', refresh)
    }
  }, [token])

  return <BaseLayout>
    <div className="-my-4 md:-my-6">
      <iframe ref={frame} src="/finance-reference.html" title="Finance et Comptabilité" className="block w-full border-0" style={{ height: 'calc(100dvh - 72px)', minHeight: 620 }} />
    </div>
  </BaseLayout>
}
