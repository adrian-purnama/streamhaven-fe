import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import apiHelper from '../helper/apiHelper'
import Poster from '../components/Poster'
import PosterGrid from '../components/PosterGrid'

const CATEGORIES = [
  { key: 'now_playing', title: 'On the air', showAll: true },
  { key: 'popular', title: 'Popular', showAll: true },
  { key: 'top_rated', title: 'Top rated', showAll: true },
]

const emptyData = { now_playing: [], popular: [], top_rated: [] }

export default function TvPage() {
  const { category } = useParams()
  const [searchParams] = useSearchParams()
  const pageFromUrl = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  const [tvData, setTvData] = useState(emptyData)
  const [categoryResults, setCategoryResults] = useState([])
  const [categoryTotalPages, setCategoryTotalPages] = useState(0)
  const [categoryTotalResults, setCategoryTotalResults] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isCategoryView = Boolean(category && ['now_playing', 'popular', 'top_rated'].includes(category))

  const fetchAllCategories = useCallback(async () => {
    try {
      const res = await apiHelper.get('/api/tv')
      const raw = res.data?.data
      const normalized =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? {
              ...emptyData,
              now_playing: Array.isArray(raw.now_playing) ? raw.now_playing : [],
              popular: Array.isArray(raw.popular) ? raw.popular : [],
              top_rated: Array.isArray(raw.top_rated) ? raw.top_rated : [],
            }
          : emptyData
      setTvData(normalized)
    } catch (err) {
      setTvData(emptyData)
      throw err
    }
  }, [])

  const fetchCategoryPage = useCallback(
    async (cat, page) => {
      const res = await apiHelper.get(`/api/tv/${cat}`, { params: { page } })
      const data = res.data?.data ?? {}
      setCategoryResults(Array.isArray(data.results) ? data.results : [])
      setCategoryTotalPages(data.total_pages ?? 0)
      setCategoryTotalResults(data.total_results ?? 0)
    },
    []
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        if (isCategoryView) {
          await fetchCategoryPage(category, pageFromUrl)
        } else {
          await fetchAllCategories()
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [isCategoryView, category, pageFromUrl, fetchAllCategories, fetchCategoryPage])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pageFromUrl])

  if (isCategoryView) {
    const categoryTitle = CATEGORIES.find((c) => c.key === category)?.title ?? category
    return (
      <div className="min-h-screen bg-gray-900 text-white px-4 py-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/tv" className="text-gray-400 hover:text-white text-sm">
            ← TV
          </Link>
          <h1 className="text-2xl font-bold">{categoryTitle}</h1>
        </div>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">
              Page {pageFromUrl} of {categoryTotalPages || 1} · {categoryTotalResults} result
              {categoryTotalResults !== 1 ? 's' : ''}
            </p>
            <PosterGrid>
              {categoryResults.map((item) => (
                <Poster
                  key={item.id ?? item._id}
                  movie={{ ...item, externalId: item.id ?? item.externalId, title: item.name ?? item.title }}
                  size="md"
                  mediaType="tv"
                  className="shrink-0"
                />
              ))}
            </PosterGrid>
            {categoryTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Link
                  to={`/tv/${category}?page=${Math.max(1, pageFromUrl - 1)}`}
                  className={`px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors ${
                    pageFromUrl <= 1 ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  Previous
                </Link>
                <span className="px-4 py-2 text-gray-400">
                  {pageFromUrl} / {categoryTotalPages}
                </span>
                <Link
                  to={`/tv/${category}?page=${Math.min(categoryTotalPages, pageFromUrl + 1)}`}
                  className={`px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors ${
                    pageFromUrl >= categoryTotalPages ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  Next
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">TV</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-10">
          {CATEGORIES.map(({ key, title, showAll }) => {
            const list = tvData[key] ?? []
            if (!Array.isArray(list) || list.length === 0) return null
            return (
              <section key={key} className="border-b border-gray-700/50 pb-10 last:border-b-0">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-semibold">{title}</h2>
                  {showAll && (
                    <Link
                      to={`/tv/${key}?page=1`}
                      className="text-amber-500 hover:text-amber-400 text-sm font-medium shrink-0"
                    >
                      Show all
                    </Link>
                  )}
                </div>
                <PosterGrid>
                  {list.map((m, i) => (
                    <Poster
                      key={m._id ?? m.externalId ?? m.id ?? `${key}-${i}`}
                      movie={m}
                      size="md"
                      mediaType="tv"
                      className="shrink-0"
                    />
                  ))}
                </PosterGrid>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
