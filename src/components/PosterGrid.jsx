import React from 'react'

const PosterGrid = ({ children }) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {children}
    </div>
  )
}

export default PosterGrid