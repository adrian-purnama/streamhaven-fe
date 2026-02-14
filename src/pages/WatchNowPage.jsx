import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import apiHelper from '../helper/apiHelper'
import { getRedirectToLastWatched, setLastWatchedEpisode, isEpisodeWatched } from '../helper/lastWatchedHelper'
import GenreChip from '../components/GenreChip'
import Poster from '../components/Poster'
import PosterGrid from '../components/PosterGrid'
import Seasons from '../components/Seasons'
import Country from '../components/Country'
import SaveModal from '../components/SaveModal'

/** Format YYYY-MM-DD to "Mon DD, YYYY" (e.g. Feb 15, 2026) */
function formatAirDate(airDate) {
  if (!airDate || typeof airDate !== 'string') return ''
  const d = new Date(airDate)
  if (Number.isNaN(d.getTime())) return airDate
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function WatchNowPage() {
  const { mediaType, id, ss = '1', eps = '1' } = useParams()
  const navigate = useNavigate()
  const [media, setMedia] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [infoExpanded, setInfoExpanded] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id, mediaType, ss, eps])

  useEffect(() => {
    const currentId = ++requestIdRef.current
    if (!id || !mediaType) {
      queueMicrotask(() => {
        setError('Invalid link')
        setLoading(false)
      })
      return
    }
    const season = Math.max(1, parseInt(ss, 10) || 1)
    const episode = Math.max(1, parseInt(eps, 10) || 1)
    const apiPath = mediaType === 'tv' ? '/api/tv' : '/api/movies'
    const tvUrl = mediaType === 'tv' ? `${apiPath}/${id}/${season}/${episode}` : `${apiPath}/${id}`
    queueMicrotask(() => {
      setLoading(true)
      setError(null)
      setMedia(null)
      setSelectedIndex(0)
    })

    apiHelper
      .get(tvUrl)
      .then((res) => {
        if (currentId !== requestIdRef.current) return
        setMedia(res.data?.data ?? null)
      })
      .catch((err) => {
        if (currentId !== requestIdRef.current) return
        setError(err.response?.data?.message || err.message || 'Failed to load')
      })
      .finally(() => {
        if (currentId !== requestIdRef.current) return
        setLoading(false)
      })
  }, [id, mediaType, ss, eps])

  // TV: resume last watched when opening show at default (1/1); always save current episode
  useEffect(() => {
    if (!media || mediaType !== 'tv' || !id) return
    const season = Number.isNaN(parseInt(ss, 10)) ? 1 : Math.max(0, parseInt(ss, 10))
    const episode = Math.max(1, parseInt(eps, 10) || 1)
    const redirect = getRedirectToLastWatched(id, season, episode)
    if (redirect) {
      navigate(redirect, { replace: true })
      return
    }
    setLastWatchedEpisode(id, season, episode)
  }, [media, mediaType, id, ss, eps, navigate])

  const saveItem = useMemo(() => {
    if (!media || !id) return null
    const isTv = mediaType === 'tv'
    return {
      externalId: Number(id),
      mediaType: isTv ? 'tv' : 'movie',
      title: media.title || '',
      poster_url: media.poster_url || '',
      category: media.category || '',
      vote_average: media.vote_average ?? 0,
      release_date: media.release_date || '',
      genre_ids: Array.isArray(media.genre_ids) ? media.genre_ids : (Array.isArray(media.genres) ? media.genres.map((g) => g.id).filter(Boolean) : []),
      overview: media.overview || '',
      episode_group: isTv
        ? { episode_count: media.number_of_episodes ?? 0, group_count: media.number_of_seasons ?? 0 }
        : { episode_count: 0, group_count: 0 },
    }
  }, [media, id, mediaType])

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      navigate(-1)
    } else {
      navigate('/home')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (error || !media) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4">
        <p className="text-red-400 text-center">{error || 'Not found'}</p>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 text-sm font-medium hover:bg-gray-700 hover:border-amber-500/50 hover:text-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-950"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>
    )
  }

  // watchLinks from API: res.data.data.watchLinks → [{ label, link }, ...]
  const watchLinks = media.watchLinks ?? []
  const isTv = mediaType === 'tv'
  const parsedSs = parseInt(ss, 10)
  const currentSeasonNum = isTv ? (Number.isNaN(parsedSs) ? 1 : Math.max(0, parsedSs)) : 0
  const currentEpsNum = isTv ? Math.max(1, parseInt(eps, 10) || 1) : 1
  const currentSeasonData = isTv && Array.isArray(media.seasons)
    ? media.seasons.find((s) => (s.season_number ?? 0) === currentSeasonNum)
    : null
  const episodeCount = currentSeasonData?.episode_count ?? 0
  const nextEpisode = isTv ? (media.next_episode_to_air ?? null) : null

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col pb-10">
      {/* Header */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-900">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-amber-400 hover:bg-gray-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        {saveItem && (
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-500 bg-gray-800 text-gray-200 text-sm font-medium hover:border-amber-500 hover:bg-gray-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Save to list
          </button>
        )}
      </header>



      {/* Server switcher */}
      {/* {watchLinks.length > 1 && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-900/80 border-b border-gray-800">
          <span className="text-xs text-gray-500 mr-1">Server:</span>
          {watchLinks.map((server, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedIndex === i
                  ? 'bg-amber-500 text-gray-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
            >
              {server.label || `Server ${i + 1}`}
            </button>
          ))}
        </div>
      )} */}

      <div className={`flex-1 min-h-0 w-full flex ${isTv ? 'flex-col md:flex-row' : 'flex-col'} max-w-6xl mx-auto`}>
        {/* TV: flex layout — mobile = frame → episodes → rest; md = [episodes | frame] then rest */}
        {isTv && episodeCount > 0 ? (
          <div className="flex-1 min-h-0 min-w-0 flex flex-col w-full">
            
            {/* Top band: episodes + frame — md: fixed height so row can't grow; frame + episodes align, episodes scroll */}
            <div className="flex flex-col md:flex-row md:h-[70vh] md:min-h-0 shrink-0">
              {/* Frame: mobile first, md second (takes remaining space); on md constrained so band stays 70vh */}
              <div className="order-1 md:order-2 flex-1 min-w-0 min-h-0 mx-4 md:overflow-hidden flex md:items-center md:justify-center">
                <div className="relative w-full aspect-[19/9] md:h-full md:max-h-full md:w-auto md:aspect-[19/9] bg-gray-800 rounded-lg overflow-hidden">
                  {watchLinks[selectedIndex]?.link ? (
                    <iframe
                      src={watchLinks[selectedIndex].link}
                      className="absolute inset-0 w-full h-full border-0 rounded-lg"
                      title={`Watch ${media.title}`}
                      allowFullScreen
                      referrerPolicy="origin"
                    />
                  ) : null}
                </div>
              </div>
              {/* Episodes: mobile second (under frame), md first — same height as frame, scrollable */}
              <aside className="order-2 md:order-1 shrink-0 w-full md:w-44 py-4 pl-4 pr-2 md:border-r border-gray-800 max-h-56 md:max-h-full border-b md:border-b-0 flex flex-col min-h-0 md:overflow-hidden">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 sticky top-0 bg-gray-900 py-1 shrink-0">
                  Episodes
                </h3>
                <nav className="flex flex-col min-h-0 overflow-y-auto flex-1 scrollbar-sleek" aria-label="Episode list">
                  {Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => {
                    const isActive = ep === currentEpsNum
                    const watched = isEpisodeWatched(id, currentSeasonNum, ep)
                    return (
                      <Link
                        key={ep}
                        to={`/watch/tv/${id}/${currentSeasonNum}/${ep}`}
                        className={`block py-2 px-3 text-sm transition-colors shrink-0 border-b border-gray-700 ${isActive
                            ? 'bg-amber-500/20 text-amber-400 font-medium'
                            : watched
                              ? 'text-emerald-400/90 hover:bg-gray-800 hover:text-emerald-300 bg-white-900'
                              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                      >
                        E{ep}
                      </Link>
                    )
                  })}
                </nav>
              </aside>

              
            </div>
            {/* Next episode to air banner (TV only) */}
            {nextEpisode && (nextEpisode.air_date || nextEpisode.name) && (
              <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-200/90 mt-4">
                <CalendarClock className="w-5 h-5 shrink-0 text-amber-400" aria-hidden />
                <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm">
                  <span className="font-medium">Next episode</span>
                  {nextEpisode.season_number != null && nextEpisode.episode_number != null && (
                    <span className="text-amber-300/90">S{nextEpisode.season_number} E{nextEpisode.episode_number}</span>
                  )}
                  {nextEpisode.name && <span className="text-gray-300">— {nextEpisode.name}</span>}
                  {nextEpisode.air_date && (
                    <span className="text-gray-400">· Airs {formatAirDate(nextEpisode.air_date)}</span>
                  )}
                  <p>🥳</p>
                </div>
              </div>
            )}

            {/* Rest (servers, title, overview, etc.) */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="mx-4 flex-1">
                <div className="flex flex-wrap gap-2 items-center mt-4">
                  <h3 className="text-lg font-bold mr-2">Servers</h3>
                  {watchLinks.length === 0 ? (
                    <p className="text-gray-500 text-sm">No servers configured</p>
                  ) : (
                    watchLinks.map((server, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedIndex(i)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedIndex === i
                            ? 'bg-amber-500 text-gray-900'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          }`}
                      >
                        {server.label || `Server ${i + 1}`}
                      </button>
                    ))
                  )}
                </div>

                <h1 className="text-[2rem] font-bold mt-4 mb-4 pt-2 border-t border-gray-700 text-gray-200">
                  {media.title}
                </h1>
                {media.overview && (
                  <div className="flex items-start gap-4">
                    {media.poster_url && (
                      <img src={media.poster_url} alt={media.title} className="w-[10rem] shrink-0 rounded object-cover" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className={`text-sm text-gray-400 leading-relaxed ${infoExpanded ? '' : 'line-clamp-3'}`}>
                        {media.overview}
                      </p>

                      {/* Basic info — always visible */}
                      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                        {media.release_date && (
                          <>
                            <dt className="text-gray-500">Release date</dt>
                            <dd className="text-gray-300">{media.release_date}</dd>
                          </>
                        )}
                        {media.vote_average != null && (
                          <>
                            <dt className="text-gray-500">Rating</dt>
                            <dd className="text-gray-300">
                              <span className="text-amber-400">★</span> {Number(media.vote_average).toFixed(1)}
                              {media.vote_count != null && (
                                <span className="text-gray-500 ml-1">({media.vote_count} votes)</span>
                              )}
                            </dd>
                          </>
                        )}
                        {media.runtime != null && media.runtime > 0 && (
                          <>
                            <dt className="text-gray-500">Runtime</dt>
                            <dd className="text-gray-300">{media.runtime} min</dd>
                          </>
                        )}
                        {media.imdb_id && (
                          <>
                            <dt className="text-gray-500">IMDB</dt>
                            <dd className="text-gray-300">
                              <a
                                href={`https://www.imdb.com/title/${media.imdb_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:text-amber-300"
                              >
                                {media.imdb_id}
                              </a>
                            </dd>
                          </>
                        )}
                        {Array.isArray(media.genres) && media.genres.length > 0 && (
                          <>
                            <dt className="text-gray-500">Genres</dt>
                            <dd className="text-gray-300 flex flex-wrap gap-1.5">
                              {media.genres.map((g) => (
                                <GenreChip key={g.id ?? g.name} name={g.name} id={g.id} mediaType={mediaType} />
                              ))}
                            </dd>
                          </>
                        )}
                      </dl>

                      {/* Expandable: country, production, actors, tagline, languages, budget, etc. */}
                      {(media.number_of_seasons != null ||
                        media.number_of_episodes != null ||
                        media.original_language ||
                        (media.original_title && media.original_title !== media.title) ||
                        (Array.isArray(media.production_countries) && media.production_countries.length > 0) ||
                        (Array.isArray(media.origin_country) && media.origin_country.length > 0) ||
                        (Array.isArray(media.production_companies) && media.production_companies.length > 0) ||
                        (Array.isArray(media.credits?.cast) && media.credits.cast.length > 0) ||
                        (Array.isArray(media.cast) && media.cast.length > 0) ||
                        media.tagline ||
                        (Array.isArray(media.spoken_languages) && media.spoken_languages.length > 0) ||
                        (media.budget != null && media.budget > 0) ||
                        (media.revenue != null && media.revenue > 0) ||
                        media.status) && (
                          <div className="mt-6 pt-4 border-t border-gray-700">
                            <button
                              type="button"
                              onClick={() => setInfoExpanded((e) => !e)}
                              className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-amber-400 transition-colors"
                              aria-expanded={infoExpanded}
                            >
                              <span className="text-amber-500 select-none" aria-hidden>
                                {infoExpanded ? '▼' : '▶'}
                              </span>
                              {infoExpanded ? 'Hide' : 'Show'} more info
                            </button>
                            {infoExpanded && (
                              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                                {media.number_of_seasons != null && (
                                  <>
                                    <dt className="text-gray-500">Seasons</dt>
                                    <dd className="text-gray-300">{media.number_of_seasons}</dd>
                                  </>
                                )}
                                {media.number_of_episodes != null && (
                                  <>
                                    <dt className="text-gray-500">Episodes</dt>
                                    <dd className="text-gray-300">{media.number_of_episodes}</dd>
                                  </>
                                )}
                                {media.original_language && (
                                  <>
                                    <dt className="text-gray-500">Original language</dt>
                                    <dd className="text-gray-300">{media.original_language}</dd>
                                  </>
                                )}
                                {media.original_title && media.original_title !== media.title && (
                                  <>
                                    <dt className="text-gray-500">Original title</dt>
                                    <dd className="text-gray-300">{media.original_title}</dd>
                                  </>
                                )}
                                {media.tagline && (
                                  <>
                                    <dt className="text-gray-500">Tagline</dt>
                                    <dd className="text-gray-300 italic">{media.tagline}</dd>

                                  </>
                                )}
                                {Array.isArray(media.production_countries) && media.production_countries.length > 0 && (
                                  <>
                                    <dt className="text-gray-500">Country</dt>
                                    <dd className="text-gray-300">
                                      {media.production_countries.map((c) => <Country key={c.iso_3166_1} country={c} />)}
                                    </dd>
                                  </>
                                )}
                                {Array.isArray(media.origin_country) && media.origin_country.length > 0 && !(Array.isArray(media.production_countries) && media.production_countries.length > 0) && (
                                  <>
                                    <dt className="text-gray-500">Country</dt>
                                    <dd className="text-gray-300">{media.origin_country.join(', ')}</dd>
                                  </>
                                )}
                                {Array.isArray(media.spoken_languages) && media.spoken_languages.length > 0 && (
                                  <>
                                    <dt className="text-gray-500">Languages</dt>
                                    <dd className="text-gray-300">
                                      {media.spoken_languages.map((l) => l.english_name ?? l.name ?? l.iso_639_1).filter(Boolean).join(', ')}
                                    </dd>
                                  </>
                                )}
                                {Array.isArray(media.production_companies) && media.production_companies.length > 0 && (
                                  <>
                                    <dt className="text-gray-500">Production</dt>
                                    <dd className="text-gray-300">
                                      {media.production_companies.map((p) => p.name).filter(Boolean).join(', ')}
                                    </dd>
                                  </>
                                )}
                                {media.budget != null && media.budget > 0 && (
                                  <>
                                    <dt className="text-gray-500">Budget</dt>
                                    <dd className="text-gray-300">
                                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(media.budget)}
                                    </dd>
                                  </>
                                )}
                                {media.revenue != null && media.revenue > 0 && (
                                  <>
                                    <dt className="text-gray-500">Revenue</dt>
                                    <dd className="text-gray-300">
                                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(media.revenue)}
                                    </dd>
                                  </>
                                )}
                                {media.status && (
                                  <>
                                    <dt className="text-gray-500">Status</dt>
                                    <dd className="text-gray-300">{media.status}</dd>
                                  </>
                                )}
                                {(Array.isArray(media.credits?.cast) ? media.credits.cast : Array.isArray(media.cast) ? media.cast : []).length > 0 && (
                                  <>
                                    <dt className="text-gray-500">Cast</dt>
                                    <dd className="text-gray-300">
                                      {(media.credits?.cast ?? media.cast ?? [])
                                        .slice(0, 12)
                                        .map((p) => p.name)
                                        .filter(Boolean)
                                        .join(', ')}
                                      {((media.credits?.cast ?? media.cast)?.length ?? 0) > 12 && ' …'}
                                    </dd>
                                  </>
                                )}
                              </dl>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {media.season != null && media.episode != null && (
                  <span className="text-xs text-gray-500">
                    S{media.season} E{media.episode}
                  </span>
                )}

                {/* TV: Season picker at bottom */}
                {isTv && Array.isArray(media.seasons) && media.seasons.length > 0 && (
                  <Seasons
                    seasons={media.seasons}
                    showId={id}
                    currentSeason={currentSeasonNum}
                  />
                )}

                {Array.isArray(media.recommendations) && media.recommendations.length > 0 && (
                  <section className="mt-8 pt-6 border-t border-gray-700">
                    <h2 className="font-bold text-2xl text-gray-100 mb-1">Recommendations</h2>
                    <p className="text-gray-500 text-sm mb-4">Because you watched {media.title}, you may like</p>
                    <PosterGrid>
                      {media.recommendations.map((rec) => (
                        <Poster
                          key={rec.id}
                          movie={{ ...rec, externalId: rec.id }}
                          size="md"
                          mediaType={mediaType}
                          className="shrink-0"
                        />
                      ))}
                    </PosterGrid>
                  </section>
                )}
              </div>

            </div>
          </div>
        ) : null}
        {/* Non-TV or TV with no episodes: single column frame + rest */}
        {!(isTv && episodeCount > 0) && (
          <div className="flex-1 min-h-0 flex flex-col min-w-0 w-full">
            <div className="mx-4 flex-1">
              <div className="relative w-full aspect-[19/9] bg-gray-800 rounded-lg overflow-hidden">
                {watchLinks[selectedIndex]?.link ? (
                  <iframe
                    src={watchLinks[selectedIndex].link}
                    className="absolute inset-0 w-full h-full border-0 rounded-lg"
                    title={`Watch ${media.title}`}
                    allowFullScreen
                    referrerPolicy="origin"
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 items-center mt-4">
                <h3 className="text-lg font-bold mr-2">Servers</h3>
                {watchLinks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No servers configured</p>
                ) : (
                  watchLinks.map((server, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedIndex === i ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        }`}
                    >
                      {server.label || `Server ${i + 1}`}
                    </button>
                  ))
                )}
              </div>
              <h1 className="text-[2rem] font-bold mt-4 mb-4 pt-2 border-t border-gray-700 text-gray-200">{media.title}</h1>
              {media.overview && (
                <div className="flex items-start gap-4">
                  {media.poster_url && (
                    <img src={media.poster_url} alt={media.title} className="w-40 shrink-0 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm text-gray-400 leading-relaxed ${infoExpanded ? '' : 'line-clamp-3'}`}>
                      {media.overview}
                    </p>
                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                      {media.release_date && (
                        <><dt className="text-gray-500">Release date</dt><dd className="text-gray-300">{media.release_date}</dd></>
                      )}
                      {media.vote_average != null && (
                        <><dt className="text-gray-500">Rating</dt><dd className="text-gray-300"><span className="text-amber-400">★</span> {Number(media.vote_average).toFixed(1)}</dd></>
                      )}
                      {media.runtime != null && media.runtime > 0 && (
                        <><dt className="text-gray-500">Runtime</dt><dd className="text-gray-300">{media.runtime} min</dd></>
                      )}
                      {media.imdb_id && (
                        <><dt className="text-gray-500">IMDB</dt><dd className="text-gray-300"><a href={`https://www.imdb.com/title/${media.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">{media.imdb_id}</a></dd></>
                      )}
                      {Array.isArray(media.genres) && media.genres.length > 0 && (
                        <><dt className="text-gray-500">Genres</dt><dd className="text-gray-300 flex flex-wrap gap-1.5">{media.genres.map((g) => <GenreChip key={g.id ?? g.name} name={g.name} id={g.id} mediaType={mediaType} />)}</dd></>
                      )}
                    </dl>
                    {(media.number_of_seasons != null ||
                      media.number_of_episodes != null ||
                      media.original_language ||
                      (media.original_title && media.original_title !== media.title) ||
                      (Array.isArray(media.production_countries) && media.production_countries.length > 0) ||
                      (Array.isArray(media.origin_country) && media.origin_country.length > 0) ||
                      (Array.isArray(media.production_companies) && media.production_companies.length > 0) ||
                      (Array.isArray(media.credits?.cast) && media.credits.cast.length > 0) ||
                      (Array.isArray(media.cast) && media.cast.length > 0) ||
                      media.tagline ||
                      (Array.isArray(media.spoken_languages) && media.spoken_languages.length > 0) ||
                      (media.budget != null && media.budget > 0) ||
                      (media.revenue != null && media.revenue > 0) ||
                      media.status) && (
                        <div className="mt-6 pt-4 border-t border-gray-700">
                          <button
                            type="button"
                            onClick={() => setInfoExpanded((e) => !e)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-amber-400 transition-colors"
                            aria-expanded={infoExpanded}
                          >
                            <span className="text-amber-500 select-none" aria-hidden>{infoExpanded ? '▼' : '▶'}</span>
                            {infoExpanded ? 'Hide' : 'Show'} more info
                          </button>
                          {infoExpanded && (
                            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                              {media.number_of_seasons != null && (<><dt className="text-gray-500">Seasons</dt><dd className="text-gray-300">{media.number_of_seasons}</dd></>)}
                              {media.number_of_episodes != null && (<><dt className="text-gray-500">Episodes</dt><dd className="text-gray-300">{media.number_of_episodes}</dd></>)}
                              {media.original_language && (<><dt className="text-gray-500">Original language</dt><dd className="text-gray-300">{media.original_language}</dd></>)}
                              {media.original_title && media.original_title !== media.title && (<><dt className="text-gray-500">Original title</dt><dd className="text-gray-300">{media.original_title}</dd></>)}
                              {media.tagline && (<><dt className="text-gray-500">Tagline</dt><dd className="text-gray-300 italic">{media.tagline}</dd></>)}

                              {Array.isArray(media.production_countries) && media.production_countries.length > 0 && 
                                (<>
                                <dt className="text-gray-500">Country</dt>
                                  <dd className="text-gray-300">
                                    {media.production_countries.map((c) => <Country key={c.iso_3166_1} country={c} />)}
                                  </dd>
                                </>)}
                              
                              {Array.isArray(media.origin_country) && media.origin_country.length > 0 && !(Array.isArray(media.production_countries) && media.production_countries.length > 0) && (<><dt className="text-gray-500">Country</dt><dd className="text-gray-300">{media.origin_country.join(', ')}</dd></>)}
                              {Array.isArray(media.spoken_languages) && media.spoken_languages.length > 0 && (<><dt className="text-gray-500">Languages</dt><dd className="text-gray-300">{media.spoken_languages.map((l) => l.english_name ?? l.name ?? l.iso_639_1).filter(Boolean).join(', ')}</dd></>)}
                              {Array.isArray(media.production_companies) && media.production_companies.length > 0 && (<><dt className="text-gray-500">Production</dt><dd className="text-gray-300">{media.production_companies.map((p) => p.name).filter(Boolean).join(', ')}</dd></>)}
                              {media.budget != null && media.budget > 0 && (<><dt className="text-gray-500">Budget</dt><dd className="text-gray-300">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(media.budget)}</dd></>)}
                              {media.revenue != null && media.revenue > 0 && (<><dt className="text-gray-500">Revenue</dt><dd className="text-gray-300">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(media.revenue)}</dd></>)}
                              {media.status && (<><dt className="text-gray-500">Status</dt><dd className="text-gray-300">{media.status}</dd></>)}
                              {(Array.isArray(media.credits?.cast) ? media.credits.cast : Array.isArray(media.cast) ? media.cast : []).length > 0 && (<><dt className="text-gray-500">Cast</dt><dd className="text-gray-300">{(media.credits?.cast ?? media.cast ?? []).slice(0, 12).map((p) => p.name).filter(Boolean).join(', ')}{((media.credits?.cast ?? media.cast)?.length ?? 0) > 12 && ' …'}</dd></>)}
                            </dl>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )}
              {isTv && Array.isArray(media.seasons) && media.seasons.length > 0 && (
                <Seasons seasons={media.seasons} showId={id} currentSeason={currentSeasonNum} />
              )}
              {Array.isArray(media.recommendations) && media.recommendations.length > 0 && (
                <section className="mt-8 pt-6 border-t border-gray-700">
                  <h2 className="font-bold text-2xl text-gray-100 mb-1">Recommendations</h2>
                  <p className="text-gray-500 text-sm mb-4">Because you watched {media.title}, you may like</p>
                  <PosterGrid>
                    {media.recommendations.map((rec) => (
                      <Poster
                        key={rec.id}
                        movie={{ ...rec, externalId: rec.id }}
                        size="md"
                        mediaType={mediaType}
                        className="shrink-0"
                      />
                    ))}
                  </PosterGrid>
                </section>
              )}
            </div>
          </div>
        )}
      </div>

      <SaveModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        item={saveItem}
      />
    </div>
  )
}
