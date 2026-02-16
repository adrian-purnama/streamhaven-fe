import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiHelper from '../helper/apiHelper'
import Top10Popular from '../components/Top10Popular'
import Poster from '../components/Poster'
import PosterGrid from '../components/PosterGrid'
import InfiniteTicker from '../components/InfiniteTicker'
import FeedbackModal from '../components/FeedbackModal'
import { usePreferences } from '../context/PreferencesContext'

const TOP_N = 10

const MOVIE_ROWS = [
  { key: 'top_pick', title: 'Top pick', showAll: false },
  { key: 'popular', title: 'Popular', showAll: true },
  { key: 'top_rated', title: 'Top rated', showAll: true },
  { key: 'now_playing', title: 'Now playing', showAll: true },
]

const TV_ROWS = [
  { key: 'now_playing', title: 'On the air', showAll: true },
  { key: 'popular', title: 'Popular', showAll: true },
  { key: 'top_rated', title: 'Top rated', showAll: true },
]

const emptyMovies = { now_playing: [], popular: [], top_rated: [], top_pick: [] }
const emptyTv = { now_playing: [], popular: [], top_rated: [] }

export default function HomePage() {
  const { preferences } = usePreferences()
  const [activeTab, setActiveTab] = useState('movies')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [movieData, setMovieData] = useState(emptyMovies)
  const [tvData, setTvData] = useState(emptyTv)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMovies = useCallback(async () => {
    try {
      const res = await apiHelper.get('/api/movies')
      const raw = res.data?.data
      const normalized =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? {
              ...emptyMovies,
              now_playing: Array.isArray(raw.now_playing) ? raw.now_playing : [],
              popular: Array.isArray(raw.popular) ? raw.popular : [],
              top_rated: Array.isArray(raw.top_rated) ? raw.top_rated : [],
              top_pick: Array.isArray(raw.top_pick) ? raw.top_pick : [],
            }
          : emptyMovies
      setMovieData(normalized)
    } catch (err) {
      setMovieData(emptyMovies)
      throw err
    }
  }, [])

  const fetchTv = useCallback(async () => {
    try {
      const res = await apiHelper.get('/api/tv')
      const raw = res.data?.data
      const normalized =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? {
              ...emptyTv,
              now_playing: Array.isArray(raw.now_playing) ? raw.now_playing : [],
              popular: Array.isArray(raw.popular) ? raw.popular : [],
              top_rated: Array.isArray(raw.top_rated) ? raw.top_rated : [],
            }
          : emptyTv
      setTvData(normalized)
    } catch (err) {
      setTvData(emptyTv)
      throw err
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([fetchMovies(), fetchTv()])
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [fetchMovies, fetchTv])

  const data = activeTab === 'movies' ? movieData : tvData
  const baseRows = activeTab === 'movies' ? MOVIE_ROWS : TV_ROWS
  const rows = preferences.showTopPickOnHome
    ? baseRows
    : baseRows.filter((row) => row.key !== 'top_pick')
  const popularTop10 = movieData.popular.slice(0, TOP_N)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Top10Popular movies={popularTop10} loading={loading} error={error} />

      <div className='mt-[5rem] sm:mt-[0rem] md:mt-[16rem] xl:mt-[2rem]'>

        {preferences.showPromoTicker !== false && (
          <>
            <InfiniteTicker
              className="py-2.5 bg-amber-800/30 border-y border-amber-500/30 text-gray-300 text-sm font-bold"
              duration={250}
              repeatPerCopy={12}
            >
              <span className="text-amber-400/90 font-bold">✨ Log in for no ads</span>
              <span className="text-gray-500">·</span>
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="bg-transparent border-none p-0 text-inherit font-inherit cursor-pointer hover:text-amber-400 transition-colors"
              >
                Give Feedback Or Request AD Free Movie
              </button>
              <span className="text-gray-500">·</span>
              <span>You can turn this off in Settings if you have an account</span>
              <span className="text-gray-500">·</span>
            </InfiniteTicker>
            <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
          </>
        )}

        <div className="px-4 md:px-6 lg:px-8 py-4 space-y-8">
          <div className="relative z-10 flex flex-wrap items-center gap-3 mb-2 md:mx-[5rem]">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('movies')}
                className={`cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'movies'
                    ? 'bg-amber-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Movies
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tv')}
                className={`cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'tv'
                    ? 'bg-amber-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                TV
              </button>
            </div>
            {loading && (
              <span className="text-gray-500 text-sm flex items-center gap-2" aria-live="polite">
                <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-amber-500 rounded-full animate-spin" aria-hidden />
                Loading…
              </span>
            )}
          </div>
      </div>


        {rows.map(({ key, title, showAll }) => {
          const list = data[key] ?? []
          if (!Array.isArray(list) || list.length === 0) return null
          const basePath = activeTab === 'movies' ? '/movie' : '/tv'
          return (
            <section
              key={`${activeTab}-${key}`}
              className="md:mx-[5rem] py-8 border-b border-gray-500/50 last:border-b-0 mx-4"
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-[2rem] font-semibold">{title.toUpperCase()}</h2>
                {showAll && (
                  <Link
                    to={`${basePath}/${key}?page=1`}
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
                    mediaType={activeTab === 'movies' ? 'movie' : 'tv'}
                  />
                ))}
              </PosterGrid>
            </section>
          )
        })}
      </div>
    </div>
  )
}
