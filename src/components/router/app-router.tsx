"use client"

import { Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { routes, type RouteConfig } from '@/config/routes'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAccountStore } from '@/stores/account-store'

function renderRoutes(routeConfigs: RouteConfig[]) {
  return routeConfigs.map((route, index) => (
    <Route
      key={route.path + index}
      path={route.path}
      element={
        <Suspense fallback={<LoadingSpinner />}>
          {route.element}
        </Suspense>
      }
    >
      {route.children && renderRoutes(route.children)}
    </Route>
  ))
}

export function AppRouter() {
  const token = useAccountStore(s => s.token), location = useLocation()
  if (!token && !location.pathname.startsWith('/auth/')) return <Navigate to="/auth/sign-in" replace state={{ from: location.pathname + location.search }} />
  return (
    <Routes>
      {renderRoutes(routes)}
    </Routes>
  )
}
