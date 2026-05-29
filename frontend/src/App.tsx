import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import LandingPage from "./pages/LandingPage"
import DashboardPage from "./pages/DashboardPage"
import PipelinePage from "./pages/PipelinePage"
import AssistantPage from "./pages/AssistantPage"
import SettingsPage from "./pages/SettingsPage"
import { AppLayout } from "./components/layout/AppLayout"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token")
  if (!token) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
