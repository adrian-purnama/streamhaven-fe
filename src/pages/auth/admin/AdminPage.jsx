import { Link } from 'react-router-dom'
import { Settings, Users, Clapperboard, Film, Tv, Server, Heart, MessageSquare, Upload } from 'lucide-react'

const ADMIN_CARDS = [
  { id: 'system', title: 'System', description: 'App name, logo, registration', path: '/admin/system', Icon: Settings },
  { id: 'users', title: 'Users', description: 'Manage users and roles', path: '/admin/users', Icon: Users },
  { id: 'genres', title: 'Genres', description: 'Movie and TV genres from TMDB', path: '/admin/genres', Icon: Clapperboard },
  { id: 'movies', title: 'Movies', description: 'Sync now playing, popular, top rated from TMDB', path: '/admin/movies', Icon: Film },
  { id: 'tv', title: 'TV', description: 'Sync on the air, popular, top rated from TMDB', path: '/admin/tv', Icon: Tv },
  { id: 'servers', title: 'Servers', description: 'Manage streaming servers (movie, TV, anime)', path: '/admin/servers', Icon: Server },
  { id: 'myplayer', title: 'MyPlayer', description: 'Upload movies to your server for streaming', path: '/admin/myplayer', Icon: Upload },
  { id: 'supporters', title: 'Supporters', description: 'Manage supporters by tier (platinum, gold, silver, bronze)', path: '/admin/supporters', Icon: Heart },
  { id: 'feedback', title: 'Feedback', description: 'View and manage user feedback', path: '/admin/feedback', Icon: MessageSquare },
]

const AdminPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-100 mb-6">Admin</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_CARDS.map((card) => {
            const Icon = card.Icon
            return (
            <Link
              key={card.id}
              to={card.path}
              className="block p-5 rounded-xl bg-gray-800 border border-gray-700 hover:border-amber-500/50 hover:bg-gray-800/90 transition-colors"
            >
              <Icon className="w-8 h-8 mb-2 text-amber-400" aria-hidden />
              <h2 className="font-medium text-gray-100">{card.title}</h2>
              <p className="text-sm text-gray-400 mt-1">{card.description}</p>
            </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
