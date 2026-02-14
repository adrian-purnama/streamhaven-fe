import { Link } from 'react-router-dom'

/**
 * Renders a horizontal row of season cards for a TV show.
 * @param {object} props
 * @param {Array<{ season_number: number, name: string, poster_path?: string, poster_url?: string, episode_count: number, air_date?: string, overview?: string }>} props.seasons
 * @param {string|number} props.showId - TMDB show id for links
 * @param {number} props.currentSeason - current season number (from URL) for active state
 */
export default function Seasons({ seasons = [], showId, currentSeason }) {
  if (!Array.isArray(seasons) || seasons.length === 0) return null

  const current = Number(currentSeason)

  return (
    <section className="mt-6 pt-6 border-t border-gray-700">
      <h2 className="text-lg font-semibold text-gray-100 mb-3">Seasons</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-sleek">
        {seasons.map((season) => {
          const seasonNum = season.season_number ?? 0
          const isActive = current === seasonNum
          const label = seasonNum === 0 ? 'Specials' : `Season ${seasonNum}`
          const to = `/watch/tv/${showId}/${seasonNum}/1`

          return (
            <Link
              key={season.id ?? season.season_number ?? season.name}
              to={to}
              className={`shrink-0 w-28 rounded-lg overflow-hidden border-2 transition-colors ${
                isActive
                  ? 'border-amber-500 ring-2 ring-amber-500/30'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="aspect-[2/3] bg-gray-800">
                {season.poster_url ? (
                  <img
                    src={season.poster_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    No image
                  </div>
                )}
              </div>
              <div className="p-2 bg-gray-800/90">
                <p className="text-white text-sm font-medium truncate" title={season.name || label}>
                  {season.name || label}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {season.episode_count ?? 0} eps
                  {season.air_date && (
                    <span className="ml-1">
                      · {new Date(season.air_date).getFullYear()}
                    </span>
                  )}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
