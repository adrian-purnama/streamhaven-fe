import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import SearchMovieForm from '../forms/SearchMovieForm'
import { baseURL } from '../../helper/apiHelper'

const ACCEPT = 'video/mp4,video/webm,video/x-matroska,.mp4,.webm,.mkv'

function SearchUploadTab({ onUploadingChange }) {
  const [selectedMovieForUpload, setSelectedMovieForUpload] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // 0–100 sending file
  const [uploadChunkInfo, setUploadChunkInfo] = useState(null) // { current, total } for "chunk X of Y"
  const [dbProgress, setDbProgress] = useState(null) // 0–100 writing to DB
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

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

  const CHUNK_SIZE = 90 * 1024 * 1024 // 90 MB (under Cloudflare 100MB)

  const handleUpload = async () => {
    if (!selectedMovieForUpload?.id || !file) {
      toast.error('Select a movie and choose a video file')
      return
    }
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE) || 1
    setUploading(true)
    setUploadProgress(0)
    setUploadChunkInfo({ current: 0, total: totalChunks })
    setDbProgress(null)
    if (typeof onUploadingChange === 'function') onUploadingChange(true)

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fc-token') : null
    const uploadId = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const url = `${baseURL}/api/staging/upload-chunk`
    const posterPath = selectedMovieForUpload.poster_path ?? selectedMovieForUpload.poster_url ?? ''

    const done = (success = false) => {
      setUploading(false)
      setUploadProgress(null)
      setUploadChunkInfo(null)
      setDbProgress(null)
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
                if (data.stage === 'writing' && typeof data.progress === 'number') setDbProgress(data.progress)
                if (data.stage === 'done') setDbProgress(100)
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
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {uploadChunkInfo
                      ? `Sending chunk ${uploadChunkInfo.current} of ${uploadChunkInfo.total}…`
                      : 'Sending file…'}
                  </span>
                  <span>{uploadProgress != null ? `${uploadProgress}%` : '…'}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500/80 transition-[width] duration-300 ease-out"
                    style={{ width: `${uploadProgress ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Writing to database…</span>
                  <span>{dbProgress != null ? `${dbProgress}%` : '…'}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-[width] duration-300 ease-out"
                    style={{ width: `${dbProgress ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchUploadTab
