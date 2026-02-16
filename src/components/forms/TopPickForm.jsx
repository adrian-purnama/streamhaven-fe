import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import apiHelper from '../../helper/apiHelper'
import SearchMovieForm from './SearchMovieForm'

const TopPickForm = () => {
  const [saving, setSaving] = useState(false)
  const [topPicks, setTopPicks] = useState([])
  const [topPicksLoading, setTopPicksLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const fetchTopPicks = useCallback(async () => {
    setTopPicksLoading(true)
    try {
      const res = await apiHelper.get('/api/movies', { params: { category: 'top_pick' } })
      setTopPicks(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load top picks')
      setTopPicks([])
    } finally {
      setTopPicksLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTopPicks()
  }, [fetchTopPicks])

  const handleInsert = async (movie) => {
    if (!movie?.id) return
    setSaving(true)
    try {
      await apiHelper.post('/api/movies/top-pick', { tmdb_id: movie.id })
      toast.success('Saved as top pick in cache')
      fetchTopPicks()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Insert failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (movieId) => {
    setDeletingId(movieId)
    try {
      await apiHelper.delete(`/api/movies/top-pick/${movieId}`)
      toast.success('Top pick removed')
      fetchTopPicks()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4">
      <SearchMovieForm
        description="Look up a movie by IMDB or TMDB id, then insert it into the cache as top pick."
        renderActions={(movie) => (
          <button
            type="button"
            onClick={() => handleInsert(movie)}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-gray-600 text-gray-100 font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Insert to cache'}
          </button>
        )}
      />

      {topPicksLoading && topPicks.length === 0 && (
        <div className="py-6 text-center text-gray-400 text-sm mt-6">Loading cached top picks…</div>
      )}

      {!topPicksLoading && topPicks.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-gray-400 mt-6 mb-2">Cached top picks</h3>
          <ul className="divide-y divide-gray-700 border-t border-gray-700">
            {topPicks.map((m) => (
              <li key={m._id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-700/30">
                {m.poster_url ? (
                  <img
                    src={m.poster_url}
                    alt=""
                    className="w-12 h-18 object-cover rounded shrink-0"
                  />
                ) : (
                  <div className="w-12 h-18 rounded bg-gray-700 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-100 truncate">{m.title}</p>
                  <p className="text-xs text-gray-500">
                    {m.release_date && new Date(m.release_date).getFullYear()}
                    {m.vote_average != null && ` · ${m.vote_average.toFixed(1)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(m._id)}
                  disabled={deletingId === m._id}
                  className="shrink-0 px-3 py-1.5 text-sm rounded-lg bg-red-900/50 text-red-300 hover:bg-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === m._id ? 'Removing…' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default TopPickForm
