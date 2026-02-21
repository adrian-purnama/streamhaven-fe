import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Poster from './Poster'

const SCROLL_STEP = 320

/**
 * Netflix-style top 10 popular: hero banner (high-res backdrop) + horizontal poster row.
 * Receives movies from parent (e.g. HomePage fetches and passes top 10 popular).
 */
export default function Top10Popular({ movies = [], loading = false, error = null }) {
  const rowRef = useRef(null)
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [displayBannerUrl, setDisplayBannerUrl] = useState(null)
  const [transitionBannerUrl, setTransitionBannerUrl] = useState(null)
  const [transitionReveal, setTransitionReveal] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const BACKDROP_TRANSITION_MS = 500
  const FEATURED_ROTATE_MS = 10000

  useEffect(() => {
    if (!movies?.length) return
    const id = setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % movies.length)
    }, FEATURED_ROTATE_MS)
    return () => clearInterval(id)
  }, [movies?.length])

  useEffect(() => {
    const m = movies[featuredIndex]
    const newUrl = m?.backdrop_url_high || m?.backdrop_url || null
    if (!newUrl) return
    if (displayBannerUrl === null && featuredIndex === 0) return
    if (newUrl === (transitionBannerUrl || displayBannerUrl)) return
    let cancelled = false
    const raf = requestAnimationFrame(() => {
      if (cancelled) return
      setTransitionBannerUrl(newUrl)
      setTransitionReveal(false)
      requestAnimationFrame(() => {
        if (cancelled) return
        setTransitionReveal(true)
      })
    })
    const t = setTimeout(() => {
      if (cancelled) return
      setDisplayBannerUrl(newUrl)
      setTransitionBannerUrl(null)
      setTransitionReveal(false)
    }, BACKDROP_TRANSITION_MS)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [featuredIndex, movies])

  const updateArrows = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    const threshold = 4
    setCanScrollLeft(el.scrollLeft > threshold)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - threshold)
  }, [])

  useEffect(() => {
    const el = rowRef.current
    if (!el || !movies?.length) return
    updateArrows()
    el.addEventListener('scroll', updateArrows)
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      ro.disconnect()
    }
  }, [movies?.length, updateArrows])

  const scroll = (direction) => {
    rowRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' })
  }
  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full min-h-[40vh] flex items-center justify-center bg-gray-900">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  if (!movies?.length) {
    return (
      <div className="w-full min-h-[40vh] flex items-center justify-center bg-gray-900">
        <p className="text-gray-500">No popular movies yet. Sync from admin to load.</p>
      </div>
    )
  }

  const featured = movies[featuredIndex] ?? movies[0]
  const bannerUrl = featured?.backdrop_url_high || featured?.backdrop_url
  const bottomBanner = displayBannerUrl ?? bannerUrl

  return (
    <section className="w-full bg-gray-950 text-white">
      {/* Hero banner - high-res backdrop with crossfade */}
      <div className="relative w-full h-[56vw] max-h-[85vh] min-h-[320px] bg-gray-900">
        {bottomBanner && (
          <img
            src={bottomBanner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {transitionBannerUrl && (
          <img
            src={transitionBannerUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out"
            style={{ opacity: transitionReveal ? 1 : 0 }}
          />
        )}
        <div className="absolute inset-0 from-gray-900 via-gray-950/60 to-transparent bg-gradient-to-t pointer-events-none" />
        <div className="absolute bottom-[-5rem] sm:bottom-[-1rem] md:bottom-[-20rem] xl:bottom-[-7rem] left-0 right-0 p-6 md:p-10 lg:p-14 flex flex-col justify-end pointer-events-none">
          <div className="pointer-events-auto xl:ml-[5rem] xl:mb-[1rem] max-w-2xl">
            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow-lg">
              {featured?.title}
            </h1>

            {/* Meta badges row */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {featured?.vote_average != null && featured.vote_average > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 text-sm font-semibold backdrop-blur-sm">
                  <span aria-hidden>★</span> {Number(featured.vote_average).toFixed(1)}
                </span>
              )}
              {featured?.release_date && (
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-gray-200 text-sm font-medium backdrop-blur-sm">
                  {new Date(featured.release_date).getFullYear()}
                </span>
              )}
              {featured?.original_language && (
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-gray-300 text-sm font-medium backdrop-blur-sm uppercase">
                  {featured.original_language}
                </span>
              )}
              {featured?.vote_count != null && featured.vote_count > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-gray-400 text-xs font-medium backdrop-blur-sm">
                  {featured.vote_count.toLocaleString()} votes
                </span>
              )}
              {featured?.popularity != null && featured.popularity > 0 && (
                <span className="hidden sm:inline-flex px-2.5 py-1 rounded-md bg-white/10 text-gray-400 text-xs font-medium backdrop-blur-sm">
                  🔥 {Math.round(featured.popularity)}
                </span>
              )}
            </div>

            {/* Overview */}
            {featured?.overview && (
              <p className="text-gray-300 mt-3 max-w-xl line-clamp-3 text-sm md:text-base leading-relaxed">
                {featured.overview}
              </p>
            )}

            {/* Watch now button */}
            {featured && (featured.externalId || featured._id) && (
              <Link
                to={`/watch/movie/${featured.externalId ?? featured._id}`}
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg bg-amber-500 text-gray-900 font-semibold text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch now
              </Link>
            )}
          </div>

          <div className="hidden md:block">

            {/* Top 10 horizontal row — Netflix style: auto-scrolling carousel */}
            <div className="pointer-events-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 relative overflow-x-visible overflow-y-hidden">
              <div className="relative -mx-4 md:-mx-6 lg:-mx-8">
                <div
                  ref={rowRef}
                  className="overflow-x-auto overflow-y-hidden relative z-0 flex gap-3 pb-2 px-4 md:px-6 lg:px-8 pt-2 scroll-smooth [&::-webkit-scrollbar]:hidden"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  
                  {movies.map((m, index) => (
                    <div
                      key={m._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setFeaturedIndex(index)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFeaturedIndex(index) } }}
                      className={`relative cursor-pointer ${index === 9 ? 'mx-25' : 'mx-15'} ${featuredIndex === index ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-gray-950 rounded-xl' : ''}`}
                    >
                      <h1 className={`${index === 9 ? ' left-[-10rem]' : ' left-[-7rem]'} absolute top-[-2rem] z-30 font-bold text-[15rem] tracking-[-1rem] opacity-50 select-none font-carre`}>{index + 1}</h1>
                      <Poster movie={m} size="md" mediaType="movie" className="shrink-0 z-31" />
                    </div>
                  ))}
                </div>

                {/* Left arrow */}
                <button
                  type="button"
                  onClick={() => canScrollLeft && scroll(-1)}
                  disabled={!canScrollLeft}
                  aria-label="Scroll left"
                  className={`absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-gray-900/90 text-white border border-gray-600 shadow-lg transition-opacity focus:outline-none focus:ring-2 focus:ring-amber-500 ${canScrollLeft ? 'opacity-90 hover:opacity-100 hover:bg-gray-800' : 'opacity-40 cursor-default pointer-events-none'}`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                </button>
                {/* Right arrow */}
                <button
                  type="button"
                  onClick={() => canScrollRight && scroll(1)}
                  disabled={!canScrollRight}
                  aria-label="Scroll right"
                  className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-gray-900/90 text-white border border-gray-600 shadow-lg transition-opacity focus:outline-none focus:ring-2 focus:ring-amber-500 ${canScrollRight ? 'opacity-90 hover:opacity-100 hover:bg-gray-800' : 'opacity-40 cursor-default pointer-events-none'}`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
