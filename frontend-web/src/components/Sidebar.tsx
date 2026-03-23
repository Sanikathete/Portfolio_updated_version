import { CalendarDays, LayoutDashboard, LogOut, PieChart, TrendingUp } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

type SidebarProps = {
  username: string
  onLogout: () => void
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/stocks', label: 'Stocks', icon: TrendingUp },
  { to: '/portfolio', label: 'Portfolio', icon: PieChart },
]

export default function Sidebar({ username, onLogout }: SidebarProps) {
  const navigate = useNavigate()

  return (
    <aside className="hidden w-72 shrink-0 border-r border-app-border bg-app-card/80 backdrop-blur xl:flex xl:flex-col">
      <div className="border-b border-app-border px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-accent/15 text-app-accent shadow-glow">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-app-text">
              StockSphere
            </p>
            <p className="text-sm text-app-muted">Market intelligence workspace</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="rounded-2xl border border-app-border bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-app-muted">Welcome back</p>
          <p className="mt-2 text-lg font-semibold text-app-text">{username}</p>
          <div className="mt-3 flex items-center gap-2 text-sm text-app-secondary">
            <CalendarDays size={16} />
            <span>Stocks, signals, and portfolio views</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-3">
        <div className="space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'border border-app-accent/40 bg-app-accent/12 text-app-text shadow-glow'
                    : 'border border-transparent text-app-secondary hover:border-app-border hover:bg-white/5 hover:text-app-text'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-app-border p-4">
        <button
          type="button"
          onClick={() => {
            onLogout()
            navigate('/login')
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-app-border bg-white/5 px-4 py-3 text-sm font-medium text-app-text transition hover:border-app-accent/40 hover:bg-app-accent/10"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  )
}
