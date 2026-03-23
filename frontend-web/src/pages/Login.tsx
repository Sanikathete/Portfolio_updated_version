import { LoaderCircle, TrendingUp } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../api/axios'
import { isAuthenticated, setStoredAuth } from '../api/config'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await loginUser(username, password)
      const accessToken = data.access ?? data.token

      if (!accessToken) {
        throw new Error('No access token was returned by the server.')
      }

      setStoredAuth({ accessToken, username, password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,165,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.10),_transparent_30%)]" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-app-border bg-app-card/90 shadow-panel lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden border-r border-app-border bg-[linear-gradient(160deg,rgba(34,211,165,0.14),rgba(10,15,30,0.2)_42%,rgba(10,15,30,0.9))] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3 text-app-text">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-accent/15 text-app-accent shadow-glow">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="font-display text-3xl font-semibold tracking-tight">StockSphere</p>
              <p className="text-sm text-app-secondary">Trade with clarity</p>
            </div>
          </div>

          <div className="space-y-5">
            <p className="max-w-md font-display text-5xl font-semibold leading-tight text-app-text">
              One dashboard for your market pulse, positions, and next move.
            </p>
            <p className="max-w-lg text-base leading-7 text-app-secondary">
              Sign in to monitor live stock data, review your portfolio, and export
              market snapshots in a few clicks.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border border-app-border bg-white/5 p-4">
              <p className="text-app-muted">Signals</p>
              <p className="mt-2 text-xl font-semibold text-app-text">24/7</p>
            </div>
            <div className="rounded-2xl border border-app-border bg-white/5 p-4">
              <p className="text-app-muted">Exports</p>
              <p className="mt-2 text-xl font-semibold text-app-text">PDF / CSV</p>
            </div>
            <div className="rounded-2xl border border-app-border bg-white/5 p-4">
              <p className="text-app-muted">Insights</p>
              <p className="mt-2 text-xl font-semibold text-app-text">AI-ready</p>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10">
              <p className="text-sm uppercase tracking-[0.24em] text-app-accent">Secure Login</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-app-text">
                Welcome back
              </h1>
              <p className="mt-3 text-base text-app-secondary">
                Use your StockSphere credentials to continue.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-app-text">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="input-field"
                  placeholder="Enter your username"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-app-text">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input-field"
                  placeholder="Enter your password"
                  required
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-app-loss/30 bg-app-loss/10 px-4 py-3 text-sm text-app-loss">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-accent px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <LoaderCircle size={18} className="animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
