import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="ambient-glow top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Sidebar />
      <main className="flex-1 relative z-10 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
