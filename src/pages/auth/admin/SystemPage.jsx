import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiHelper from '../../../helper/apiHelper'
import SearchableDropdown from '../../../components/SearchableDropdown'
import SystemForm from '../../../components/forms/SystemForm'

const TABS = [
  { id: 'form', label: 'System form' },
  { id: 'log', label: 'Log' },
]

const SystemPage = () => {
  const [activeTab, setActiveTab] = useState('form')
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('all')
  const [logEntries, setLogEntries] = useState([])
  const [logLoading, setLogLoading] = useState(false)
  const [expandedLogIndices, setExpandedLogIndices] = useState(() => new Set())

  useEffect(() => {
    let cancelled = false
    apiHelper.get('/api/logs/categories').then((res) => {
      if (!cancelled && res.data?.success && res.data?.data) {
        setCategories(res.data.data)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const logCategoryOptions = [
    { value: 'all', label: 'All' },
    ...(categories.map((cat) => ({ value: cat, label: cat }))),
  ]

  const fetchLogs = useCallback(async () => {
    setLogLoading(true)
    try {
      const params = category && category !== 'all' ? { category } : { category: 'all' }
      const { data } = await apiHelper.get('/api/logs', { params })
      if (data?.success && data?.data) {
        setLogEntries(data.data.list ?? [])
        setExpandedLogIndices(new Set())
      }
    } catch {
      setLogEntries([])
    } finally {
      setLogLoading(false)
    }
  }, [category])

  useEffect(() => {
    if (activeTab === 'log') fetchLogs()
  }, [activeTab, fetchLogs])

  const onCategoryChange = (val) => {
    setCategory(val ?? 'all')
  }

  const toggleLogExpand = (i) => {
    setExpandedLogIndices((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm text-gray-400 hover:text-amber-400 mb-6"
        >
          ← Back to Admin
        </Link>
        <h1 className="text-2xl font-semibold text-gray-100 mb-4">System</h1>

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

        {activeTab === 'form' && (
          <div className="p-5 rounded-xl bg-gray-800 border border-gray-700">
            <SystemForm />
          </div>
        )}

        {activeTab === 'log' && (
          <div className="p-5 rounded-xl bg-gray-800 border border-gray-700">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <label className="text-gray-400 text-sm">Category</label>
              <div className="w-56">
                <SearchableDropdown
                  options={logCategoryOptions}
                  valueKey="value"
                  labelKey="label"
                  value={category}
                  onChange={onCategoryChange}
                  placeholder="All"
                />
              </div>
            </div>
            {logLoading ? (
              <p className="text-gray-500 text-sm py-4">Loading…</p>
            ) : logEntries.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No log entries for this category.</p>
            ) : (
              <ul className="space-y-2 font-mono text-xs text-gray-300">
                {logEntries.map((entry, i) => {
                  const isExpanded = expandedLogIndices.has(i)
                  const lineCount = entry.lines?.length ?? 0
                  return (
                    <li key={`${entry.logName}-${entry.logTimestamp}-${i}`} className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleLogExpand(i)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-800 flex items-center gap-2"
                      >
                        <span className="shrink-0 text-gray-500" aria-hidden>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <span className="font-medium text-gray-200">{entry.logName}</span>
                        <span className="text-gray-500">({lineCount} line{lineCount !== 1 ? 's' : ''})</span>
                        {entry.logTimestamp && (
                          <span className="text-gray-500 text-right ml-auto">
                            {new Date(entry.logTimestamp).toLocaleString()}
                          </span>
                        )}
                      </button>
                      {isExpanded && lineCount > 0 && (
                        <ul className="border-t border-gray-700 px-3 py-2 space-y-1 max-h-64 overflow-y-auto">
                          {entry.lines.map((line, j) => (
                            <li key={j} className="whitespace-pre-wrap wrap-break-word">
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SystemPage
