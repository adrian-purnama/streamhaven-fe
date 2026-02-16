import { Link } from 'react-router-dom'
import SystemForm from '../../../components/forms/SystemForm'

const SystemPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm text-gray-400 hover:text-amber-400 mb-6"
        >
          ← Back to Admin
        </Link>
        <h1 className="text-2xl font-semibold text-gray-100 mb-6">System</h1>
        <div className="p-5 rounded-xl bg-gray-800 border border-gray-700">
          <SystemForm />
        </div>
      </div>
    </div>
  )
}

export default SystemPage
