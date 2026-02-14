import React from 'react'
import Modal from './Modal'
import SaveForm from './forms/SaveForm'

/**
 * Save modal: uses Modal and SaveForm to add the current show to a folder.
 * @param {{ open: boolean, onClose: () => void, item: { externalId: number, mediaType: 'movie'|'tv', title: string, category?: string, vote_average?: number, release_date?: string, genre_ids?: number[], overview?: string, episode_group?: object } }} props
 */
function SaveModal({ open, onClose, item }) {
  return (
    <Modal open={open} onClose={onClose} title="Save to list">
      {item ? (
        <SaveForm
          item={item}
          onSaved={onClose}
          onCancel={onClose}
        />
      ) : (
        <p className="text-gray-400">No show selected.</p>
      )}
    </Modal>
  )
}

export default SaveModal
