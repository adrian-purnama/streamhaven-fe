import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import apiHelper from '../../../helper/apiHelper'

const TABS = [
  { id: 'movie', label: 'Movie genres' },
  { id: 'tv', label: 'TV genres' },
]

const GenrePage = () => {
  const [activeTab, setActiveTab] = useState('movie')
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchGenres = useCallback(async (genreType) => {
    setLoading(true)
    try {
      const { data } = await apiHelper.get('/api/genres', { params: { genreType } })
      setGenres(data?.data ?? [])
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load genres'
      toast.error(msg)
      setGenres([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGenres(activeTab)
  }, [activeTab, fetchGenres])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { data } = await apiHelper.post('/api/genres/sync')
      toast.success(data?.message || 'Genres synced')
      fetchGenres(activeTab)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Sync failed'
      toast.error(msg)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm text-gray-400 hover:text-amber-400 mb-6"
        >
          ← Back to Admin
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-gray-100">Genres</h1>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? 'Syncing…' : 'Sync from TMDB'}
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-700 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400 bg-gray-800'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-400">Loading…</div>
          ) : genres.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400">
              No genres. Click &quot;Sync from TMDB&quot; to load {activeTab === 'movie' ? 'movie' : 'TV'} genres.
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {genres.map((g) => (
                <li key={g._id} className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-gray-200 font-medium">{g.name}</span>
                  <span className="text-xs text-gray-500">ID: {g.externalSystemId}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default GenrePage
