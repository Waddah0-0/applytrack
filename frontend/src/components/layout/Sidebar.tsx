import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { LayoutDashboard, Columns, MessageSquareText, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Columns, label: "Pipeline Board", href: "/pipeline" },
  { icon: MessageSquareText, label: "Response Assistant", href: "/assistant" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/tracker/clear')
    } catch (e) {
      console.error("Failed to clear tracker on logout", e)
    }
    localStorage.removeItem("token")
    navigate("/")
  }

  return (
    <aside className="w-[260px] hidden md:flex flex-col border-r border-white/5 bg-surface-glass backdrop-blur-2xl h-screen sticky top-0 z-40">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-brand-indigo flex items-center justify-center shadow-pulse-glow shrink-0">
          <svg className="w-4 h-4 text-black" viewBox="0 0 48 46" fill="currentColor">
            <path d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
          </svg>
        </div>
        <span className="font-bold text-xl tracking-tight text-white">APPLY<span className="text-primary font-light">TRACK</span></span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link key={item.href} to={item.href}>
              <span className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group overflow-hidden",
                isActive ? "text-primary" : "text-slate-400 hover:text-white hover:bg-white/5"
              )}>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-lg"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                )}
                <item.icon className="w-5 h-5 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
