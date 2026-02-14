import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import apiHelper from '../helper/apiHelper'
import Person from '../components/Person'

export default function PersonPage() {
  const { id } = useParams()
  const [person, setPerson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      queueMicrotask(() => {
        setLoading(false)
        setError('Missing person id')
      })
      return
    }
    let cancelled = false
    const run = async () => {
      const res = await apiHelper.get(`/api/person/${id}`).catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load person')
        return null
      })
      console.log(res)
      if (cancelled) return
      if (res?.data?.success && res?.data?.data) {
        setPerson(res.data.data)
      } else if (res === null) {
        // error already set in catch
      } else {
        setError('Person not found')
      }
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <p className="text-red-400">{error || 'Person not found'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <Person person={person} detail />
    </div>
  )
}
