import { useState, useRef, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import SearchMovieForm from '../forms/SearchMovieForm'
import SearchableDropdown from '../SearchableDropdown'
import Modal from '../Modal'
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

/**
 * One row per series; expandable by show → season → episode. Episodes loaded when season is expanded.
 */
function SeriesQueueGroup({
  show,
  getEpisodesForSeason,
  onExpandSeason,
  queueStatusBadgeClass,
  onDelete,
  onDeleteAll,
  onDeleteSeason,
  updateQueueQuality,
  QUALITY_OPTIONS,
  SearchableDropdown,
}) {
  const [showOpen, setShowOpen] = useState(false)
  const [seasonOpen, setSeasonOpen] = useState({})
  const toggleSeason = (num) => {
    setSeasonOpen((o) => ({ ...o, [num]: !o[num] }))
    if (onExpandSeason) onExpandSeason(num)
  }
  const seasons = show.seasons || []
  const totalEpisodes = show.totalEpisodes ?? seasons.reduce((acc, s) => acc + (s.episodeCount ?? 0), 0)
  const downloadedCount = show.downloadedCount ?? seasons.reduce((acc, s) => acc + (s.downloadedCount ?? 0), 0)
  const anyInProgress = show.hasInProgress === true

  return (
    <li className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 py-2 px-3">
        <button
          type="button"
          onClick={() => setShowOpen((o) => !o)}
          className="flex-1 flex items-center gap-3 text-left hover:bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-0"
        >
          <span className="text-gray-400 shrink-0">{showOpen ? '▼' : '▶'}</span>
          <div className="w-12 h-[72px] shrink-0 rounded overflow-hidden bg-gray-700">
            {show.poster_url ? (
              <img src={show.poster_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No poster</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-200 text-sm font-medium truncate">{show.showTitle}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {seasons.length} season{seasons.length !== 1 ? 's' : ''} · {totalEpisodes} episode{totalEpisodes !== 1 ? 's' : ''}
              {totalEpisodes > 0 && (
                <span className="text-gray-400 ml-1">
                  · {downloadedCount} of {totalEpisodes} downloaded
                </span>
              )}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeleteAll?.(show) }}
          disabled={anyInProgress}
          className="shrink-0 px-2 py-1 rounded text-red-400 hover:bg-red-500/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title={anyInProgress ? 'Cannot delete while an episode is downloading or uploading' : 'Remove all episodes from queue'}
        >
          Delete all
        </button>
      </div>
      {showOpen && (
        <div className="border-t border-gray-700 bg-gray-800/80">
          {seasons.map((season) => {
            const sn = season.seasonNumber
            const open = seasonOpen[sn]
            const eps = getEpisodesForSeason ? getEpisodesForSeason(sn) : []
            const episodeCount = season.episodeCount ?? eps.length
            const seasonInProgress = eps.some((ep) => ep.status === 'downloading' || ep.status === 'uploading')
            const seasonPosterUrl = season.seasonPosterUrl || eps[0]?.seasonPosterUrl || eps[0]?.poster_url || show.poster_url
            return (
              <div key={sn} className="border-b border-gray-700/50 last:border-b-0">
                <div className="flex items-center gap-2 py-1.5 px-3 pl-8">
                  <button
                    type="button"
                    onClick={() => toggleSeason(sn)}
                    className="flex-1 flex items-center gap-2 text-left hover:bg-gray-700/30 text-gray-300 text-sm min-w-0 rounded"
                  >
                    <span className="text-gray-500 shrink-0">{open ? '▼' : '▶'}</span>
                    {seasonPosterUrl ? (
                      <img src={seasonPosterUrl} alt="" className="w-10 h-14 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-10 h-14 rounded bg-gray-700 shrink-0" />
                    )}
                    <span>Season {sn}</span>
                    <span className="text-gray-500 text-xs">({episodeCount} episodes)</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDeleteSeason?.(show._id, sn) }}
                    disabled={seasonInProgress || episodeCount === 0}
                    className="shrink-0 px-2 py-1 rounded text-red-400 hover:bg-red-500/20 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title={seasonInProgress ? 'Cannot delete while an episode is downloading or uploading' : `Remove Season ${sn} from queue`}
                  >
                    Delete season
                  </button>
                </div>
                {open && (
                  <ul className="pb-2">
                    {eps.map((ep) => (
                      <li
                        key={ep._id}
                        className="flex items-center gap-3 py-1.5 px-3 pl-14 bg-gray-900/40 border-t border-gray-700/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-300 text-sm truncate">{ep.title}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${queueStatusBadgeClass(ep.status)}`}>
                              {ep.status}
                            </span>
                            {(ep.status === 'pending' || ep.status === 'waiting') ? (
                              <div className="w-28">
                                <SearchableDropdown
                                  options={QUALITY_OPTIONS}
                                  valueKey="value"
                                  labelKey="label"
                                  value={ep.quality || 'high'}
                                  onChange={(val) => updateQueueQuality(ep._id, val)}
                                  placeholder="Quality"
                                />
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium border bg-gray-600/20 text-gray-400 border-gray-500/40 capitalize">
                                {ep.quality || 'high'}
                              </span>
                            )}
                          </div>
                          {ep.errorMessage && (
                            <p className="text-red-400 text-xs mt-0.5 truncate" title={ep.errorMessage}>{ep.errorMessage}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onDelete(ep._id)}
                          disabled={ep.status === 'downloading' || ep.status === 'uploading'}
                          className="shrink-0 px-2 py-1 rounded text-red-400 hover:bg-red-500/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title={ep.status === 'downloading' || ep.status === 'uploading' ? 'Cannot delete while in progress' : 'Remove from queue'}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </li>
  )
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
  /** Episodes loaded when a season is expanded: { [parentId]: { [seasonNumber]: episode[] } } */
  const [episodesByParentSeason, setEpisodesByParentSeason] = useState({})
  const [etaDownloadSec, setEtaDownloadSec] = useState(null)
  const [etaUploadSec, setEtaUploadSec] = useState(null)
  const [failedModalOpen, setFailedModalOpen] = useState(false)
  const [failedList, setFailedList] = useState(null)
  const [failedLoading, setFailedLoading] = useState(false)
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

  const fetchEpisodesForSeason = async (parentId, seasonNumber) => {
    const pid = String(parentId)
    const sn = Number(seasonNumber)
    if (episodesByParentSeason[pid]?.[sn] != null) return
    try {
      const res = await apiHelper.get('/api/download-queue/episodes', { params: { parentId: pid, seasonNumber: sn } })
      const episodes = res.data?.data?.episodes ?? []
      setEpisodesByParentSeason((prev) => ({
        ...prev,
        [pid]: { ...(prev[pid] || {}), [sn]: episodes },
      }))
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load episodes')
      setEpisodesByParentSeason((prev) => ({ ...prev, [pid]: { ...(prev[pid] || {}), [sn]: [] } }))
    }
  }

  useEffect(() => {
    if (activeTab === 'queue') fetchQueue(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch on tab switch
  }, [activeTab])

  useEffect(() => {
    if (!failedModalOpen) {
      setFailedList(null)
      return
    }
    setFailedLoading(true)
    apiHelper
      .get('/api/download-queue/failed')
      .then((res) => {
        const data = res.data?.data || {}
        setFailedList({ movies: data.movies || [], episodes: data.episodes || [] })
      })
      .catch(() => {
        toast.error('Failed to load failed items')
        setFailedList({ movies: [], episodes: [] })
      })
      .finally(() => setFailedLoading(false))
  }, [failedModalOpen])

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

  const queueRows = useMemo(() => {
    return queueList
      .map((item) => {
        if (item.mediaType === 'tv') {
          return { type: 'series', show: item, sortAt: item.createdAt ? new Date(item.createdAt).getTime() : 0 }
        }
        return { type: 'movie', item, sortAt: item.createdAt ? new Date(item.createdAt).getTime() : 0 }
      })
      .sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0))
  }, [queueList])

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
            // Update cached episodes so expanded season view reflects live status
            if (job._id) {
              setEpisodesByParentSeason((prev) => {
                let updated = false
                const next = {}
                for (const [pid, seasons] of Object.entries(prev)) {
                  next[pid] = {}
                  for (const [sn, episodes] of Object.entries(seasons)) {
                    const list = episodes.map((ep) =>
                      ep._id === job._id ? ((updated = true), { ...ep, ...job }) : ep
                    )
                    next[pid][sn] = list
                  }
                }
                return updated ? next : prev
              })
            }
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
    const name = movie?.title ?? movie?.name
    if (!name && !movie?.id) {
      toast.error('Search and select a movie or series first')
      return
    }
    const releaseYear = (movie.release_date || movie.first_air_date) ? new Date(movie.release_date || movie.first_air_date).getFullYear() : null
    const title = name ? `${name}${releaseYear ? ` ${releaseYear}` : ''}`.trim() : `TMDB ${movie.id}`
    const isTv = movie.mediaType === 'tv'
    const seasons = Array.isArray(movie.seasons) ? movie.seasons : []
    const hasSeasons = isTv && seasons.length > 0
    const payload = {
      title,
      tmdbId: movie.id ?? null,
      poster_path: movie.poster_path || null,
      year: releaseYear,
      mediaType: isTv ? 'tv' : 'movie',
    }
    if (hasSeasons) {
      payload.seasons = seasons.map((s) => ({
        seasonNumber: s.season_number,
        episodeCount: s.episode_count ?? 0,
        seasonName: s.name,
        seasonPosterPath: s.poster_path ?? null,
      }))
    }
    const toastId = 'add-to-download-queue'
    toast.loading('Adding to download queue…', { id: toastId })
    try {
      const res = await apiHelper.post('/api/download-queue', payload)
      const data = res.data?.data || {}
      const created = data.created
      const nothingNew = data.nothingNew === true
      if (nothingNew) {
        toast.success('Show is complete. Nothing new here.', { id: toastId })
      } else if (typeof created === 'number' && created > 1) {
        toast.success(`Added ${created} episodes to download queue`, { id: toastId })
      } else if (typeof created === 'number' && created === 1) {
        toast.success('Added 1 episode to download queue', { id: toastId })
      } else {
        toast.success('Added to download queue', { id: toastId })
      }
      setQueueMovie(null)
      fetchQueue(1)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add to queue', { id: toastId })
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

  const resetAllFailed = async () => {
    try {
      const res = await apiHelper.post('/api/download-queue/reset-failed')
      const data = res.data?.data || {}
      const movies = data.resetMovies ?? 0
      const episodes = data.resetEpisodes ?? 0
      const total = movies + episodes
      if (total === 0) {
        toast.success('No failed items to retry')
      } else {
        toast.success(`Moved ${total} item${total !== 1 ? 's' : ''} back to pending`)
      }
      setFailedModalOpen(false)
      fetchQueue(queuePage)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to retry')
    }
  }

  const deleteShowFromQueue = async (show) => {
    const parentId = show._id
    if (!parentId) return
    try {
      await apiHelper.delete(`/api/download-queue/${parentId}`)
      toast.success('Removed series from queue')
      setEpisodesByParentSeason((prev) => {
        const next = { ...prev }
        delete next[String(parentId)]
        return next
      })
      fetchQueue()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to remove')
    }
  }

  const deleteSeasonFromQueue = async (parentId, seasonNumber) => {
    if (!parentId || seasonNumber == null) return
    try {
      const res = await apiHelper.delete('/api/download-queue/episodes', {
        params: { parentId: String(parentId), seasonNumber: Number(seasonNumber) },
      })
      const deleted = res.data?.data?.deleted ?? 0
      toast.success(deleted === 1 ? 'Removed 1 episode from queue' : `Removed ${deleted} episodes from queue`)
      setEpisodesByParentSeason((prev) => {
        const next = { ...prev }
        const pid = String(parentId)
        if (next[pid]) {
          const seasons = { ...next[pid] }
          delete seasons[seasonNumber]
          next[pid] = Object.keys(seasons).length ? seasons : undefined
          if (!next[pid]) delete next[pid]
        }
        return next
      })
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

  const hasPendingMovies = queueList.some((i) => i.mediaType === 'movie' && i.status === 'pending')
  const hasPendingSeries = queueList
    .filter((i) => i.mediaType === 'tv')
    .reduce((sum, i) => sum + (i.pendingCount ?? 0), 0) > 0
  const hasPendingAny = hasPendingMovies || hasPendingSeries
  const hasWaitingAny =
    queueList.some((i) => i.mediaType === 'movie' && i.status === 'waiting') ||
    queueList.filter((i) => i.mediaType === 'tv').reduce((s, i) => s + (i.waitingCount ?? 0), 0) > 0

  const hasFailedAny = useMemo(
    () =>
      queueList.some((i) => i.mediaType === 'movie' && i.status === 'failed') ||
      queueList.filter((i) => i.mediaType === 'tv').some((i) => (i.failedCount ?? 0) > 0),
    [queueList]
  )

  const processNext = async (type) => {
    setProcessing(true)
    try {
      const res = await apiHelper.post('/api/download-queue/process', {}, { params: { type } })
      const data = res.data?.data || {}
      const moved = data.moved ?? 0
      const movedMovies = data.movedMovies ?? 0
      const movedEpisodes = data.movedEpisodes ?? 0
      if (moved === 0) {
        toast.success('Nothing pending to move')
      } else if (type === 'movie') {
        toast.success(movedMovies === 1 ? 'Moved 1 movie to waiting' : `Moved ${movedMovies} movies to waiting`)
      } else if (type === 'tv') {
        toast.success(movedEpisodes === 1 ? 'Moved 1 episode to waiting' : `Moved ${movedEpisodes} episodes to waiting`)
      } else {
        toast.success(moved === 1 ? 'Moved 1 item to waiting' : `Moved ${moved} items to waiting`)
      }
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
            description="Search for a movie or TV series by TMDB or IMDB ID, then add it to the download queue (torrent → staging)."
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
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium text-gray-300">Download queue</h3>
                <button
                  type="button"
                  onClick={() => setFailedModalOpen(true)}
                  disabled={queueLoading || !hasFailedAny}
                  className="px-2.5 py-1 rounded-lg border border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Open list of failed items"
                >
                  Show failed
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => processNext('both')}
                  disabled={processing || queueLoading || !hasPendingAny}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-gray-900 text-sm font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move all pending (movies + series) to waiting"
                >
                  {processing ? '…' : 'Move both'}
                </button>
                <button
                  type="button"
                  onClick={() => processNext('tv')}
                  disabled={processing || queueLoading || !hasPendingSeries}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-gray-100 text-sm font-medium hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move pending series episodes to waiting"
                >
                  {processing ? '…' : 'Move series'}
                </button>
                <button
                  type="button"
                  onClick={() => processNext('movie')}
                  disabled={processing || queueLoading || !hasPendingMovies}
                  className="px-3 py-1.5 rounded-lg bg-amber-700 text-gray-100 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move pending movies to waiting"
                >
                  {processing ? '…' : 'Move movies'}
                </button>
                <button
                  type="button"
                  onClick={startNext}
                  disabled={processing || queueLoading || !hasWaitingAny}
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
                {queueRows.map((row) =>
                  row.type === 'movie' ? (
                    <li
                      key={row.item._id}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-800 border border-gray-700"
                    >
                      <div className="w-12 h-[72px] shrink-0 rounded overflow-hidden bg-gray-700">
                        {row.item.poster_url ? (
                          <img src={row.item.poster_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No poster</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-200 text-sm font-medium truncate">{row.item.title}</p>
                        {(row.item.requesterType || row.item.requesterEmail) && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {row.item.requesterType}
                            {row.item.requesterEmail && ` · ${row.item.requesterEmail}`}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${queueStatusBadgeClass(row.item.status)}`}>
                            {row.item.status}
                          </span>
                          {(row.item.status === 'pending' || row.item.status === 'waiting') ? (
                            <div className="w-28">
                              <SearchableDropdown
                                options={QUALITY_OPTIONS}
                                valueKey="value"
                                labelKey="label"
                                value={row.item.quality || 'high'}
                                onChange={(val) => updateQueueQuality(row.item._id, val)}
                                placeholder="Quality"
                              />
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium border bg-gray-600/20 text-gray-400 border-gray-500/40 capitalize">
                              {row.item.quality || 'high'}
                            </span>
                          )}
                        </div>
                        {row.item.errorMessage && (
                          <p className="text-red-400 text-xs mt-1 truncate" title={row.item.errorMessage}>{row.item.errorMessage}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteQueueItem(row.item._id)}
                        disabled={row.item.status === 'downloading' || row.item.status === 'uploading'}
                        className="shrink-0 px-2 py-1 rounded text-red-400 hover:bg-red-500/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title={row.item.status === 'downloading' || row.item.status === 'uploading' ? 'Cannot delete while in progress' : 'Remove from queue'}
                      >
                        Delete
                      </button>
                    </li>
                  ) : (
                    <SeriesQueueGroup
                      key={row.show._id}
                      show={row.show}
                      getEpisodesForSeason={(sn) => (episodesByParentSeason[String(row.show._id)] || {})[sn] ?? []}
                      onExpandSeason={(sn) => fetchEpisodesForSeason(row.show._id, sn)}
                      queueStatusBadgeClass={queueStatusBadgeClass}
                      onDelete={deleteQueueItem}
                      onDeleteAll={deleteShowFromQueue}
                      onDeleteSeason={deleteSeasonFromQueue}
                      updateQueueQuality={updateQueueQuality}
                      QUALITY_OPTIONS={QUALITY_OPTIONS}
                      SearchableDropdown={SearchableDropdown}
                    />
                  )
                )}
              </ul>
            )}
            {queueTotal > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <p className="text-gray-500 text-sm">
                  {(queuePage - 1) * queueLimit + 1}–{Math.min(queuePage * queueLimit, queueTotal)} of {queueTotal}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fetchQueue(queuePage - 1)}
                    disabled={queueLoading || queuePage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchQueue(queuePage + 1)}
                    disabled={queueLoading || queuePage * queueLimit >= queueTotal}
                    className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={failedModalOpen}
        onClose={() => setFailedModalOpen(false)}
        title="Failed items"
      >
        {failedLoading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : failedList ? (
          <div className="space-y-4">
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {(failedList.movies || []).map((m) => (
                <li key={m._id} className="flex items-center gap-2 py-1.5 text-sm text-gray-300">
                  <span className="text-gray-500 shrink-0">Movie</span>
                  <span className="truncate">{m.title}</span>
                  {m.errorMessage && (
                    <span className="text-red-400 text-xs truncate max-w-[200px]" title={m.errorMessage}>{m.errorMessage}</span>
                  )}
                </li>
              ))}
              {(failedList.episodes || []).map((ep) => (
                <li key={ep._id} className="flex items-center gap-2 py-1.5 text-sm text-gray-300">
                  <span className="text-gray-500 shrink-0">Episode</span>
                  <span className="truncate">{ep.showTitle} S{ep.seasonNumber}E{ep.episodeNumber}</span>
                  {ep.errorMessage && (
                    <span className="text-red-400 text-xs truncate max-w-[200px]" title={ep.errorMessage}>{ep.errorMessage}</span>
                  )}
                </li>
              ))}
            </ul>
            {((failedList.movies?.length || 0) + (failedList.episodes?.length || 0)) === 0 ? (
              <p className="text-gray-500 text-sm">No failed items.</p>
            ) : (
              <button
                type="button"
                onClick={resetAllFailed}
                className="w-full py-2.5 rounded-lg bg-amber-500 text-gray-900 font-medium text-sm hover:bg-amber-400"
              >
                Retry all (move to pending)
              </button>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default SearchUploadTab
