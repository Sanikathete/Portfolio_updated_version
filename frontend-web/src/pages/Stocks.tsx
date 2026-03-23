import { ChevronLeft, ChevronRight, LoaderCircle, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchStocks, type Stock } from '../api/axios'

const PAGE_SIZE = 20

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

export default function Stocks() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function loadStocks() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchStocks()
        setStocks(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to fetch stocks.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadStocks()
  }, [])

  const sectors = useMemo(
    () => ['All', ...new Set(stocks.map((stock) => stock.sector || 'Unknown'))],
    [stocks],
  )

  const filteredStocks = useMemo(() => {
    const query = search.trim().toLowerCase()

    return stocks.filter((stock) => {
      const matchesSearch =
        !query ||
        stock.name.toLowerCase().includes(query) ||
        stock.symbol.toLowerCase().includes(query)

      const stockSector = stock.sector || 'Unknown'
      const matchesSector = sector === 'All' || stockSector === sector

      return matchesSearch && matchesSector
    })
  }, [search, sector, stocks])

  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / PAGE_SIZE))

  const currentPageStocks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredStocks.slice(start, start + PAGE_SIZE)
  }, [filteredStocks, page])

  useEffect(() => {
    setPage(1)
  }, [search, sector])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  return (
    <div className="min-h-screen bg-app px-4 py-4 sm:px-6 lg:px-8">
      <div className="panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-app-accent">Stocks</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-app-text">
              Market Directory
            </h1>
            <p className="mt-2 text-app-secondary">
              Search by company name or ticker, then narrow by sector.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.2fr_220px]">
            <label className="relative block">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-app-muted"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or symbol"
                className="input-field pl-11"
              />
            </label>

            <select
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              className="input-field appearance-none"
            >
              {sectors.map((sectorOption) => (
                <option key={sectorOption} value={sectorOption}>
                  {sectorOption}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center gap-3 text-app-secondary">
            <LoaderCircle className="animate-spin text-app-accent" size={22} />
            <span>Loading stocks...</span>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-app-loss/30 bg-app-loss/10 px-4 py-3 text-sm text-app-loss">
            {error}
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-app-border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-app-border">
                  <thead className="bg-white/5">
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-app-muted">
                      <th className="px-5 py-4">Symbol</th>
                      <th className="px-5 py-4">Name</th>
                      <th className="px-5 py-4">Sector</th>
                      <th className="px-5 py-4">Exchange</th>
                      <th className="px-5 py-4">Current Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border bg-app-card/60">
                    {currentPageStocks.map((stock) => {
                      const price = toNumber(stock.current_price)
                      const isUp = price >= 0

                      return (
                        <tr key={stock.id} className="text-sm text-app-secondary">
                          <td className="px-5 py-4 font-semibold text-app-text">{stock.symbol}</td>
                          <td className="px-5 py-4">{stock.name}</td>
                          <td className="px-5 py-4">{stock.sector || 'Unknown'}</td>
                          <td className="px-5 py-4">{stock.exchange || 'N/A'}</td>
                          <td
                            className={`px-5 py-4 font-semibold ${
                              isUp ? 'text-app-gain' : 'text-app-loss'
                            }`}
                          >
                            {formatCurrency(price)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredStocks.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-app-border bg-white/5 px-4 py-8 text-center text-app-secondary">
                No stocks matched your search.
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-app-secondary">
                Showing {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(page * PAGE_SIZE, filteredStocks.length)} of {filteredStocks.length}{' '}
                stocks
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="pagination-button"
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>
                <span className="rounded-xl border border-app-border px-4 py-2 text-sm text-app-text">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="pagination-button"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
