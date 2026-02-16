import { useState } from 'react'
import toast from 'react-hot-toast'
import apiHelper from '../../helper/apiHelper'

/**
 * Detect if input looks like IMDB id (tt...) or TMDB id (numeric).
 */
function getIdType(value) {
  const s = String(value || '').trim()
  if (!s) return null
  if (s.toLowerCase().startsWith('tt')) return 'imdb'
  if (/^\d+$/.test(s)) return 'tmdb'
  return 'imdb' // default treat as imdb for partial paste
}

const SearchMovieForm = ({ placeholder, renderActions, description, onMovieSelect }) => {
  const [input, setInput] = useState('')
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e?.preventDefault()
    const value = (input || '').trim()
    if (!value) {
      toast.error('Enter an IMDB id (e.g. tt0137523) or TMDB id (e.g. 550)')
      return
    }
    const type = getIdType(value)
    setLoading(true)
    setMovie(null)
    if (typeof onMovieSelect === 'function') onMovieSelect(null)
    try {
      const params = type === 'tmdb' ? { tmdb_id: value } : { imdb_id: value }
      const res = await apiHelper.get('/api/movies/top-pick', { params })
      const data = res.data?.data ?? null
      setMovie(data)
      if (typeof onMovieSelect === 'function') onMovieSelect(data)
      if (data) toast.success('Movie found')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lookup failed')
      setMovie(null)
      if (typeof onMovieSelect === 'function') onMovieSelect(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {description && <p className="text-gray-400 text-sm">{description}</p>}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-center">
        <label htmlFor="search-movie-id" className="sr-only">IMDB or TMDB id</label>
        <input
          id="search-movie-id"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder ?? 'IMDB (tt0137523) or TMDB (550)'}
          className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {loading && <div className="py-6 text-center text-gray-400">Loading…</div>}

      {!loading && movie && (
        <div className="flex gap-4 flex-wrap pt-4 border-t border-gray-700">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt=""
              className="w-32 h-48 object-cover rounded shrink-0"
            />
          ) : (
            <div className="w-32 h-48 rounded bg-gray-700 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-100">{movie.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {movie.release_date && new Date(movie.release_date).getFullYear()}
              {movie.vote_average != null && ` · ${Number(movie.vote_average).toFixed(1)}`}
              {movie.id != null && ` · TMDB ${movie.id}`}
            </p>
            {movie.overview && (
              <p className="text-gray-400 text-sm mt-2 line-clamp-5">{movie.overview}</p>
            )}
            {typeof renderActions === 'function' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {renderActions(movie)}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !movie && input.trim() && (
        <p className="text-gray-500 text-sm">Enter an IMDB or TMDB id and click Search.</p>
      )}
    </div>
  )
}

export default SearchMovieForm
