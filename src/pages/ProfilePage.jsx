import { useState, useRef, useCallback } from 'react'
import { Link, Navigate } from 'react-router-dom'
import ReactCrop, { centerCrop, convertToPixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useAuth } from '../context/AuthContext'
import apiHelper from '../helper/apiHelper'
import Modal from '../components/Modal'
import PreferenceForm from '../components/forms/PreferenceForm'

function getCroppedBlob(image, crop) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('No 2d context'))

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const x = crop.x * scaleX
  const y = crop.y * scaleY
  const w = crop.width * scaleX
  const h = crop.height * scaleY

  canvas.width = Math.floor(w)
  canvas.height = Math.floor(h)
  ctx.drawImage(image, x, y, w, h, 0, 0, w, h)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9)
  })
}

export default function ProfilePage() {
  const { isLoggedIn, email, profileUrl, setProfileUrl, authLoading, verifyToken } = useAuth()
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [crop, setCrop] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const imgRef = useRef(null)

  const handleLogout = () => {
    localStorage.removeItem('fc-token')
    window.location.reload()
  }

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget
    const size = Math.min(width, height)
    setCrop(centerCrop({ unit: 'px', width: size, height: size }, width, height))
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setCropModalOpen(true)
    setUploadError(null)
    e.target.value = ''
  }

  const closeCropModal = () => {
    setCropModalOpen(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setCrop(null)
    setUploadError(null)
  }

  const handleCropApply = async () => {
    if (!imgRef.current || !crop) return
    const pixelCrop = convertToPixelCrop(crop, imgRef.current.width, imgRef.current.height)
    setUploading(true)
    setUploadError(null)
    try {
      const blob = await getCroppedBlob(imgRef.current, pixelCrop)
      const formData = new FormData()
      formData.append('image', blob, 'profile.jpg')
      const res = await apiHelper.post('/api/users/me/profile-picture', formData)
      if (res.data?.data?.profile_url) {
        setProfileUrl(res.data.data.profile_url)
        await verifyToken()
      }
      closeCropModal()
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-100 mb-8">Profile</h1>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-700 ring-2 ring-gray-600 shrink-0">
                {profileUrl ? (
                  <img
                    src={profileUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl font-medium">
                    {(email && email[0]) ? email[0].toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 flex items-center justify-center w-9 h-9 rounded-full bg-amber-500 text-gray-900 cursor-pointer hover:bg-amber-400 transition-colors shadow-lg">
                <span className="sr-only">Change photo</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <p className="text-sm text-gray-400">Click the camera icon to change your profile photo</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Email</p>
            <p className="text-gray-100 font-medium">{email}</p>
          </div>

          <PreferenceForm />

          <div className="pt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 font-medium text-sm transition-colors"
            >
              Log out
            </button>
            <Link
              to="/home"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium text-sm hover:bg-gray-600 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <Modal
        open={cropModalOpen}
        onClose={closeCropModal}
        title="Crop profile photo"
      >
        <div className="space-y-4">
          {previewUrl && (
            <div className="flex justify-center bg-gray-900 rounded-lg overflow-hidden max-h-[60vh]">
              <ReactCrop
                crop={crop}
                onChange={(_, c) => setCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Crop"
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[50vh] object-contain"
                />
              </ReactCrop>
            </div>
          )}
          {uploadError && (
            <p className="text-sm text-red-400">{uploadError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={closeCropModal}
              className="px-3 py-2 rounded-lg bg-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCropApply}
              disabled={!crop || uploading}
              className="px-3 py-2 rounded-lg bg-amber-500 text-gray-900 text-sm font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading…' : 'Apply'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
