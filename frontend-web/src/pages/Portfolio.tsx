import { Download, FileDown, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { downloadReport, fetchPortfolio, type PortfolioItem } from '../api/axios'

function toNumber(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export default function Portfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [downloading, setDownloading] = useState<'pdf' | 'csv' | null>(null)

  useEffect(() => {
    async function loadPortfolio() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchPortfolio()
        const flattenedItems = data.flatMap((portfolio) => portfolio.items ?? [])
        setItems(flattenedItems)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to load portfolio data.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadPortfolio()
  }, [])

  const totalValue = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + toNumber(item.quantity) * toNumber(item.stock?.current_price),
        0,
      ),
    [items],
  )

  async function handleDownload(type: 'pdf' | 'csv') {
    setDownloading(type)
    setDownloadError('')

    try {
      if (type === 'pdf') {
        await downloadReport('/reports/watchlist/pdf', 'stocksphere-watchlist.pdf')
      } else {
        await downloadReport('/reports/watchlist/csv', 'stocksphere-watchlist.csv')
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Unable to download ${type.toUpperCase()}.`
      setDownloadError(message)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="min-h-screen bg-app px-4 py-4 sm:px-6 lg:px-8">
      <div className="panel">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-app-accent">Portfolio</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-app-text">
              Holdings Overview
            </h1>
            <p className="mt-2 text-app-secondary">
              Review current values and export your watchlist reports.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleDownload('pdf')}
              disabled={downloading !== null}
              className="secondary-action"
            >
              {downloading === 'pdf' ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <FileDown size={16} />
              )}
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => void handleDownload('csv')}
              disabled={downloading !== null}
              className="secondary-action"
            >
              {downloading === 'csv' ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Download CSV
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-app-border bg-white/5 p-5">
          <p className="text-sm text-app-muted">Total portfolio value</p>
          <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-app-text">
            {formatCurrency(totalValue)}
          </p>
        </div>

        {downloadError ? (
          <div className="mt-6 rounded-2xl border border-app-loss/30 bg-app-loss/10 px-4 py-3 text-sm text-app-loss">
            {downloadError}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center gap-3 text-app-secondary">
            <LoaderCircle className="animate-spin text-app-accent" size={22} />
            <span>Loading portfolio...</span>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-app-loss/30 bg-app-loss/10 px-4 py-3 text-sm text-app-loss">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-app-border bg-white/5 px-4 py-10 text-center text-app-secondary">
            No portfolio data yet
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-app-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-app-border">
                <thead className="bg-white/5">
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-app-muted">
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Current Price</th>
                    <th className="px-5 py-4">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border bg-app-card/60">
                  {items.map((item) => {
                    const currentPrice = toNumber(item.stock?.current_price)
                    const value = currentPrice * toNumber(item.quantity)

                    return (
                      <tr key={item.id} className="text-sm text-app-secondary">
                        <td className="px-5 py-4 font-semibold text-app-text">
                          {item.stock?.symbol ?? 'N/A'}
                        </td>
                        <td className="px-5 py-4">{item.stock?.name ?? 'Unknown stock'}</td>
                        <td className="px-5 py-4 text-app-gain">
                          {formatCurrency(currentPrice)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-app-text">
                          {formatCurrency(value)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
