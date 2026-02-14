function Modal({ open, onClose, title, children }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-10000 p-2 sm:p-4 overflow-y-auto overscroll-contain"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md max-h-[min(85vh,calc(100vh-2rem))] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 sm:p-6 pb-3 sm:pb-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-100 truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none shrink-0 p-1 -m-1 touch-manipulation"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 overflow-y-auto min-h-0 modal-scroll">
          {children}
        </div>
      </div>

      <style>{`
        .modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .modal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 9999px;
        }
        .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
        .modal-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  )
}

export default Modal
