import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../../components/Modal'
import apiHelper from '../../../helper/apiHelper'
import SearchUploadTab from '../../../components/myplayer/SearchUploadTab'
import StagingTab from '../../../components/myplayer/StagingTab'
import MappingTab from '../../../components/myplayer/MappingTab'

const formatGB = (bytes) => (bytes / 1e9).toFixed(2) + ' GB'

const TABS = [
  { id: 'upload', label: 'Search & Upload', Component: SearchUploadTab },
  { id: 'staging', label: 'Staging', Component: StagingTab },
  { id: 'mapping', label: 'Mapping', Component: MappingTab },
]

const INSTRUCTIONS = [
  { heading: 'Search movie to upload', body: 'Use TMDB or IMDB ID to search for the movie.' },
  { heading: 'Upload to staging', body: 'Once the movie is found, upload the movie file for that title to the staging DB.' },
  { heading: 'Cron job', body: 'At a scheduled time, a cron job will upload staged movies to abyss.to.' },
  { heading: 'Upload quota', body: 'The backend checks the upload quota first. If multiple movies are in staging, they are processed one by one, respecting the quota. If the quota is exceeded, it waits until the next day and tries again.' },
  { heading: 'After upload to Abyss', body: 'Each movie is recorded by slug. The slug has status: ready or error (not ready).' },
  { heading: 'When ready', body: 'Once status is ready, the movie can be seen from the front end under "My server".' },
  { heading: 'Delete movie', body: 'To delete a movie, use the upcoming mapping page. The mapping page maps slug id to TMDB id; you can remove the mapping there to stop the movie from appearing.' },
]

const MyPlayerPage = () => {
  const [instructionOpen, setInstructionOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [activeTab, setActiveTab] = useState('upload')
  const [accountInfo, setAccountInfo] = useState(null)
  const [accountInfoLoading, setAccountInfoLoading] = useState(true)
  const [accountInfoError, setAccountInfoError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchAccountInfo = async () => {
      try {
        setAccountInfoError(null)
        const res = await apiHelper.get('/api/abyss/account-info')
        if (!cancelled && res.data?.success) setAccountInfo(res.data.data)
      } catch (err) {
        if (!cancelled) setAccountInfoError(err.response?.data?.message || err.message || 'Failed to load account info')
      } finally {
        if (!cancelled) setAccountInfoLoading(false)
      }
    }
    fetchAccountInfo()
    return () => { cancelled = true }
  }, [])

  const openInstructions = () => {
    setStep(0)
    setInstructionOpen(true)
  }

  const totalSteps = INSTRUCTIONS.length
  const current = INSTRUCTIONS[step]

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors mb-6"
        >
          ← Back to Admin
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold text-gray-100">MyPlayer</h1>
          <button
            type="button"
            onClick={openInstructions}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-500 text-gray-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
            aria-label="Instructions"
            title="Instructions"
          >
            ?
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Upload movies to your server for streaming.
        </p>

        {/* Abyss account info */}
        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-300 mb-3">Abyss account</h2>
          {accountInfoLoading && <p className="text-gray-500 text-sm">Loading…</p>}
          {accountInfoError && <p className="text-red-400 text-sm">{accountInfoError}</p>}
          {!accountInfoLoading && !accountInfoError && accountInfo && (
            <dl className="grid gap-2 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-gray-500">Storage:</dt>
                <dd className="text-gray-300">
                  {formatGB(accountInfo.storageQuota?.usage ?? 0)} / {formatGB(accountInfo.storageQuota?.limit ?? 0)}
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-gray-500">Daily upload remaining:</dt>
                <dd className={accountInfo.uploadQuota?.dailyUploadRemaining === 0 ? 'text-amber-400' : 'text-gray-300'}>
                  {formatGB(accountInfo.uploadQuota?.dailyUploadRemaining ?? 0)} of {formatGB(accountInfo.uploadQuota?.dailyUploadQuota ?? 0)}
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-gray-500">Max upload size:</dt>
                <dd className="text-gray-300">{formatGB(accountInfo.maxUploadSize ?? 0)}</dd>
              </div>
              {accountInfo.perms && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-gray-500">Reconvert:</dt>
                  <dd className="text-gray-300">{accountInfo.perms.reconvert ? 'Yes' : 'No'}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        <div className="flex gap-1 border-b border-gray-700 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400 bg-gray-800'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
          {TABS.map((tab) => {
            if (activeTab !== tab.id) return null
            const TabComponent = tab.Component
            return <TabComponent key={tab.id} />
          })}
        </div>
      </div>

      <Modal
        open={instructionOpen}
        onClose={() => setInstructionOpen(false)}
        title={`MyPlayer – How it works (${step + 1} / ${totalSteps})`}
      >
        <div className="space-y-6 text-gray-300 text-sm">
          <div>
            <h3 className="font-medium text-amber-400/90">{current.heading}</h3>
            <p className="mt-2 text-gray-400">{current.body}</p>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-700">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="px-4 py-2 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>
            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-4 py-2 rounded-lg font-medium text-amber-400 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setInstructionOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-amber-400 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default MyPlayerPage
