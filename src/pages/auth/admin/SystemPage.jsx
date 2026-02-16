import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiHelper from '../../../helper/apiHelper'
import SystemForm from '../../../components/forms/SystemForm'
import SearchableDropdown from '../../../components/SearchableDropdown'

const TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'logs', label: 'Logs' },
]

const LOG_PAGE_SIZE = 50

const formatLogTimestamp = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

const SystemPage = () => {
  const [activeTab, setActiveTab] = useState('settings')

  const [logCategories, setLogCategories] = useState([])
  const [logCategoryOptions, setLogCategoryOptions] = useState([])
  const [logCategory, setLogCategory] = useState('all')
  const [logEntries, setLogEntries] = useState([])
  const [logTotal, setLogTotal] = useState(0)
  const [logSkip, setLogSkip] = useState(0)
  const [logLoading, setLogLoading] = useState(false)

  const fetchLogCategories = useCallback(async () => {
    try {
      const { data } = await apiHelper.get('/api/logs/categories')
      if (data?.success && data?.data) {
        const names = data.data
        setLogCategories(names)
        setLogCategoryOptions([
          { id: 'all', name: 'All' },
          ...names.map((n) => ({ id: n, name: n })),
        ])
      }
    } catch {
      setLogCategories([])
      setLogCategoryOptions([])
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLogLoading(true)
    try {
      const params = { category: logCategory, skip: logSkip, limit: LOG_PAGE_SIZE, format: 'entries' }
      const { data } = await apiHelper.get('/api/logs', { params })
      if (data?.success && data?.data) {
        setLogEntries(data.data.list ?? [])
        setLogTotal(data.data.total ?? 0)
      } else {
        setLogEntries([])
        setLogTotal(0)
      }
    } catch {
      setLogEntries([])
      setLogTotal(0)
    } finally {
      setLogLoading(false)
    }
  }, [logCategory, logSkip])

  useEffect(() => {
    if (activeTab === 'logs') {
      if (logCategories.length === 0) fetchLogCategories()
    }
  }, [activeTab, logCategories.length, fetchLogCategories])

  useEffect(() => {
    if (activeTab === 'logs' && logCategoryOptions.length > 0) fetchLogs()
  }, [activeTab, logCategory, logSkip, logCategoryOptions.length, fetchLogs])

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm text-gray-400 hover:text-amber-400 mb-6"
        >
          ← Back to Admin
        </Link>
        <h1 className="text-2xl font-semibold text-gray-100 mb-6">System</h1>

        <div className="flex gap-1 border-b border-gray-700 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'settings' && (
          <div className="p-5 rounded-xl bg-gray-800 border border-gray-700">
            <SystemForm />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-5 rounded-xl bg-gray-800 border border-gray-700">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="w-48">
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <SearchableDropdown
                  options={logCategoryOptions}
                  valueKey="id"
                  labelKey="name"
                  value={logCategory}
                  onChange={(id) => { setLogCategory(id); setLogSkip(0) }}
                  placeholder="Category"
                  disabled={logCategoryOptions.length === 0}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => fetchLogs()}
                  disabled={logLoading}
                  className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50"
                >
                  {logLoading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>
            <p className="text-gray-500 text-xs mb-3">
              {logTotal} entr{logTotal === 1 ? 'y' : 'ies'}
              {logSkip > 0 ? ` · showing ${logSkip + 1}–${Math.min(logSkip + LOG_PAGE_SIZE, logTotal)}` : ''}
            </p>
            {logLoading && logEntries.length === 0 ? (
              <p className="text-gray-500 text-sm py-8">Loading…</p>
            ) : logEntries.length === 0 ? (
              <p className="text-gray-500 text-sm py-8">No log entries.</p>
            ) : (
              <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                {logEntries.map((entry, idx) => (
                  <details
                    key={`${entry.logTimestamp ?? idx}-${idx}`}
                    className="rounded-lg border border-gray-700 bg-gray-900/80 overflow-hidden group"
                  >
                    <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer list-none text-sm font-medium text-gray-200 hover:bg-gray-700/50 select-none">
                      <span className="text-gray-500 group-open:rotate-90 transition-transform shrink-0">▶</span>
                      <span className="text-amber-400/90">{entry.logName}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-400">{formatLogTimestamp(entry.logTimestamp)}</span>
                      {Array.isArray(entry.log) && entry.log.length > 0 && (
                        <span className="text-gray-500 text-xs ml-1">({entry.log.length} line{entry.log.length !== 1 ? 's' : ''})</span>
                      )}
                    </summary>
                    <div className="border-t border-gray-700">
                      <pre className="p-3 text-gray-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap wrap-break-word">
                        {Array.isArray(entry.log) && entry.log.length > 0 ? entry.log.join('\n') : '—'}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            )}
            {logTotal > LOG_PAGE_SIZE && (
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setLogSkip((s) => Math.max(0, s - LOG_PAGE_SIZE))}
                  disabled={logSkip === 0}
                  className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setLogSkip((s) => s + LOG_PAGE_SIZE)}
                  disabled={logSkip + LOG_PAGE_SIZE >= logTotal}
                  className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SystemPage
