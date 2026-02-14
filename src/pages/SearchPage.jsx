import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiHelper from '../helper/apiHelper'
import MultiSearch from '../components/MultiSearch'
import Poster from '../components/Poster'
import PosterGrid from '../components/PosterGrid'
import Person from '../components/Person'

const RESULTS_PER_PAGE = 20

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const [includeAdult, setIncludeAdult] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  const setPage = (newPage) => {
    const next = Math.max(1, Math.min(totalPages, newPage))
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      if (next === 1) nextParams.delete('page')
      else nextParams.set('page', String(next))
      return nextParams
    })
  }

  useEffect(() => {
    const trimmed = q.trim()
    if (!trimmed) {
      queueMicrotask(() => {
        setResults([])
        setError(null)
        setLoading(false)
        setTotalPages(1)
        setTotalResults(0)
      })
      return
    }

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      setError(null)
    })

    apiHelper
      .post(`/api/movies/search/${encodeURIComponent(trimmed)}/${includeAdult}/${page}`)
      .then((res) => {
        if (cancelled) return
        const data = res.data?.data ?? []
        console.log(res.data)
        setResults(Array.isArray(data) ? data : [])
        setTotalPages(Math.max(1, res.data?.total_pages ?? 1))
        setTotalResults(res.data?.total_results ?? 0)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.response?.data?.message || err.message || 'Failed to search')
        setResults([])
        setTotalPages(1)
        setTotalResults(0)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [q, includeAdult, page])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [page])

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col gap-3">
          <MultiSearch />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-[2rem] font-bold text-gray-100">Search</h1>
              {q ? (
                <p className="text-gray-400 text-sm">Results for “{q}”</p>
              ) : (
                <p className="text-gray-400 text-sm">
                  Search your favorite movies, TV shows, and people.
                </p>
              )}
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                checked={includeAdult}
                onChange={(e) => setIncludeAdult(e.target.checked)}
              />
              <span>Include adult results</span>
            </label>
          </div>
        </div>

        {loading && (
          <p className="text-gray-400 text-sm mt-4">Searching…</p>
        )}

        {error && !loading && (
          <p className="text-red-400 text-sm mt-4">{error}</p>
        )}

        {!loading && !error && q.trim() && results.length === 0 && (
          <p className="text-gray-500 text-sm mt-4">No results found.</p>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="mt-4 space-y-6">
            <div>
              <h2 className="text-[1.5rem] font-semibold mb-4">Movies & TV</h2>
                <PosterGrid>
                  {results
                    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
                    .map((item) => (
                      <Poster
                        key={`${item.media_type}-${item.id}`}
                        movie={{ ...item, externalId: item.id }}
                        size="sm"
                        mediaType={item.media_type}
                        className="shrink-0"
                      />
                    ))}
                </PosterGrid>
            </div>

            <div>
              <h2 className="text-[1.5rem] font-semibold mb-4">People</h2>
              {results.filter((item) => item.media_type === 'person').length === 0 ? (
                <p className="text-gray-500 text-sm">No people found.</p>
              ) : (
                <PosterGrid>
                  {results
                    .filter((item) => item.media_type === 'person')
                    .map((person) => (
                        <Person key={person.id} person={person} />
                    ))}
                </PosterGrid>
                
              )}
            </div>

            <div className="flex flex-col items-center justify-center gap-2 pt-6 pb-2 text-center">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * RESULTS_PER_PAGE + 1}–
                {totalResults === 0 ? 0 : (page - 1) * RESULTS_PER_PAGE + results.length} of {totalResults} results
              </p>
              <p className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Previous
                </button>
                <span className="px-2 text-gray-500 text-sm">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
