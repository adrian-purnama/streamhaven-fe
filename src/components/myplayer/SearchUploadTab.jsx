import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import SearchMovieForm from '../forms/SearchMovieForm'
import SearchableDropdown from '../SearchableDropdown'
import apiHelper from '../../helper/apiHelper'
import { baseURL } from '../../helper/apiHelper'

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

function formatBytes(bytes) {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  const n = Number(bytes)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatEtaSeconds(sec) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return ''
  const s = Math.round(sec)
  if (s < 60) return `~${s}s`
  if (s < 3600) {
    const m = Math.floor(s / 60)
    const r = s % 60
    return r > 0 ? `~${m}m ${r}s` : `~${m}m`
  }
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`
}

function SearchUploadTab() {
  const [activeTab] = useState('queue')
  const [queueList, setQueueList] = useState([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [queuePage, setQueuePage] = useState(1)
  const [queueLimit] = useState(20)
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueMovie, setQueueMovie] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [downloaderProgress, setDownloaderProgress] = useState(null)
  const [etaDownloadSec, setEtaDownloadSec] = useState(null)
  const [etaUploadSec, setEtaUploadSec] = useState(null)
  const startedNextForJobRef = useRef(new Set())
  const speedRef = useRef({ lastDownload: null, lastUpload: null, speedDownload: null, speedUpload: null })

  const fetchQueue = async (page = queuePage) => {
    setQueueLoading(true)
    try {
      const skip = (page - 1) * queueLimit
      const res = await apiHelper.get('/api/download-queue', { params: { limit: queueLimit, skip } })
      const data = res.data?.data || {}
      setQueueList(Array.isArray(data.list) ? data.list : [])
      setQueueTotal(Number(data.total) || 0)
      setQueuePage(page)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load queue')
      setQueueList([])
      setQueueTotal(0)
    } finally {
      setQueueLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'queue') fetchQueue(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch on tab switch
  }, [activeTab])

  const queueStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      case 'waiting':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
      case 'downloading':
      case 'uploading':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      case 'done':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/40'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40'
    }
  }

  // WebSocket: stream downloader progress when on Queue tab (connect so we get updates as soon as a job runs)
  useEffect(() => {
    if (activeTab !== 'queue') {
      setDownloaderProgress(null)
      return
    }
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fc-token') : null
    if (!token) return
    const wsProtocol = baseURL.startsWith('https') ? 'wss:' : 'ws:'
    const wsHost = baseURL.replace(/^https?:\/\//, '')
    const wsUrl = `${wsProtocol}//${wsHost}/ws/download-queue/progress?token=${encodeURIComponent(token)}`
    let ws = null
    try {
      ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setDownloaderProgress(data)
          if (data.job) {
            const job = data.job
            setQueueList((prev) =>
              prev.map((item) => (item.jobId === job.jobId || item._id === job._id ? { ...item, ...job } : item))
            )
            if (job.status === 'done' || job.status === 'failed') {
              const key = job._id || job.jobId
              if (!startedNextForJobRef.current.has(key)) {
                startedNextForJobRef.current.add(key)
                apiHelper.post('/api/download-queue/process/start').then(() => fetchQueue()).catch(() => fetchQueue())
              }
            }
          }
        } catch {
          setDownloaderProgress(null)
        }
      }
      ws.onclose = () => setDownloaderProgress(null)
      ws.onerror = () => setDownloaderProgress(null)
    } catch {
      setDownloaderProgress(null)
    }
    return () => {
      if (ws) {
        try { ws.close() } catch { /* ignore */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchQueue stable enough for WS callback
  }, [activeTab])

  useEffect(() => {
    const p = downloaderProgress
    if (!p) {
      setEtaDownloadSec(null)
      setEtaUploadSec(null)
      speedRef.current = { lastDownload: null, lastUpload: null, speedDownload: null, speedUpload: null }
      return
    }
    const now = Date.now() / 1000
    const r = speedRef.current
    const d = p.download
    if (d?.current_page != null && d?.total_pages != null && (p.phase === 'downloading' || p.phase === 'uploading')) {
      const page = Number(d.current_page)
      const total = Number(d.total_pages)
      const remaining = Math.max(0, total - page)
      if (r.lastDownload != null && now - r.lastDownload.t >= 0.5) {
        const dt = now - r.lastDownload.t
        const dp = page - r.lastDownload.page
        if (dt > 0 && dp >= 0) {
          const instant = dp / dt
          r.speedDownload = r.speedDownload == null ? instant : 0.7 * r.speedDownload + 0.3 * instant
          if (remaining > 0 && r.speedDownload > 0) setEtaDownloadSec(remaining / r.speedDownload)
        }
      }
      r.lastDownload = { t: now, page }
      if (remaining <= 0) setEtaDownloadSec(null)
    } else {
      setEtaDownloadSec(null)
      if (p.phase !== 'downloading' && p.phase !== 'uploading') r.lastDownload = null
    }
    const u = p.upload
    if (u?.bytes_sent != null && u?.bytes_total != null && p.phase === 'uploading') {
      const sent = Number(u.bytes_sent)
      const total = Number(u.bytes_total)
      const remaining = Math.max(0, total - sent)
      if (r.lastUpload != null && now - r.lastUpload.t >= 0.5) {
        const dt = now - r.lastUpload.t
        const dBytes = sent - r.lastUpload.bytes
        if (dt > 0 && dBytes >= 0) {
          const instant = dBytes / dt
          r.speedUpload = r.speedUpload == null ? instant : 0.7 * r.speedUpload + 0.3 * instant
          if (remaining > 0 && r.speedUpload > 0) setEtaUploadSec(remaining / r.speedUpload)
        }
      }
      r.lastUpload = { t: now, bytes: sent }
      if (remaining <= 0) setEtaUploadSec(null)
    } else {
      setEtaUploadSec(null)
      if (p.phase !== 'uploading') r.lastUpload = null
    }
  }, [downloaderProgress])

  const addToQueue = async () => {
    const movie = queueMovie
    if (!movie?.title && !movie?.id) {
      toast.error('Search and select a movie first')
      return
    }
    const title = movie.title ? `${movie.title}${movie.release_date ? ` ${new Date(movie.release_date).getFullYear()}` : ''}`.trim() : `TMDB ${movie.id}`
    try {
      await apiHelper.post('/api/download-queue', {
        title,
        tmdbId: movie.id ?? null,
        poster_path: movie.poster_path || movie.poster_url || null,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      })
      toast.success('Added to download queue')
      setQueueMovie(null)
      fetchQueue(1)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add to queue')
    }
  }

  const deleteQueueItem = async (id) => {
    try {
      await apiHelper.delete(`/api/download-queue/${id}`)
      toast.success('Removed from queue')
      fetchQueue()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to remove')
    }
  }

  const updateQueueQuality = async (id, quality) => {
    try {
      await apiHelper.patch(`/api/download-queue/${id}`, { quality })
      setQueueList((prev) => prev.map((item) => (item._id === id ? { ...item, quality } : item)))
      toast.success('Quality updated')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update quality')
    }
  }

  const processNext = async () => {
    setProcessing(true)
    try {
      const res = await apiHelper.post('/api/download-queue/process')
      const moved = res.data?.data?.moved ?? 0
      toast.success(moved === 1 ? 'Moved 1 item to waiting' : `Moved ${moved} items to waiting`)
      fetchQueue()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Process failed')
    } finally {
      setProcessing(false)
    }
  }

  const startNext = async () => {
    setProcessing(true)
    try {
      await apiHelper.post('/api/download-queue/process/start')
      toast.success('Started download')
      fetchQueue()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Start failed')
    } finally {
      setProcessing(false)
    }
  }

  const showLiveBlock = downloaderProgress != null

  const downloaderUpdatedAgo = (() => {
    const u = downloaderProgress?.updatedAt
    if (u == null) return null
    const sec = Math.max(0, Math.floor(Date.now() / 1000 - Number(u)))
    if (sec < 5) return 'just now'
    if (sec < 60) return `${sec}s ago`
    return `${Math.floor(sec / 60)}m ago`
  })()

  return (
    <div className="p-6 space-y-6">
      {showLiveBlock && (
        <div className="rounded-xl border border-cyan-500/40 bg-gray-800/50 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-medium text-cyan-200">Downloader live progress</h3>
            <span className="text-gray-500 text-sm">
              {downloaderProgress.error ? `Backend: ${downloaderProgress.error}` : downloaderUpdatedAgo ? `Updated ${downloaderUpdatedAgo}` : 'Streaming'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><strong className="text-gray-300">Phase:</strong> <span className="capitalize text-cyan-300">{downloaderProgress.phase ?? '—'}</span></span>
            {downloaderProgress.jobId != null && (
              <span><strong className="text-gray-300">JobId:</strong> <span className="font-mono text-gray-400 truncate max-w-[160px] inline-block align-bottom" title={String(downloaderProgress.jobId)}>{String(downloaderProgress.jobId)}</span></span>
            )}
            {downloaderProgress.updatedAt != null && (
              <span><strong className="text-gray-300">Last updated:</strong> <span className="text-gray-400">{new Date(Number(downloaderProgress.updatedAt) * 1000).toLocaleString()}</span></span>
            )}
          </div>
          {downloaderProgress.explanation && (
            <p className="text-gray-400 text-sm break-words">{downloaderProgress.explanation}</p>
          )}
          {(downloaderProgress.phase === 'downloading' || downloaderProgress.phase === 'uploading') && downloaderProgress.download?.total_pages != null && downloaderProgress.download?.current_page != null && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <strong className="text-gray-300">Download:</strong>
                <span className="text-gray-400">
                  Page {downloaderProgress.download.current_page} / {downloaderProgress.download.total_pages}
                  {etaDownloadSec != null && (
                    <span className="text-amber-300/90 ml-2" title="Estimated time remaining">{formatEtaSeconds(etaDownloadSec)} left</span>
                  )}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-300 transition-[width] duration-300"
                  style={{ width: `${(Number(downloaderProgress.download.current_page) / Number(downloaderProgress.download.total_pages)) * 100}%` }}
                />
              </div>
              {downloaderProgress.download?.error && (
                <p className="text-red-400 text-xs" title={downloaderProgress.download.error}>{downloaderProgress.download.error}</p>
              )}
            </div>
          )}
          {downloaderProgress.phase === 'uploading' && downloaderProgress.upload != null && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <strong className="text-gray-300">Upload:</strong>
                <span className="text-gray-400">
                  {downloaderProgress.upload.percent != null ? `${downloaderProgress.upload.percent}%` : ''}
                  {downloaderProgress.upload.bytes_sent != null && downloaderProgress.upload.bytes_total != null && (
                    <> {formatBytes(downloaderProgress.upload.bytes_sent)} / {formatBytes(downloaderProgress.upload.bytes_total)}</>
                  )}
                  {etaUploadSec != null && (
                    <span className="text-amber-300/90 ml-2" title="Estimated time remaining">{formatEtaSeconds(etaUploadSec)} left</span>
                  )}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-300 transition-[width] duration-300"
                  style={{
                    width: `${Math.min(100, downloaderProgress.upload.percent != null
                      ? Number(downloaderProgress.upload.percent)
                      : downloaderProgress.upload.bytes_total
                        ? (Number(downloaderProgress.upload.bytes_sent || 0) / Number(downloaderProgress.upload.bytes_total)) * 100
                        : 0)}%`,
                  }}
                />
              </div>
              {downloaderProgress.upload?.error && (
                <p className="text-red-400 text-xs" title={downloaderProgress.upload.error}>{downloaderProgress.upload.error}</p>
              )}
            </div>
          )}
          {downloaderProgress.phase === 'idle' && !downloaderProgress.error && (
            <p className="text-gray-500 text-sm">No active job. Start a waiting job to see live progress.</p>
          )}
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="space-y-6">
          <SearchMovieForm
            description="Search for a movie by TMDB or IMDB ID, then add it to the download queue (torrent → staging)."
            onMovieSelect={setQueueMovie}
            renderActions={
              queueMovie
                ? () => (
                  <button
                    type="button"
                    onClick={addToQueue}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    Add to queue
                  </button>
                )
                : undefined
            }
          />

          {(downloaderProgress?.download?.error || downloaderProgress?.upload?.error || downloaderProgress?.error) && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-2 text-xs text-red-400">
              {downloaderProgress.download?.error || downloaderProgress.upload?.error || `Backend: ${downloaderProgress.error}`}
            </div>
          )}

          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-gray-300">Download queue</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={processNext}
                  disabled={processing || queueLoading || !queueList.some((i) => i.status === 'pending')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-gray-900 text-sm font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move next pending job to waiting"
                >
                  {processing ? '…' : 'Move to waiting'}
                </button>
                <button
                  type="button"
                  onClick={startNext}
                  disabled={processing || queueLoading || !queueList.some((i) => i.status === 'waiting')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-gray-900 text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Process next waiting job (call downloader)"
                >
                  {processing ? '…' : 'Process waiting'}
                </button>
              </div>
            </div>
            {queueLoading ? (
              <p className="text-gray-500 text-sm">Loading queue…</p>
            ) : queueList.length === 0 ? (
              <p className="text-gray-500 text-sm">No items in queue. Search and add above.</p>
            ) : (
              <ul className="scrollbar-sleek space-y-2 max-h-80 overflow-y-auto pr-1">
                {queueList.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-800 border border-gray-700"
                  >
                    <div className="w-12 h-[72px] shrink-0 rounded overflow-hidden bg-gray-700">
                      {item.poster_url ? (
                        <img src={item.poster_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No poster</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-200 text-sm font-medium truncate">{item.title}</p>
                      {(item.requesterType || item.requesterEmail) && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          {item.requesterType}
                          {item.requesterEmail && ` · ${item.requesterEmail}`}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${queueStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                        {(item.status === 'pending' || item.status === 'waiting') ? (
                          <div className="w-28">
                            <SearchableDropdown
                              options={QUALITY_OPTIONS}
                              valueKey="value"
                              labelKey="label"
                              value={item.quality || 'high'}
                              onChange={(val) => updateQueueQuality(item._id, val)}
                              placeholder="Quality"
                            />
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium border bg-gray-600/20 text-gray-400 border-gray-500/40 capitalize">
                            {item.quality || 'high'}
                          </span>
                        )}
                      </div>
                      {item.errorMessage && (
                        <p className="text-red-400 text-xs mt-1 truncate" title={item.errorMessage}>{item.errorMessage}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteQueueItem(item._id)}
                      disabled={item.status === 'downloading' || item.status === 'uploading'}
                      className="shrink-0 px-2 py-1 rounded text-red-400 hover:bg-red-500/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title={item.status === 'downloading' || item.status === 'uploading' ? 'Cannot delete while in progress' : 'Remove from queue'}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {queueTotal > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-700">
                <p className="text-gray-500 text-xs">Total: {queueTotal}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchQueue(queuePage - 1)}
                    disabled={queueLoading || queuePage <= 1}
                    className="px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="text-gray-500 text-xs">
                    Page {queuePage} of {Math.max(1, Math.ceil(queueTotal / queueLimit))}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchQueue(queuePage + 1)}
                    disabled={queueLoading || queuePage * queueLimit >= queueTotal}
                    className="px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchUploadTab
