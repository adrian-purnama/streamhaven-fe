import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import FeedbackForm from './forms/FeedbackForm'

export default function FeedbackModal({ open, onClose }) {
  const [key, setKey] = useState(0)

  const handleSuccess = () => {
    toast.success('Thanks for your feedback!')
    onClose?.()
    setKey((k) => k + 1)
  }

  const handleCancel = () => {
    onClose?.()
  }

  return (
    <Modal open={open} onClose={onClose} title="Give feedback">
      <FeedbackForm
        key={key}
        onSubmit={handleSuccess}
        onCancel={handleCancel}
        open={open}
      />
    </Modal>
  )
}
