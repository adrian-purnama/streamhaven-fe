import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import apiHelper from '../../../helper/apiHelper'

const TABS = [
  { id: 'now_playing', label: 'On the air' },
  { id: 'popular', label: 'Popular' },
  { id: 'top_rated', label: 'Top rated' },
]

const TvSyncPage = () => {
  const [activeTab, setActiveTab] = useState('now_playing')
  const [data, setData] = useState({ now_playing: [], popular: [], top_rated: [] })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [override, setOverride] = useState(false)

  const fetchTv = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiHelper.get('/api/tv')
      setData(res.data?.data ?? { now_playing: [], popular: [], top_rated: [] })
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load TV')
      setData({ now_playing: [], popular: [], top_rated: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLastSync = useCallback(async () => {
    try {
      const res = await apiHelper.get('/api/tv/sync')
      if (res.data?.lastSync != null) setLastSync(res.data.lastSync)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchTv()
    fetchLastSync()
  }, [fetchTv, fetchLastSync])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await apiHelper.post('/api/tv/sync', { override })
      toast.success(res.data?.message || 'TV synced')
      if (res.data?.lastSync) setLastSync(res.data.lastSync)
      fetchTv()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const list = data[activeTab] || []
  const oneDayMs = 24 * 60 * 60 * 1000
  const syncWithinDay = lastSync && Date.now() - lastSync < oneDayMs

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
          <h1 className="text-2xl font-semibold text-gray-100">TV sync</h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-gray-400 text-sm">Override cache</span>
            </label>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? 'Syncing…' : 'Sync TV'}
            </button>
          </div>
        </div>
        <p className={`text-sm mb-4 font-bold ${syncWithinDay ? 'text-red-400' : 'text-green-400'}`}>
          Last sync: {lastSync ? new Date(lastSync).toLocaleString() : '—'}
          {syncWithinDay ? ' (override needed to sync)' : ' (available to sync)'}
        </p>

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
          ) : list.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400">
              No TV shows in this category. Click &quot;Sync TV&quot; to load from TMDB.
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {list.map((m) => (
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default TvSyncPage
