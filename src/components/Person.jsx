import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Modal from './Modal'
import Poster from './Poster'
import PosterGrid from './PosterGrid'

/**
 * Person card: circle avatar, name, department. Links to /person/:id.
 * If known_for exists, a "Known for" control opens a modal with Posters.
 * When detail=true, renders full person page (profile, bio, movie/tv credits).
 */
export default function Person({ person, detail = false, className = '' }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [creditsTab, setCreditsTab] = useState('movie') // 'movie' | 'tv'
  const [fullDataOpen, setFullDataOpen] = useState(false)

  if (!person) return null

  const name = person.name || person.original_name || 'Unknown'
  const knownForMedia = (person.known_for || []).filter(
    (item) => item.media_type === 'movie' || item.media_type === 'tv'
  )
  const hasKnownFor = knownForMedia.length > 0

  if (detail) {
    const movieCast = person.movie_credits?.cast || []
    const tvCast = person.tv_credits?.cast || []
    const creditToMovie = (item) => ({
      _id: item.id,
      externalId: item.id,
      title: item.title || item.name,
      poster_url: item.poster_url,
      release_date: item.release_date || item.first_air_date,
      vote_average: item.vote_average,
      genre_ids: item.genre_ids,
      overview: item.overview,
    })

    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="shrink-0 w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden bg-gray-800 ring-2 ring-gray-700">
            {person.profile_url ? (
              <img src={person.profile_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-5xl font-medium">
                {(name[0] || '?').toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-100">{name}</h1>
            {person.known_for_department && (
              <p className="text-amber-400 font-medium mt-1">{person.known_for_department}</p>
            )}
            {person.biography && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Biography</h2>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{person.biography}</p>
              </div>
            )}
          </div>
        </div>

        <section className="mb-8">
          <button
            type="button"
            onClick={() => setFullDataOpen((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-amber-400 focus:outline-none focus:text-amber-400"
          >
            {fullDataOpen ? <ChevronDown className="w-4 h-4 shrink-0" aria-hidden /> : <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />}
            <span>{fullDataOpen ? 'Hide full data' : 'Expand More'}</span>
          </button>
          {fullDataOpen && (
            <div className="mt-3 p-4 rounded-lg bg-gray-900 border border-gray-700">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {person.name != null && <><dt className="text-gray-500">Name</dt><dd className="text-gray-200">{person.name}</dd></>}
                {(person.also_known_as?.length ?? 0) > 0 && (
                  <><dt className="text-gray-500">Also known as</dt><dd className="text-gray-200">{(person.also_known_as || []).join(', ')}</dd></>
                )}
                {person.birthday && <><dt className="text-gray-500">Birthday</dt><dd className="text-gray-200">{person.birthday}</dd></>}
                {person.deathday != null && person.deathday !== '' && <><dt className="text-gray-500">Deathday</dt><dd className="text-gray-200">{person.deathday}</dd></>}
                {person.gender != null && <><dt className="text-gray-500">Gender</dt><dd className="text-gray-200">{person.gender === 2 ? 'Male' : person.gender === 1 ? 'Female' : 'Other'}</dd></>}
                {person.place_of_birth && <><dt className="text-gray-500">Place of birth</dt><dd className="text-gray-200">{person.place_of_birth}</dd></>}
                {person.known_for_department && <><dt className="text-gray-500">Known for department</dt><dd className="text-gray-200">{person.known_for_department}</dd></>}
                {person.id != null && <><dt className="text-gray-500">ID</dt><dd className="text-gray-200">{person.id}</dd></>}
                {person.imdb_id && <><dt className="text-gray-500">IMDb ID</dt><dd className="text-gray-200">{person.imdb_id}</dd></>}
                {person.popularity != null && <><dt className="text-gray-500">Popularity</dt><dd className="text-gray-200">{Number(person.popularity).toFixed(2)}</dd></>}
                {person.homepage && <><dt className="text-gray-500">Homepage</dt><dd className="text-gray-200"><a href={person.homepage} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">{person.homepage}</a></dd></>}
              </dl>
            </div>
          )}
        </section>

        {(movieCast.length > 0 || tvCast.length > 0) && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-gray-400 mr-2">Credits:</span>
              <div className="flex rounded-lg bg-gray-800 p-0.5 border border-gray-700">
                <button
                  type="button"
                  onClick={() => setCreditsTab('movie')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    creditsTab === 'movie'
                      ? 'bg-amber-500 text-gray-900'
                      : 'text-gray-300 hover:text-gray-100'
                  }`}
                >
                  Movies {movieCast.length > 0 && `(${movieCast.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setCreditsTab('tv')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    creditsTab === 'tv'
                      ? 'bg-amber-500 text-gray-900'
                      : 'text-gray-300 hover:text-gray-100'
                  }`}
                >
                  TV {tvCast.length > 0 && `(${tvCast.length})`}
                </button>
              </div>
            </div>
            {creditsTab === 'movie' && movieCast.length > 0 && (
              <PosterGrid>
                {movieCast.map((item) => (
                  <Poster
                    key={`movie-${item.id}`}
                    movie={creditToMovie(item)}
                    size="sm"
                    mediaType="movie"
                  />
                ))}
              </PosterGrid>
            )}
            {creditsTab === 'tv' && tvCast.length > 0 && (
              <PosterGrid>
                {tvCast.map((item) => (
                  <Poster
                    key={`tv-${item.id}`}
                    movie={creditToMovie(item)}
                    size="sm"
                    mediaType="tv"
                  />
                ))}
              </PosterGrid>
            )}
          </section>
        )}
      </div>
    )
  }

  return (
    <>
      <Link
        to={`/person/${person.id}`}
        className={`block rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 hover:border-gray-600 transition-colors ${className}`}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden bg-gray-700 ring-2 ring-gray-600">
            {person.profile_url ? (
              <img src={person.profile_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-medium">
                {(name[0] || '?').toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-100 truncate">{name}</p>
            {person.known_for_department && (
              <p className="text-sm text-gray-400">{person.known_for_department}</p>
            )}
            {hasKnownFor && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setModalOpen(true)
                }}
                className="mt-1 text-sm text-amber-400 hover:text-amber-300 focus:outline-none focus:underline"
              >
                Known for ({knownForMedia.length})
              </button>
            )}
          </div>
        </div>
      </Link>

      {hasKnownFor && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Known for - ${name}`}
        >
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto overflow-x-hidden py-1 pr-2 -mr-2 [scrollbar-width:thin] [scrollbar-color:var(--color-gray-600)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:min-h-8">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-2">
              {knownForMedia.map((item) => (
                <Poster
                  key={`${item.media_type}-${item.id}`}
                  movie={{ ...item, externalId: item.id }}
                  size="sm"
                  mediaType={item.media_type}
                  className="shrink-0 w-[140px]"
                />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
