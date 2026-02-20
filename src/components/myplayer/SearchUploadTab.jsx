import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import SearchMovieForm from '../forms/SearchMovieForm'
import apiHelper from '../../helper/apiHelper'
import { baseURL } from '../../helper/apiHelper'

const ACCEPT = 'video/mp4,video/webm,video/x-matroska,.mp4,.webm,.mkv'
const STAGING_UPLOAD_KEY = 'stagingUpload' // { uploadId, fileName, totalChunks, startedAt } – for resume/poll after reload
const UPLOAD_STATUS_POLL_MS = 2500
const BYTE_DISPLAY_KEY = 'downloadQueueByteDisplay'

/** Format stall_seconds_remaining as "Xm Ys" or "Xs" for display. */
function formatStallCountdown(seconds) {
  if (seconds == null || seconds < 0) return null
  const s = Math.floor(Number(seconds))
  if (s >= 60) {
    const m = Math.floor(s / 60)
    const r = s % 60
    return r > 0 ? `${m}m ${r}s` : `${m}m`
  }
  return `${s}s`
}

/** Format bytes by chosen mode: raw (locale string), kb, mb, gb, or dynamic (pick unit by size). */
function formatBytesByMode(bytes, mode) {
  if (bytes == null || bytes === undefined) return '—'
  const n = Number(bytes)
  if (Number.isNaN(n)) return '—'
  if (mode === 'raw') return n.toLocaleString()
  if (mode === 'kb') return `${(n / 1024).toFixed(1)} KB`
  if (mode === 'mb') return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (mode === 'gb') return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
  // dynamic
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const BYTE_DISPLAY_OPTIONS = [
  { id: 'raw', label: 'Raw' },
  { id: 'kb', label: 'KB' },
  { id: 'mb', label: 'MB' },
  { id: 'gb', label: 'GB' },
  { id: 'dynamic', label: 'Dynamic' },
]

const TABS = [
  { id: 'manual', label: 'Manual upload' },
  { id: 'queue', label: 'Queue' },
]

function SearchUploadTab({ onUploadingChange }) {
  const [activeTab, setActiveTab] = useState('manual')
  const [selectedMovieForUpload, setSelectedMovieForUpload] = useState(null)
  const [queueList, setQueueList] = useState([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueMovie, setQueueMovie] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [downloaderProgress, setDownloaderProgress] = useState(null) // { phase, download: { bytes_done, bytes_total, error }, upload: { bytes_sent, bytes_total, percent, phase, error } }
  const [byteDisplayMode, setByteDisplayMode] = useState(() => {
    try {
      const s = localStorage.getItem(BYTE_DISPLAY_KEY)
      if (BYTE_DISPLAY_OPTIONS.some((o) => o.id === s)) return s
    } catch { /* ignore */ }
    return 'dynamic'
  })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // 0–100 sending file
  const [uploadChunkInfo, setUploadChunkInfo] = useState(null) // { current, total } for "chunk X of Y"
  const [dbProgress, setDbProgress] = useState(null) // 0–100 writing to DB
  const [uploadFileName, setUploadFileName] = useState(null) // from localStorage or BE (for "in progress for X")
  const [uploadStatus, setUploadStatus] = useState(null) // from BE: 'uploading' | 'writing' | 'done' | 'error'
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)
  const pollIntervalRef = useRef(null)
  const startedNextForJobRef = useRef(new Set())

  // On mount only: if we have a saved upload id (e.g. after reload), poll upload-status and show progress until done/error/404
  useEffect(() => {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STAGING_UPLOAD_KEY) : null
    if (!raw) return
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      localStorage.removeItem(STAGING_UPLOAD_KEY)
      return
    }
    const { uploadId, totalChunks, fileName } = data
    if (!uploadId || !totalChunks) {
      localStorage.removeItem(STAGING_UPLOAD_KEY)
      return
    }
    setUploading(true)
    setUploadFileName(fileName || 'video')
    setUploadStatus('uploading')
    setUploadChunkInfo({ current: 0, total: totalChunks })
    setUploadProgress(0)
    setDbProgress(null)
    if (typeof onUploadingChange === 'function') onUploadingChange(true)

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fc-token') : null
    const url = `${baseURL}/api/staging/upload-status/${encodeURIComponent(uploadId)}`

    const poll = async () => {
      try {
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (res.status === 404) {
          localStorage.removeItem(STAGING_UPLOAD_KEY)
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setUploading(false)
          setUploadProgress(null)
          setUploadChunkInfo(null)
          setDbProgress(null)
          setUploadFileName(null)
          setUploadStatus(null)
          if (typeof onUploadingChange === 'function') onUploadingChange(false)
          toast.error('Upload no longer tracked. Check staging list for your video.')
          return
        }
        if (!res.ok) return
        const json = await res.json()
        const d = json.data || {}
        if (d.fileName) setUploadFileName(d.fileName)
        if (d.status != null) setUploadStatus(d.status)
        setUploadChunkInfo({ current: d.currentChunk ?? 0, total: d.totalChunks || totalChunks })
        setUploadProgress(d.uploadProgress ?? null)
        setDbProgress(d.dbProgress ?? null)
        if (d.status === 'done') {
          localStorage.removeItem(STAGING_UPLOAD_KEY)
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          toast.success('Video added to staging. Cron will upload to Abyss.')
          setUploading(false)
          setUploadProgress(null)
          setUploadChunkInfo(null)
          setDbProgress(null)
          setUploadFileName(null)
          setUploadStatus(null)
          if (typeof onUploadingChange === 'function') onUploadingChange(false)
        } else if (d.status === 'error') {
          localStorage.removeItem(STAGING_UPLOAD_KEY)
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          toast.error(d.error || 'Upload failed')
          setUploading(false)
          setUploadProgress(null)
          setUploadChunkInfo(null)
          setDbProgress(null)
          setUploadFileName(null)
          setUploadStatus(null)
          if (typeof onUploadingChange === 'function') onUploadingChange(false)
        }
      } catch {
        // keep polling on network error
      }
    }

    poll()
    pollIntervalRef.current = setInterval(poll, UPLOAD_STATUS_POLL_MS)
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only on mount so restore is stable after refresh
  }, [])

  const fetchQueue = async () => {
    setQueueLoading(true)
    try {
      const res = await apiHelper.get('/api/download-queue', { params: { limit: 100 } })
      const data = res.data?.data || {}
      setQueueList(Array.isArray(data.list) ? data.list : [])
      setQueueTotal(Number(data.total) || 0)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load queue')
      setQueueList([])
      setQueueTotal(0)
    } finally {
      setQueueLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'queue') fetchQueue()
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
  }, [activeTab])

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
      fetchQueue()
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

  const addFile = (list) => {
    const f = list?.[0]
    if (!f) return
    if (!ACCEPT.split(',').some((t) => t.trim().startsWith('video/') || f.name.match(/\.(mp4|webm|mkv)$/i))) {
      toast.error('Please choose a video file (MP4, WebM, or MKV)')
      return
    }
    setFile(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFile(e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : null)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => setDragOver(false)

  const CHUNK_SIZE = 20 * 1024 * 1024 // 90 MB (under Cloudflare 100MB)

  const handleUpload = async () => {
    if (!selectedMovieForUpload?.id || !file) {
      toast.error('Select a movie and choose a video file')
      return
    }
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE) || 1
    const uploadId = Date.now().toString(36) + Math.random().toString(36).slice(2)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STAGING_UPLOAD_KEY, JSON.stringify({
        uploadId,
        fileName: file.name,
        totalChunks,
        startedAt: new Date().toISOString(),
      }))
    }
    setUploading(true)
    setUploadFileName(file.name)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setUploadChunkInfo({ current: 0, total: totalChunks })
    setDbProgress(null)
    if (typeof onUploadingChange === 'function') onUploadingChange(true)

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fc-token') : null
    const url = `${baseURL}/api/staging/upload-chunk`
    const posterPath = selectedMovieForUpload.poster_path ?? selectedMovieForUpload.poster_url ?? ''

    const done = (success = false) => {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STAGING_UPLOAD_KEY)
      setUploading(false)
      setUploadProgress(null)
      setUploadChunkInfo(null)
      setDbProgress(null)
      setUploadFileName(null)
      setUploadStatus(null)
      if (typeof onUploadingChange === 'function') onUploadingChange(false)
      if (success) {
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
      }
    }

    try {
      console.log('[STAGING_UPLOAD] start', { uploadId, totalChunks, fileSize: file.size })
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        setUploadChunkInfo({ current: chunkIndex + 1, total: totalChunks })
        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)
        console.log('[STAGING_UPLOAD] sending chunk', { chunkIndex, totalChunks, chunkSize: chunk.size })
        const form = new FormData()
        form.append('uploadId', uploadId)
        form.append('chunkIndex', String(chunkIndex))
        form.append('totalChunks', String(totalChunks))
        form.append('file', chunk, file.name)
        if (chunkIndex === 0) {
          form.append('tmdbId', String(selectedMovieForUpload.id))
          if (selectedMovieForUpload.title) form.append('title', selectedMovieForUpload.title)
          if (posterPath) form.append('poster_path', posterPath)
        }

        const res = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          let lastParsedLength = 0

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const chunkPct = (e.loaded / e.total) * 100
              const sendPct = ((chunkIndex * 100 + chunkPct) / totalChunks)
              setUploadProgress(Math.round(sendPct))
            }
          }

          xhr.onprogress = () => {
            const text = xhr.responseText
            const lines = text.slice(lastParsedLength).split('\n')
            lastParsedLength = text.length
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue
              try {
                const data = JSON.parse(trimmed)
                if (data.stage === 'writing' && typeof data.progress === 'number') {
                  setUploadStatus('writing')
                  setDbProgress(data.progress)
                }
                if (data.stage === 'done') {
                  setUploadStatus('done')
                  setDbProgress(100)
                }
              } catch { /* ignore */ }
            }
          }

          xhr.onload = () => {
            const preview = (xhr.responseText || '').slice(0, 120)
            console.log('[STAGING_UPLOAD] chunk response', { chunkIndex, status: xhr.status, preview })
            if (xhr.status >= 400) {
              let msg = 'Chunk upload failed'
              try {
                const j = JSON.parse(xhr.responseText || '{}')
                msg = j.message || j.error || msg
              } catch { /* ignore */ }
              reject(new Error(msg))
              return
            }
            const isNDJSON = xhr.getResponseHeader('Content-Type')?.includes('ndjson') || /"stage":\s*"(writing|done|error)"/.test(xhr.responseText || '')
            if (isNDJSON) {
              const lines = xhr.responseText.trim().split('\n').filter(Boolean)
              const last = lines[lines.length - 1]
              try {
                const data = last ? JSON.parse(last) : {}
                if (data.stage === 'done') console.log('[STAGING_UPLOAD] got stage=done', data)
                if (data.stage === 'error') console.log('[STAGING_UPLOAD] got stage=error', data)
                if (data.stage === 'error') reject(new Error(data.message || 'Upload failed'))
                else resolve(data)
              } catch {
                resolve({})
              }
            } else {
              resolve({})
            }
          }
          xhr.onerror = () => {
            console.log('[STAGING_UPLOAD] chunk network error', { chunkIndex })
            reject(new Error('Network error'))
          }
          xhr.open('POST', url)
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
          xhr.send(form)
        })

        if (res?.stage === 'done') {
          console.log('[STAGING_UPLOAD] success, done')
          toast.success('Video added to staging. Cron will upload to Abyss.')
          done(true)
          return
        }
      }
      console.log('[STAGING_UPLOAD] loop finished without stage=done')
      done(false)
    } catch (err) {
      console.log('[STAGING_UPLOAD] catch', err?.message)
      toast.error(err?.message || 'Upload failed')
      done(false)
    }
  }

  /** Format updatedAt (Unix s) as "Xs ago" for live indicator */
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
      <div className="flex gap-1 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

          {/* Downloader live progress: all streamed fields from backend WS (polled from downloader) */}
          {downloaderProgress != null && (
            <div className="rounded-xl border border-cyan-500/40 bg-gray-800/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-cyan-200">Downloader live progress</h3>
                <span className="text-gray-500 text-xs">
                  {downloaderProgress.error ? `Backend: ${downloaderProgress.error}` : downloaderUpdatedAgo ? `Streamed ${downloaderUpdatedAgo}` : 'Streamed'}
                </span>
              </div>
              {downloaderProgress.explanation && (
                <p className="text-gray-500/90 text-xs break-all">{downloaderProgress.explanation}</p>
              )}

              {(downloaderProgress.phase === 'downloading' || downloaderProgress.phase === 'uploading') && downloaderProgress.download?.total_pages != null && downloaderProgress.download?.current_page != null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <strong>Download Progress:</strong>
                      <span>Page</span>
                      <span>{downloaderProgress.download.current_page} / {downloaderProgress.download.total_pages}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-300 transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, (Number(downloaderProgress.download.current_page) / Number(downloaderProgress.download.total_pages)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {downloaderProgress.phase === 'uploading' && downloaderProgress.upload?.bytes_total != null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <strong>Upload Progress:</strong>
                      <span>{downloaderProgress.upload.percent != null ? `${downloaderProgress.upload.percent}%` : ''}</span>
                      {downloaderProgress.upload.bytes_sent != null && (
                        <span>
                          {formatBytesByMode(downloaderProgress.upload.bytes_sent, byteDisplayMode)} / {formatBytesByMode(downloaderProgress.upload.bytes_total, byteDisplayMode)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, downloaderProgress.upload.percent != null
                          ? Number(downloaderProgress.upload.percent)
                          : downloaderProgress.upload.bytes_total
                            ? (Number(downloaderProgress.upload.bytes_sent || 0) / Number(downloaderProgress.upload.bytes_total)) * 100
                            : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {downloaderProgress.download && (downloaderProgress.download.bytes_done != null || downloaderProgress.download.error) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Download (torrent)</span>
                    <span>
                      {formatBytesByMode(downloaderProgress.download.bytes_done, byteDisplayMode)}
                      {downloaderProgress.download.bytes_total != null ? ` / ${formatBytesByMode(downloaderProgress.download.bytes_total, byteDisplayMode)}` : ''}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-[width] duration-300"
                      style={{
                        width: (() => {
                          const total = Number(downloaderProgress.download.bytes_total)
                          const done = Number(downloaderProgress.download.bytes_done)
                          if (!total || Number.isNaN(done)) return '0%'
                          return `${Math.min(100, (done / total) * 100)}%`
                        })(),
                      }}
                    />
                  </div>
                  {downloaderProgress.download.stall_seconds_remaining != null && downloaderProgress.phase === 'downloading' && (
                    <p className="text-amber-300/90 text-xs">Considered stalled in {formatStallCountdown(downloaderProgress.download.stall_seconds_remaining)} if no progress</p>
                  )}
                  {downloaderProgress.download.error && (
                    <p className="text-red-400 text-xs" title={downloaderProgress.download.error}>{downloaderProgress.download.error}</p>
                  )}
                </div>
              )}
              {downloaderProgress.phase === 'idle' && !downloaderProgress.download?.bytes_done && !downloaderProgress.upload?.bytes_sent && !downloaderProgress.error && (
                <p className="text-gray-500 text-xs">No active job. Start a waiting job to see live progress.</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-gray-400">
                  <span><strong className="text-gray-300">Phase:</strong> {downloaderProgress.phase ?? '—'}</span>
                  {downloaderProgress.jobId != null && <span><strong className="text-gray-300">JobId:</strong> <span className="font-mono truncate max-w-[120px] inline-block align-bottom" title={String(downloaderProgress.jobId)}>{String(downloaderProgress.jobId)}</span></span>}
                  {downloaderProgress.download?.attempt != null && <span><strong className="text-gray-300">Attempt:</strong> {downloaderProgress.download.attempt}</span>}
                  {downloaderProgress.download?.torrent_name != null && <span className="min-w-0" title={downloaderProgress.download.torrent_name}><strong className="text-gray-300">Torrent:</strong> <span className="truncate max-w-[180px] inline-block align-bottom">{downloaderProgress.download.torrent_name}</span></span>}
                  {downloaderProgress.download?.seeders != null && <span><strong className="text-gray-300">Seeders:</strong> {downloaderProgress.download.seeders}</span>}
                  {downloaderProgress.phase === 'downloading' && downloaderProgress.download?.stall_seconds_remaining != null && (
                    <span className="text-amber-300/90" title="No new data for this long will be considered stalled">
                      Stall in {formatStallCountdown(downloaderProgress.download.stall_seconds_remaining)}
                    </span>
                  )}
                </div>
                {downloaderProgress.updatedAt != null && (
                  <div className="text-gray-500 text-xs"><strong className="text-gray-300">UpdatedAt:</strong> {new Date(Number(downloaderProgress.updatedAt) * 1000).toISOString()}</div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-gray-300">Download queue</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-500 text-xs">Size:</span>
                <div className="flex rounded-lg border border-gray-600 overflow-hidden">
                  {BYTE_DISPLAY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setByteDisplayMode(opt.id)
                        try { localStorage.setItem(BYTE_DISPLAY_KEY, opt.id) } catch { /* ignore */ }
                      }}
                      className={`px-2 py-1 text-xs font-medium transition-colors ${byteDisplayMode === opt.id ? 'bg-amber-500/30 text-amber-200 border-amber-500/50' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 border-transparent'}`}
                      title={opt.id === 'dynamic' ? 'B / KB / MB / GB by size' : `Show bytes as ${opt.label}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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
              <ul className="space-y-2 max-h-80 overflow-y-auto">
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
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${queueStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                        {item.status === 'uploading' && (item.uploadChunkIndex != null && item.uploadChunkTotal != null) && (
                          <span className="text-gray-500 text-xs">
                            Chunk {item.uploadChunkIndex}/{item.uploadChunkTotal}
                            {item.uploadProgress != null ? ` · Writing ${item.uploadProgress}%` : ''}
                          </span>
                        )}
                      </div>
                      {/* Downloader progress: only when this row is the job we have progress for (so bar updates with WS data) */}
                      {(item.status === 'downloading' || item.status === 'uploading') && downloaderProgress && (String(downloaderProgress.jobId || '') === String(item.jobId || '') || String(downloaderProgress.jobId || '') === String(item._id || '')) && (
                        <div className="mt-2 space-y-1.5 text-xs">
                          {downloaderProgress.download && (Number(downloaderProgress.download.bytes_done) > 0 || downloaderProgress.download.error) && (
                            <div>
                              {downloaderProgress.explanation && (
                                <p className="text-cyan-200/90 text-xs truncate mb-1" title={downloaderProgress.explanation}>{downloaderProgress.explanation}</p>
                              )}
                              <div className="flex justify-between text-gray-400 flex-wrap gap-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>Download (torrent)</span>
                                  {downloaderProgress.download.attempt != null && (
                                    <span className="text-gray-500">Attempt {downloaderProgress.download.attempt}</span>
                                  )}
                                  {downloaderProgress.download.torrent_name != null && (
                                    <span className="text-gray-500 truncate max-w-[160px]" title={downloaderProgress.download.torrent_name}>{downloaderProgress.download.torrent_name}</span>
                                  )}
                                  {downloaderProgress.download.seeders != null && (
                                    <span className="text-gray-500" title="Seeders (from search when torrent was chosen)">Seeders: {downloaderProgress.download.seeders}</span>
                                  )}
                                </div>
                                <span>
                                  {formatBytesByMode(downloaderProgress.download.bytes_done, byteDisplayMode)}
                                  {downloaderProgress.download.bytes_total != null ? ` / ${formatBytesByMode(downloaderProgress.download.bytes_total, byteDisplayMode)}` : ''}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-cyan-500 transition-[width] duration-300"
                                  style={{
                                    width: (() => {
                                      const total = Number(downloaderProgress.download.bytes_total)
                                      const done = Number(downloaderProgress.download.bytes_done)
                                      if (!total || Number.isNaN(done)) return '0%'
                                      return `${Math.min(100, (done / total) * 100)}%`
                                    })(),
                                  }}
                                />
                              </div>
                              {downloaderProgress.download.stall_seconds_remaining != null && downloaderProgress.phase === 'downloading' && (
                                <p className="text-amber-300/90 text-xs">Stall in {formatStallCountdown(downloaderProgress.download.stall_seconds_remaining)}</p>
                              )}
                              {downloaderProgress.download.error && (
                                <p className="text-red-400 truncate" title={downloaderProgress.download.error}>{downloaderProgress.download.error}</p>
                              )}
                            </div>
                          )}
                          {downloaderProgress.upload && (Number(downloaderProgress.upload.bytes_sent) > 0) && (
                            <div>
                              <div className="flex justify-between text-gray-400">
                                <span>Upload to staging</span>
                                <span>
                                  {downloaderProgress.upload.percent != null ? `${downloaderProgress.upload.percent}%` : ''}
                                  {downloaderProgress.upload.bytes_sent != null && downloaderProgress.upload.bytes_total != null
                                    ? ` · ${formatBytesByMode(downloaderProgress.upload.bytes_sent, byteDisplayMode)} / ${formatBytesByMode(downloaderProgress.upload.bytes_total, byteDisplayMode)}`
                                    : ''}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
                                  style={{ width: `${Number(downloaderProgress.upload.percent) || 0}%` }}
                                />
                              </div>
                              {downloaderProgress.upload.error && (
                                <p className="text-red-400 truncate" title={downloaderProgress.upload.error}>{downloaderProgress.upload.error}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {item.errorMessage && (
                        <p className="text-red-400 text-xs mt-1 truncate" title={item.errorMessage}>{item.errorMessage}</p>
                      )}
                      {item.status === 'uploading' && (item.uploadChunkTotal != null && item.uploadChunkTotal > 0) && !downloaderProgress?.upload?.bytes_sent && (
                        <div className="mt-1.5 space-y-0.5">
                          <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((item.uploadChunkIndex ?? 0) / item.uploadChunkTotal) * 80 + ((item.uploadProgress ?? 0) / 100) * 20
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
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
              <p className="text-gray-500 text-xs">Total: {queueTotal}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <>
          {uploading && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-200/90">
                <p className="font-medium">
                  {uploadStatus === 'writing'
                    ? `Writing to database in progress for “${uploadFileName || 'video'}” - please wait.`
                    : uploadStatus === 'uploading'
                      ? `Upload in progress for “${uploadFileName || 'video'}” — please wait.`
                      : `Upload in progress for “${uploadFileName || 'video'}”.`}
                </p>
                <p className="text-xs text-amber-200/70 mt-1">
                  Status from server: <strong>{uploadStatus === 'writing' ? 'Writing to database' : uploadStatus === 'uploading' ? 'Sending chunks' : uploadStatus || '…'}</strong>
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{uploadChunkInfo ? `Sending chunk ${uploadChunkInfo.current} of ${uploadChunkInfo.total}…` : 'Sending file…'}</span>
                  <span>{uploadProgress != null ? `${uploadProgress}%` : '…'}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500/80 transition-[width] duration-300" style={{ width: `${uploadProgress ?? 0}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Writing to database…</span>
                  <span>{dbProgress != null ? `${dbProgress}%` : '…'}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-[width] duration-300" style={{ width: `${dbProgress ?? 0}%` }} />
                </div>
              </div>
            </div>
          )}
          <SearchMovieForm
            description="Search for a movie by TMDB or IMDB ID. Once found, the result is stored here so upload logic can use it (TMDB id, title, etc.)."
            onMovieSelect={setSelectedMovieForUpload}
            renderActions={
              selectedMovieForUpload
                ? () => (
                  <span className="text-gray-500 text-sm">
                    Selected for upload: TMDB id {selectedMovieForUpload.id}
                    {selectedMovieForUpload.title && ` · ${selectedMovieForUpload.title}`}
                  </span>
                )
                : undefined
            }
          />
          {selectedMovieForUpload && (
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-300">Upload video</h3>

              <div className="text-gray-500 text-sm space-y-1 min-w-0">
                <p>
                  TMDB id: <strong className="text-gray-300">{selectedMovieForUpload.id}</strong>
                  {selectedMovieForUpload.title && (
                    <>
                      {' · '}
                      Title: <strong className="text-gray-300">{selectedMovieForUpload.title}</strong>
                    </>
                  )}
                </p>
                {(selectedMovieForUpload.poster_path || selectedMovieForUpload.poster_url) && (
                  <p className="truncate">
                    Poster path: <strong className="text-gray-300">{selectedMovieForUpload.poster_path || selectedMovieForUpload.poster_url}</strong>
                  </p>
                )}
              </div>


              <div
                role="button"
                tabIndex={0}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-amber-500 bg-amber-500/10' : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => addFile(e.target.files ? Array.from(e.target.files) : null)}
                  aria-label="Choose video file"
                />
                <p className="text-gray-300 text-sm font-medium">
                  {file ? file.name : 'Drop video here or click to browse'}
                </p>
                {file && <p className="text-gray-500 text-xs mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>}
                <p className="text-gray-500 text-xs mt-1">MP4, WebM, MKV · max 5GB</p>
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading…' : 'Upload to staging'}
              </button>

              {uploading && (
                <p className="text-sm text-gray-500">Progress is shown at the top of this page.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SearchUploadTab
