import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import SearchMovieForm from '../forms/SearchMovieForm'
import { baseURL } from '../../helper/apiHelper'

const ACCEPT = 'video/mp4,video/webm,video/x-matroska,.mp4,.webm,.mkv'
const STAGING_UPLOAD_KEY = 'stagingUpload' // { uploadId, fileName, totalChunks, startedAt } – for resume/poll after reload
const UPLOAD_STATUS_POLL_MS = 2500

function SearchUploadTab({ onUploadingChange }) {
  const [selectedMovieForUpload, setSelectedMovieForUpload] = useState(null)
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

  return (
    <div className="p-6 space-y-6">
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
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-amber-500 bg-amber-500/10' : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
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
    </div>
  )
}

export default SearchUploadTab
