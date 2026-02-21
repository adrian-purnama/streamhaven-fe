import React, { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import apiHelper from '../../helper/apiHelper'
import { formatImageUrl } from '../../helper/formatHelper'

function SystemForm() {
  const [system, setSystem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [appName, setAppName] = useState('FC')
  const [openRegistration, setOpenRegistration] = useState(false)
  const [openAdFreeRequest, setOpenAdFreeRequest] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFullUrl, setLogoFullUrl] = useState('')
  const [tagLine, setTagLine] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadingFull, setUploadingFull] = useState(false)
  const fileInputRef = useRef(null)
  const fileInputFullRef = useRef(null)

  const fetchSystem = async () => {
    setLoading(true)
    try {
      const { data } = await apiHelper.get('/api/system')
      const sys = data?.data ?? null
      setSystem(sys)
      if (sys) {
        setAppName(sys.appName ?? 'FC')
        setOpenRegistration(sys.openRegistration ?? false)
        setLogoUrl(sys.logoUrl ?? '')
        setLogoFullUrl(sys.logoFullUrl ?? '')
        setTagLine(sys.tagLine ?? '')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load system'
      toast.error(msg)
      setSystem(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSystem()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await apiHelper.put('/api/system', { appName, openRegistration, logoUrl, logoFullUrl, tagLine })
      toast.success('System updated')
      fetchSystem()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update'
      toast.error(msg)
    }
  }

  const handleCancel = () => {
    if (system) {
      setAppName(system.appName ?? 'FC')
      setOpenRegistration(system.openRegistration ?? false)
      setLogoUrl(system.logoUrl ?? '')
      setOpenAdFreeRequest(system.openAdFreeRequest ?? false)
      setLogoFullUrl(system.logoFullUrl ?? '')
      setTagLine(system.tagLine ?? '')
    }
  }

  const logoImgSrc = formatImageUrl(logoUrl)
  const logoFullImgSrc = formatImageUrl(logoFullUrl)

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await apiHelper.post('/api/system/logo', formData)
      if (data?.success && data?.data) {
        const doc = data.data
        setLogoUrl(doc.logoUrl ?? '')
        setSystem(doc)
        toast.success('Logo updated')
      } else {
        toast.error('Upload failed')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFullLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setUploadingFull(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await apiHelper.post('/api/system/logo-full', formData)
      if (data?.success && data?.data) {
        const doc = data.data
        setLogoFullUrl(doc.logoFullUrl ?? '')
        setSystem(doc)
        toast.success('Full logo updated')
      } else {
        toast.error('Upload failed')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Upload failed'
      toast.error(msg)
    } finally {
      setUploadingFull(false)
      if (fileInputFullRef.current) fileInputFullRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="p-5 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center min-h-[200px]">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!system) {
    return (
      <div className="p-5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400">
        No system config found.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="system-app-name" className="block text-sm font-medium text-gray-300 mb-1">
          Application name
        </label>
        <input
          id="system-app-name"
          type="text"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="e.g. FC"
          required
        />
      </div>
      <div>
        <label htmlFor="system-tag-line" className="block text-sm font-medium text-gray-300 mb-1">
          Tagline
        </label>
        <input
          id="system-tag-line"
          type="text"
          value={tagLine}
          onChange={(e) => setTagLine(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="e.g. Your streaming companion"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Logo
        </label>
        <div className="flex flex-col gap-2">
          {logoImgSrc ? (
            <div className="flex items-center gap-3">
              <img
                src={logoImgSrc}
                alt="Logo"
                className="h-16 w-auto object-contain rounded border border-gray-600 bg-gray-700"
              />
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            onChange={handleImageUpload}
            disabled={uploading}
            className="w-full text-sm text-gray-300 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:bg-amber-500 file:text-gray-900 file:font-medium file:cursor-pointer hover:file:bg-amber-400"
          />
          {uploading && <span className="text-xs text-gray-400">Uploading…</span>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Full logo
        </label>
        <div className="flex flex-col gap-2">
          {logoFullImgSrc ? (
            <div className="flex items-center gap-3">
              <img
                src={logoFullImgSrc}
                alt="Full logo"
                className="h-16 w-auto object-contain rounded border border-gray-600 bg-gray-700"
              />
            </div>
          ) : null}
          <input
            ref={fileInputFullRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            onChange={handleFullLogoUpload}
            disabled={uploadingFull}
            className="w-full text-sm text-gray-300 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:bg-amber-500 file:text-gray-900 file:font-medium file:cursor-pointer hover:file:bg-amber-400"
          />
          {uploadingFull && <span className="text-xs text-gray-400">Uploading…</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="system-open-registration"
          type="checkbox"
          checked={openRegistration}
          onChange={(e) => setOpenRegistration(e.target.checked)}
          className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
        />
        <label htmlFor="system-open-registration" className="text-sm font-medium text-gray-300">
          Open registration (allow new users to register)
        </label>
      </div>
      <div className="flex gap-2 pt-2">
      <div className="flex items-center gap-2">
        <input
          id="system-open-ad-free-request"
          type="checkbox"
          checked={openAdFreeRequest}
          onChange={(e) => setOpenAdFreeRequest(e.target.checked)}
          className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
        />
        <label htmlFor="system-open-ad-free-request" className="text-sm font-medium text-gray-300">
          Open ad-free request (show &quot;Add ad-free movie&quot; button to users)
        </label>
      </div>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-amber-500 text-gray-900 hover:bg-amber-400 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          Update
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded bg-gray-600 text-gray-200 hover:bg-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Reset
        </button>
      </div>
    </form>
  )
}

export default SystemForm;
