import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  BriefcaseBusiness,
  Eye,
  LoaderCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchPortfolio, fetchStocks, type Portfolio, type Stock } from '../api/axios'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function toNumber(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

export default function Dashboard() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [portfolio, setPortfolio] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const [stocksData, portfolioData] = await Promise.all([
          fetchStocks(),
          fetchPortfolio(),
        ])
        setStocks(stocksData)
        setPortfolio(portfolioData)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to load dashboard data.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [])

  const stats = useMemo(() => {
    const allItems = portfolio.flatMap((entry) => entry.items ?? [])
    const portfolioValue = allItems.reduce(
      (sum, item) => sum + toNumber(item.quantity) * toNumber(item.stock?.current_price),
      0,
    )
    const totalGain = allItems.reduce((sum, item) => {
      const current = toNumber(item.stock?.current_price)
      const buy = toNumber(item.buy_price)
      const quantity = toNumber(item.quantity)
      return sum + (current - buy) * quantity
    }, 0)
    const watchlistCount = stocks.length
    const gainers = stocks.filter((stock) => toNumber(stock.current_price) >= 100).length

    return {
      portfolioValue,
      totalGain,
      watchlistCount,
      insights: `${gainers} momentum names above $100`,
    }
  }, [portfolio, stocks])

  const topStocks = useMemo(
    () =>
      [...stocks]
        .sort((a, b) => toNumber(b.current_price) - toNumber(a.current_price))
        .slice(0, 6),
    [stocks],
  )

  const tickerText = useMemo(
    () =>
      stocks
        .slice(0, 12)
        .map((stock) => `${stock.symbol} ${formatCurrency(toNumber(stock.current_price))}`)
        .join('  •  '),
    [stocks],
  )

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="min-h-screen bg-app px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between rounded-[1.75rem] border border-app-border bg-app-card px-6 py-5">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-app-accent">Dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-app-text">
            Good to see you
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-app-muted">Today</p>
          <p className="mt-1 text-base font-medium text-app-text">{today}</p>
        </div>
      </div>

      <div className="ticker-shell mb-6">
        <div className="ticker-track">
          <span>{tickerText || 'Loading stock tape...'}</span>
          <span aria-hidden="true">{tickerText || 'Loading stock tape...'}</span>
        </div>
      </div>

      {loading ? (
        <div className="panel flex min-h-[320px] items-center justify-center gap-3 text-app-secondary">
          <LoaderCircle className="animate-spin text-app-accent" size={22} />
          <span>Loading dashboard data...</span>
        </div>
      ) : error ? (
        <div className="panel border-app-loss/30 bg-app-loss/10 text-app-loss">{error}</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card">
              <div className="stat-icon">
                <BriefcaseBusiness size={18} />
              </div>
              <p className="stat-label">Portfolio Value</p>
              <p className="stat-value">{formatCurrency(stats.portfolioValue)}</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <ArrowUpRight size={18} />
              </div>
              <p className="stat-label">Total Gain</p>
              <p
                className={`stat-value ${
                  stats.totalGain >= 0 ? 'text-app-gain' : 'text-app-loss'
                }`}
              >
                {formatCurrency(stats.totalGain)}
              </p>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Eye size={18} />
              </div>
              <p className="stat-label">Watchlist</p>
              <p className="stat-value">{stats.watchlistCount}</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <BrainCircuit size={18} />
              </div>
              <p className="stat-label">AI Insights</p>
              <p className="mt-2 text-sm leading-6 text-app-secondary">{stats.insights}</p>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="panel">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-app-muted">Market leaders</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-app-text">
                    Top Stocks
                  </h2>
                </div>
                <Activity className="text-app-accent" size={20} />
              </div>

              <div className="mt-6 space-y-3">
                {topStocks.map((stock) => (
                  <div
                    key={stock.id}
                    className="flex items-center justify-between rounded-2xl border border-app-border bg-white/5 px-4 py-4"
                  >
                    <div>
                      <p className="text-base font-semibold text-app-text">{stock.symbol}</p>
                      <p className="mt-1 text-sm text-app-secondary">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-app-text">
                        {formatCurrency(toNumber(stock.current_price))}
                      </p>
                      <p className="mt-1 text-sm text-app-muted">
                        {stock.exchange || 'Exchange N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <p className="text-sm uppercase tracking-[0.24em] text-app-muted">Highlights</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-app-text">
                Quick Market Read
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-app-border bg-white/5 p-4">
                  <p className="text-sm text-app-muted">Highest priced stock</p>
                  <p className="mt-2 text-xl font-semibold text-app-text">
                    {topStocks[0]?.symbol ?? 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-white/5 p-4">
                  <p className="text-sm text-app-muted">Sectors tracked</p>
                  <p className="mt-2 text-xl font-semibold text-app-text">
                    {new Set(stocks.map((stock) => stock.sector || 'Unknown')).size}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-white/5 p-4">
                  <p className="text-sm text-app-muted">Tracked symbols</p>
                  <p className="mt-2 text-xl font-semibold text-app-text">{stocks.length}</p>
                </div>
                <div className="rounded-2xl border border-app-border bg-white/5 p-4">
                  <p className="text-sm text-app-muted">Portfolio groups</p>
                  <p className="mt-2 text-xl font-semibold text-app-text">{portfolio.length}</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
