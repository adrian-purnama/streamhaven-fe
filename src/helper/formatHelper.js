import { baseURL } from "./apiHelper"

export const formatImageUrl = (url) => {
  return `${baseURL}${url}`
}

const BASE_FLAG_URL = 'https://purecatamphetamine.github.io/country-flag-icons/3x2'
export const formatFlag = (iso3166) => {
  if (!iso3166 || typeof iso3166 !== 'string') return null
  const code = iso3166.trim().toUpperCase().slice(-2)
  return `${BASE_FLAG_URL}/${code}.svg`
}

export default {
  formatImageUrl,
  formatFlag
}
