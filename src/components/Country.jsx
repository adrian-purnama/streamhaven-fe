import React from 'react'
import { formatFlag } from '../helper/formatHelper'

const Country = ({ country }) => {
  const code = country?.iso_3166_1 ?? country?.iso3166
  const flagUrl = code ? formatFlag(code) : null
  return (
    <div className="flex items-center gap-2">
      {flagUrl && (
        <img src={flagUrl} alt="" className="w-6 h-4 object-cover rounded shrink-0" />
      )}
      <span>{country?.name ?? code ?? ''}</span>
    </div>
  )
}

export default Country