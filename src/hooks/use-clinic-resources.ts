import { useEffect, useState } from 'react'
import { getDoctors, getRooms } from '@/lib/api'

export interface ClinicRoom { id: number; name: string; type: string; status: string }
export interface ClinicDoctor { id: number; name: string; email?: string }
export function useClinicResources() {
  const [rooms, setRooms] = useState<ClinicRoom[]>([])
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [rooms, doctors] = await Promise.all([getRooms(), getDoctors()])
        if (!cancelled) { setRooms(rooms); setDoctors(doctors); setError('') }
      } catch (err) { if (!cancelled) setError((err as Error).message) }
      finally { if (!cancelled) setLoading(false) }
    }
    void load(); const timer = setInterval(load, 10000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [reloadKey])
  const reload = () => { setLoading(true); setReloadKey(key => key + 1) }
  return { rooms, doctors, error, loading, reload }
}
