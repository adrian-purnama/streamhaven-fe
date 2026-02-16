import { useState, useEffect, useCallback } from 'react'
import apiHelper from '../../helper/apiHelper'

const PAGE_SIZE = 20

const STAGING_RETRY_STATUSES = 'pending,storage_fail,daily_fail,max_upload_fail,error'

const TABS = [
  { id: 'staging', label: 'Staging & retry' },
  { id: 'processing', label: 'Current processing' },
  { id: 'success', label: 'Successful uploads' },
]

function StagingTab() {
  const [activeTab, setActiveTab] = useState('staging')

  const [stagingList, setStagingList] = useState([])
  const [stagingTotal, setStagingTotal] = useState(0)
  const [stagingLoading, setStagingLoading] = useState(false)
  const [stagingSkip, setStagingSkip] = useState(0)

  const [processStatus, setProcessStatus] = useState(null)
  const [processLoading, setProcessLoading] = useState(false)
  const [processError, setProcessError] = useState(null)

  const [purging, setPurging] = useState(false)

  const [uploadedList, setUploadedList] = useState([])
  const [uploadedTotal, setUploadedTotal] = useState(0)
  const [uploadedLoading, setUploadedLoading] = useState(false)
  const [uploadedSkip, setUploadedSkip] = useState(0)

  const fetchProcessStatus = useCallback(async () => {
    try {
      const { data } = await apiHelper.get('/api/staging/process-status')
      if (data?.success && data?.data) setProcessStatus(data.data)
    } catch {
      setProcessStatus(null)
    }
  }, [])

  useEffect(() => {
    fetchProcessStatus()
  }, [fetchProcessStatus])

  useEffect(() => {
    if (!processStatus?.isProcessing) return
    const interval = setInterval(fetchProcessStatus, 2000)
    return () => clearInterval(interval)
  }, [processStatus?.isProcessing, fetchProcessStatus])

  const fetchStaging = useCallback(async () => {
    setStagingLoading(true)
    try {
      const params = { limit: PAGE_SIZE, skip: stagingSkip, statuses: STAGING_RETRY_STATUSES }
      const { data } = await apiHelper.get('/api/staging', { params })
      if (data?.success && data?.data) {
        setStagingList(data.data.list ?? [])
        setStagingTotal(data.data.total ?? 0)
        if (data.data.processRun && data.data.processRun.items?.length > 0) {
          setProcessStatus(data.data.processRun)
        }
      }
    } catch {
      setStagingList([])
      setStagingTotal(0)
    } finally {
      setStagingLoading(false)
    }
  }, [stagingSkip])

  const fetchUploaded = useCallback(async () => {
    setUploadedLoading(true)
    try {
      const params = { limit: PAGE_SIZE, skip: uploadedSkip }
      const { data } = await apiHelper.get('/api/uploaded-videos', { params })
      if (data?.success && data?.data) {
        setUploadedList(data.data.list ?? [])
        setUploadedTotal(data.data.total ?? 0)
      }
    } catch {
      setUploadedList([])
      setUploadedTotal(0)
    } finally {
      setUploadedLoading(false)
    }
  }, [uploadedSkip])

  useEffect(() => {
    if (activeTab === 'staging') fetchStaging()
  }, [activeTab, fetchStaging])

  useEffect(() => {
    if (activeTab === 'success') fetchUploaded()
  }, [activeTab, fetchUploaded])

  const runProcess = async () => {
    setProcessLoading(true)
    setProcessError(null)
    try {
      const { data } = await apiHelper.post('/api/staging/process')
      if (data?.success && data?.data) setProcessStatus(data.data)
      else setProcessStatus(null)
      fetchStaging()
    } catch (err) {
      const res = err.response
      if (res?.status === 409 && res?.data?.data) setProcessStatus(res.data.data)
      setProcessError(res?.data?.message || err.message || 'Process failed')
    } finally {
      setProcessLoading(false)
    }
  }

  const purgeAllUploads = async () => {
    if (!window.confirm('Delete all staging videos, in-progress uploads, and temp files? This cannot be undone.')) return
    setPurging(true)
    setProcessError(null)
    try {
      const { data } = await apiHelper.get('/api/staging/purge-all-uploads')
      if (data?.success) {
        setStagingList([])
        setStagingTotal(0)
        setProcessStatus(null)
        fetchStaging()
        fetchProcessStatus()
      } else {
        setProcessError(data?.message || 'Purge failed')
      }
    } catch (err) {
      const res = err.response
      setProcessError(res?.data?.message || err.message || 'Purge failed')
    } finally {
      setPurging(false)
    }
  }

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      case 'uploading':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      case 'storage_fail':
      case 'daily_fail':
      case 'max_upload_fail':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40'
      case 'uploaded_not_ready':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
      case 'ready':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/40'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40'
    }
  }

  const slugStatusLabel = (slugStatus) => (slugStatus === 'ready' ? 'Ready' : 'Not ready yet')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-700">
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

      {activeTab === 'staging' && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-gray-200 font-medium">Pending & failed (retry)</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={purgeAllUploads}
                disabled={purging}
                className="px-4 py-2 rounded-lg border border-red-500/60 text-red-400 font-medium hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purging ? 'Purging…' : 'Purge all'}
              </button>
              <button
                type="button"
                onClick={runProcess}
                disabled={processLoading}
                className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processLoading ? 'Starting…' : 'Process queue'}
              </button>
            </div>
          </div>
          {processError && <p className="text-red-400 text-sm mb-3">{processError}</p>}
          {stagingLoading ? (
            <p className="text-gray-500 text-sm py-8">Loading…</p>
          ) : stagingList.length === 0 ? (
            <p className="text-gray-500 text-sm py-8">No items in staging or failed to retry.</p>
          ) : (
            <>
              <ul className="space-y-4">
                {stagingList.map((item) => (
                  <li
                    key={item._id}
                    className="flex flex-wrap sm:flex-nowrap gap-4 p-4 rounded-lg border border-gray-700 bg-gray-800/50"
                  >
                    <div className="shrink-0 w-20 h-[120px] rounded-lg overflow-hidden bg-gray-700">
                      {item.poster_url ? (
                        <img src={item.poster_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No poster</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-gray-200 font-medium truncate">{item.title || item.filename || '—'}</p>
                      <p className="text-gray-500 text-sm truncate">{item.filename}</p>
                      <p className="text-gray-500 text-xs">
                        {(item.size / (1024 * 1024)).toFixed(2)} MB
                        {item.tmdbId != null && ` · TMDB ${item.tmdbId}`}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${statusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                      {item.status === 'error' && item.errorMessage && (
                        <p className="text-red-400 text-xs mt-1 truncate" title={item.errorMessage}>{item.errorMessage}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {stagingTotal > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                  <p className="text-gray-500 text-sm">
                    {stagingSkip + 1}–{Math.min(stagingSkip + PAGE_SIZE, stagingTotal)} of {stagingTotal}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStagingSkip((s) => Math.max(0, s - PAGE_SIZE))}
                      disabled={stagingSkip === 0}
                      className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setStagingSkip((s) => s + PAGE_SIZE)}
                      disabled={stagingSkip + PAGE_SIZE >= stagingTotal}
                      className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'processing' && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-gray-200 font-medium mb-2">Current processing</h3>
          <p className="text-gray-400 text-sm mb-4">
            Movies in this run — the one uploading now and those waiting in line. Shown only when a process run is active or after the last run.
          </p>
          {processStatus?.items?.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                {processStatus.isProcessing ? (
                  <span className="text-amber-400 text-sm">
                    Processing {processStatus.processed + processStatus.failed + (processStatus.currentStagingId ? 1 : 0)} of {processStatus.total}
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">
                    {processStatus.processed} done, {processStatus.failed} failed
                    {processStatus.startedAt && ` · ${new Date(processStatus.startedAt).toLocaleString()}`}
                  </span>
                )}
                {!processStatus.isProcessing && (
                  <button
                    type="button"
                    onClick={runProcess}
                    disabled={processLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-gray-900 text-sm font-medium hover:bg-amber-400 disabled:opacity-50"
                  >
                    Process queue
                  </button>
                )}
              </div>
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {processStatus.items.map((item, idx) => {
                  const isCurrent = processStatus.currentStagingId === item.stagingId
                  const doneCount = processStatus.processed + processStatus.failed
                  const isDone = idx < doneCount
                  const waitingInLine = !isDone && !isCurrent
                  const rowLabel = isCurrent ? 'Uploading…' : waitingInLine ? 'Waiting in line' : 'Done'
                  return (
                    <li
                      key={item.stagingId}
                      className={`flex items-center gap-2 py-2 px-3 rounded-lg border text-sm ${
                        isCurrent ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                          : waitingInLine ? 'border-gray-600 bg-gray-800/50 text-gray-300'
                          : 'border-gray-700 bg-gray-800/30 text-gray-500'
                      }`}
                    >
                      <span className="shrink-0 w-7 text-gray-500 font-medium">{idx + 1}.</span>
                      <span className="truncate min-w-0 flex-1">{item.title || item.filename || item.stagingId}</span>
                      <span className={`shrink-0 text-xs font-medium ${isCurrent ? 'text-amber-400' : waitingInLine ? 'text-gray-400' : 'text-gray-500'}`}>
                        {rowLabel}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="text-gray-500 text-sm py-8">No process run. Start one from the “Staging & retry” tab.</p>
          )}
        </div>
      )}

      {activeTab === 'success' && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
          <h3 className="text-gray-200 font-medium mb-2">Successful uploads</h3>
          <p className="text-gray-400 text-sm mb-4">Videos uploaded to Abyss. Status: not ready yet (processing) or ready.</p>
          {uploadedLoading ? (
            <p className="text-gray-500 text-sm py-8">Loading…</p>
          ) : uploadedList.length === 0 ? (
            <p className="text-gray-500 text-sm py-8">No successful uploads yet.</p>
          ) : (
            <>
              <ul className="space-y-4">
                {uploadedList.map((item) => (
                  <li
                    key={item._id}
                    className="flex flex-wrap sm:flex-nowrap gap-4 p-4 rounded-lg border border-gray-700 bg-gray-800/50"
                  >
                    <div className="shrink-0 w-20 h-[120px] rounded-lg overflow-hidden bg-gray-700">
                      {item.poster_url ? (
                        <img src={item.poster_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No poster</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-gray-200 font-medium truncate">{item.title || item.filename || '—'}</p>
                      <p className="text-gray-500 text-sm truncate">{item.filename}</p>
                      <p className="text-gray-500 text-xs">
                        {item.size != null && `${(item.size / (1024 * 1024)).toFixed(2)} MB`}
                        {item.externalId != null && ` · TMDB ${item.externalId}`}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${item.slugStatus === 'ready' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'}`}>
                        {slugStatusLabel(item.slugStatus)}
                      </span>
                      {item.abyssSlug && <p className="text-emerald-400 text-xs mt-1">Abyss: {item.abyssSlug}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              {uploadedTotal > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                  <p className="text-gray-500 text-sm">
                    {uploadedSkip + 1}–{Math.min(uploadedSkip + PAGE_SIZE, uploadedTotal)} of {uploadedTotal}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadedSkip((s) => Math.max(0, s - PAGE_SIZE))}
                      disabled={uploadedSkip === 0}
                      className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadedSkip((s) => s + PAGE_SIZE)}
                      disabled={uploadedSkip + PAGE_SIZE >= uploadedTotal}
                      className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default StagingTab
