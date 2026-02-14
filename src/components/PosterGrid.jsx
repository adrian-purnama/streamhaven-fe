import React from 'react'

const PosterGrid = ({ children }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-3">
        {children}
    </div>
  )
}

export default PosterGrid