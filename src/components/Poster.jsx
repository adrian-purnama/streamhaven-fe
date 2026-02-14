import { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import axiosInstance from '../helper/apiHelper'
import GenreChip from './GenreChip'
import SaveModal from './SaveModal'
import { usePreferences } from '../context/PreferencesContext'

/**
 * Movie poster card. Synopsis tooltip follows the cursor inside the poster.
 * Tooltip is rendered in a portal so it isn't clipped by overflow on the poster row.
 * If genres are not provided but movie.genre_ids exists, genres are fetched after tooltip is open 3s.
 * @param {object} movie - { _id, poster_url, title, overview?, release_date?, vote_average?, genre_ids? }
 * @param {string[]} genres - optional genre names (e.g. ['Action', 'Drama'])
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} mediaType - 'movie' | 'tv' to link Watch now to /watch/:mediaType/:id
 * @param {string} className - optional extra classes
 */
export default function Poster({ movie, genres = [], size = 'md', mediaType, className = '' }) {

  const containerRef = useRef(null)
  const [cursor, setCursor] = useState({ clientX: 0, clientY: 0, visible: false, allowTransition: false })
  const rafIdRef = useRef(null)
  const latestRef = useRef({ clientX: 0, clientY: 0 })

  const { preferences } = usePreferences()
  const saveButtonPosition = preferences.saveButtonPosition
  const showWatchButton = preferences.showWatchButton
  const showPosterTitle = preferences.showPosterTitle

  const [fetchedGenres, setFetchedGenres] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [genreLoading, setGenreLoading] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveItem, setSaveItem] = useState(null)
  const countdownIntervalRef = useRef(null)
  const fetchTimeoutRef = useRef(null)

  const [showTooltip, setShowTooltip] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setShowTooltip(mq.matches)
    const h = () => setShowTooltip(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  const handleMouseMove = useCallback((e) => {
    latestRef.current = { clientX: e.clientX, clientY: e.clientY }
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        setCursor((prev) => ({
          ...prev,
          clientX: latestRef.current.clientX,
          clientY: latestRef.current.clientY,
          visible: true,
          allowTransition: prev.allowTransition,
        }))
      })
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    setCursor((prev) => ({ ...prev, visible: false, allowTransition: false }))
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
      fetchTimeoutRef.current = null
    }
    setCountdown(null)
    setGenreLoading(false)
  }, [])

  // Clear fetched genres when movie identity changes (defer to avoid synchronous setState in effect)
  const movieGenreKey = movie ? `${movie._id}-${(movie.genre_ids || []).join(',')}` : ''
  useEffect(() => {
    queueMicrotask(() => {
      setFetchedGenres([])
      setCountdown(null)
      setGenreLoading(false)
    })
  }, [movieGenreKey])

  const needGenreFetch = !genres?.length && movie?.genre_ids?.length && mediaType
  const genresToShow = genres?.length ? genres : fetchedGenres

  // 3s debounce: only start countdown when tooltip is visible and we need to fetch and haven't loaded yet
  useEffect(() => {
    if (!cursor.visible || !needGenreFetch || fetchedGenres.length > 0 || genreLoading) return

    const startId = setTimeout(() => {
      setCountdown(1)
      let step = 1
      const intervalId = setInterval(() => {
        step -= 1
        setCountdown(step)
        if (step <= 0) {
          clearInterval(intervalId)
          countdownIntervalRef.current = null
        }
      }, 1000)
      countdownIntervalRef.current = intervalId

      const timeoutId = setTimeout(() => {
        fetchTimeoutRef.current = null
        setCountdown(null)
        setGenreLoading(true)
        const externalSystemIds = movie.genre_ids.map(String).join(',')
        axiosInstance
          .get('/api/genres', { params: { externalSystemIds, genreType: mediaType } })
          .then((res) => {
            const names = (res.data?.data || []).map((g) => g.name).filter(Boolean)
            setFetchedGenres(names)
          })
          .catch(() => setFetchedGenres([]))
          .finally(() => setGenreLoading(false))
      }, 1000)
      fetchTimeoutRef.current = timeoutId
    }, 0)

    return () => {
      clearTimeout(startId)
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
        fetchTimeoutRef.current = null
      }
    }
    // Intentionally omit fetchedGenres.length and genreLoading so we only start timer once per hover
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.visible, needGenreFetch, movie?.genre_ids, mediaType])

  // Enable transform transition only after first paint when visible (so it doesn't animate from 0,0)
  useEffect(() => {
    if (!cursor.visible) return
    const id = requestAnimationFrame(() => {
      setCursor((prev) => (prev.visible ? { ...prev, allowTransition: true } : prev))
    })
    return () => cancelAnimationFrame(id)
  }, [cursor.visible])

  const openSaveModal = useCallback(() => {
    if (!movie) return
    const id = movie.externalId != null ? movie.externalId : movie._id
    setSaveItem({
      externalId: Number(id),
      mediaType: mediaType === 'tv' ? 'tv' : 'movie',
      title: movie.title || '',
      poster_url: movie.poster_url || '',
      category: movie.category,
      vote_average: movie.vote_average,
      release_date: movie.release_date,
      genre_ids: movie.genre_ids,
      overview: movie.overview,
      episode_group: movie.episode_group,
    })
    setCursor((prev) => ({ ...prev, visible: false }))
    setSaveModalOpen(true)
  }, [movie, mediaType])

  if (!movie) return null

  const sizeMap = {
    sm: { wrapper: 'w-full min-w-[90px] sm:min-w-[100px] aspect-[2/3]', panel: 'w-[240px]', panelPx: 240 },
    md: { wrapper: 'w-full min-w-[100px] sm:min-w-[180px] aspect-[2/3]', panel: 'w-[280px]', panelPx: 280 },
    lg: { wrapper: 'w-full min-w-[120px] sm:min-w-[220px] aspect-[2/3]', panel: 'w-[320px]', panelPx: 320 },
  }
  const { wrapper: dims, panel: panelWidth, panelPx } = sizeMap[size] || sizeMap.md

  // Flip tooltip to the left when it would be cut off on the right
  const margin = 16
  const flipRight = typeof window !== 'undefined' && cursor.clientX + panelPx > window.innerWidth - margin
  const tooltipTransform = flipRight
    ? `translate3d(${cursor.clientX}px, ${cursor.clientY}px, 0) translate(-100%, -100%)`
    : `translate3d(${cursor.clientX}px, ${cursor.clientY}px, 0) translateY(-100%)`

  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null
  const rating = movie.vote_average != null ? Number(movie.vote_average).toFixed(1) : null

  const watchUrl =
    mediaType && (movie.externalId != null || movie._id)
      ? mediaType === 'tv'
        ? `/watch/tv/${movie.externalId != null ? movie.externalId : movie._id}/1/1`
        : `/watch/${mediaType}/${movie.externalId != null ? movie.externalId : movie._id}`
      : null

  return (
    <article
      ref={containerRef}
      onMouseMove={showTooltip ? handleMouseMove : undefined}
      onMouseLeave={showTooltip ? handleMouseLeave : undefined}
      className={`group relative shrink-0 ${dims} rounded-md overflow-visible ${className}`}
      aria-label={movie.title}
    >
      {/* Poster image */}
      <div
        className={`relative ${dims} rounded-md overflow-hidden bg-gray-800 ring-1 ring-gray-700/50 transition-all duration-300 ease-out group-hover:ring-2 group-hover:ring-amber-500/90 group-hover:shadow-2xl group-hover:shadow-amber-950/30`}
      >
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            No image
          </div>
        )}
        {/* Hover: gradient bottom → transparent + Watch now button */}
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          aria-hidden
        />
        {/* When showWatchButton is false, clicking poster goes to watch */}
        {!showWatchButton && watchUrl && (
          <Link
            to={watchUrl}
            className="absolute inset-0 z-[1] rounded-xl"
            aria-label={`Watch ${movie.title}`}
          />
        )}
        {/* Top-right save icon (when saveButtonPosition is top_right) */}
        {saveButtonPosition === 'top_right' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openSaveModal()
            }}
            className="absolute top-2 right-2 z-[2] w-9 h-9 rounded-full bg-gray-900/80 border border-gray-600 flex items-center justify-center text-gray-200 hover:bg-gray-800 hover:border-amber-500 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Save to list"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        )}
        {(showWatchButton || saveButtonPosition === 'bottom_center') && (
          <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto z-[2]">
            {showWatchButton && (watchUrl ? (
              <Link
                to={watchUrl}
                className="block w-full py-2 rounded-lg bg-amber-500 text-gray-900 text-sm font-semibold hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors text-center"
              >
                Watch now
              </Link>
            ) : (
              <button
                type="button"
                className="w-full py-2 rounded-lg bg-amber-500 text-gray-900 text-sm font-semibold hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
              >
                Watch now
              </button>
            ))}
            {saveButtonPosition === 'bottom_center' && (
              <button
                type="button"
                onClick={openSaveModal}
                className="w-full py-2 rounded-lg border-2 border-gray-400 bg-transparent text-gray-100 text-sm font-medium hover:border-amber-500 hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
              >
                Save
              </button>
            )}
          </div>
        )}
      </div>
      {showPosterTitle && (
        <div>
          <h5 className="text-center font-bold line-clamp-1 pt-2 pb-4 text-gray-100">{movie.title}</h5>
        </div>
      )}

      {/* Synopsis tooltip — portal to body so it isn't clipped by overflow-x-auto on the row (lg and up only) */}
      {showTooltip && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            className={`fixed z-[9999] ${panelWidth} max-h-[min(80vh,400px)] rounded-xl border border-gray-600/80 bg-gray-900 shadow-2xl flex flex-col overflow-hidden pointer-events-none transition-opacity duration-150 ${
              cursor.visible && !saveModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
            style={{
              left: 0,
              top: 0,
              transform: tooltipTransform,
              transition: cursor.allowTransition
                ? 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                : 'none',
              willChange: 'transform',
            }}
          >
            <div className="p-3 flex flex-col min-h-0 overflow-y-auto">
              <div className="flex items-center gap-2 flex-wrap">
                {mediaType && (
                  <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                    {mediaType === 'tv' ? 'TV' : 'Movie'}
                  </span>
                )}
                <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
                  {movie.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {rating && (
                  <span className="inline-flex items-center gap-0.5 text-amber-400 text-xs font-medium">
                    <span aria-hidden>★</span> {rating}
                  </span>
                )}
                {year && (
                  <span className="text-gray-500 text-xs">{year}</span>
                )}
                {mediaType === 'tv' && movie.episode_group?.episode_count != null && movie.episode_group?.group_count != null && (
                  <span className="text-gray-500 text-xs">
                    {movie.episode_group.group_count} season{movie.episode_group.group_count !== 1 ? 's' : ''} • {movie.episode_group.episode_count} eps
                  </span>
                )}
              </div>

              {(countdown != null || genreLoading || genresToShow.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                  {countdown != null && countdown > 0 && (
                    <span className="text-gray-400 text-xs">
                      Fetching genres in {countdown}…
                    </span>
                  )}
                  {genreLoading && countdown == null && (
                    <span className="text-gray-400 text-xs">Fetching genres now…</span>
                  )}
                  {genresToShow.length > 0 && !genreLoading && (
                    genresToShow.slice(0, 4).map((g) => (
                      <GenreChip key={g} genre={g} className="!text-[10px] !px-2 !py-0.5" />
                    ))
                  )}
                </div>
              )}

              {movie.overview && (
                <p className="text-gray-400 text-xs mt-2 line-clamp-4 leading-relaxed min-h-0">
                  {movie.overview}
                </p>
              )}
            </div>
          </div>,
          document.body
        )}

      <SaveModal
        open={saveModalOpen}
        onClose={() => {
          setSaveModalOpen(false)
          setSaveItem(null)
        }}
        item={saveItem}
      />
    </article>
  )
}
