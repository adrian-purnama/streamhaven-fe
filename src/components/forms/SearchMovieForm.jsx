import { useState } from 'react'
import toast from 'react-hot-toast'
import apiHelper from '../../helper/apiHelper'
import SearchableDropdown from '../SearchableDropdown'

const MEDIA_TYPE_OPTIONS = [
  { value: 'movie', label: 'Movie' },
  { value: 'tv', label: 'TV / Series' },
]

function SeasonsCollapsible({ seasons, number_of_seasons }) {
  const [open, setOpen] = useState(false)
  const list = Array.isArray(seasons) ? seasons : []
  if (list.length === 0) return null
  return (
    <div className="mt-3 border border-gray-600 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2 flex items-center justify-between bg-gray-700/50 text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        <span className="font-medium">
          Seasons ({number_of_seasons ?? list.length})
        </span>
        <span className="text-gray-400">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="p-3 bg-gray-800/50 flex flex-wrap gap-3">
          {list.map((s) => (
            <div
              key={s.season_number}
              className="flex flex-col items-center gap-1 text-center w-24 shrink-0"
            >
              {s.poster_url ? (
                <img
                  src={s.poster_url}
                  alt={s.name}
                  className="w-20 h-28 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-28 rounded bg-gray-700" />
              )}
              <span className="text-xs text-gray-300 truncate w-full" title={s.name}>
                {s.name}
              </span>
              <span className="text-xs text-gray-500">
                {s.episode_count ?? 0} ep{s.episode_count !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
  const [mediaType, setMediaType] = useState('movie')
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e?.preventDefault()
    const value = (input || '').trim()
    if (!value) {
      toast.error('Enter an IMDB id (e.g. tt0137523) or TMDB id (e.g. 550)')
      return
    }
    const idType = getIdType(value)
    const baseParams = idType === 'tmdb' ? { tmdb_id: value } : { imdb_id: value }
    baseParams.type = mediaType
    setLoading(true)
    setMovie(null)
    if (typeof onMovieSelect === 'function') onMovieSelect(null)
    try {
      const res = await apiHelper.get('/api/movies/top-pick', { params: baseParams })
      const data = res.data?.data ?? null
      setMovie(data)
      if (typeof onMovieSelect === 'function') onMovieSelect(data)
      if (data) toast.success(data.mediaType === 'tv' ? 'Series found' : 'Movie found')
      else toast.error('Nothing found for this ID')
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
        <div className="w-36 shrink-0">
          <SearchableDropdown
            options={MEDIA_TYPE_OPTIONS}
            valueKey="value"
            labelKey="label"
            value={mediaType}
            onChange={setMediaType}
            placeholder="Type"
          />
        </div>
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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-100">{movie.title ?? movie.name}</h3>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  movie.mediaType === 'tv'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {movie.mediaType === 'tv' ? 'Series' : 'Movie'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {(movie.release_date || movie.first_air_date) && new Date(movie.release_date || movie.first_air_date).getFullYear()}
              {movie.vote_average != null && ` · ${Number(movie.vote_average).toFixed(1)}`}
              {movie.id != null && ` · TMDB ${movie.id}`}
            </p>
            {movie.overview && (
              <p className="text-gray-400 text-sm mt-2 line-clamp-5">{movie.overview}</p>
            )}
            {movie.mediaType === 'tv' && (
              <SeasonsCollapsible
                seasons={movie.seasons}
                number_of_seasons={movie.number_of_seasons}
              />
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
