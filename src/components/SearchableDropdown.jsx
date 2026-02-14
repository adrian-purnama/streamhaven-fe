import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

const SearchableDropdown = ({
  options = [],
  valueKey = '_id',
  labelKey = 'name',
  value = '',
  selectedValues = [],
  onChange,
  onSearchChange,
  renderOption,
  multiple = false,
  placeholder = 'Select...',
  disabled = false,
  loading = false,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownRect, setDropdownRect] = useState(null)
  const containerRef = useRef(null)
  const dropdownRef = useRef(null)

  const getLabel = (item) => (item && item[labelKey] != null ? String(item[labelKey]) : '')
  const getValue = (item) => (item && item[valueKey] != null ? item[valueKey] : '')

  // When onSearchChange is provided, skip client-side filtering (server handles it)
  const filteredOptions = onSearchChange
    ? options
    : options.filter((item) =>
        getLabel(item).toLowerCase().includes(search.trim().toLowerCase())
      )

  const selectedOption = options.find((o) => getValue(o) === value)
  const selectedOptions = options.filter((o) => selectedValues.includes(getValue(o)))

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownRect({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    } else {
      setDropdownRect(null)
    }
  }, [open])

  useEffect(() => {
    const updatePosition = () => {
      if (open && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDropdownRect({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }
    }
    if (open) {
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inContainer = containerRef.current?.contains(e.target)
      const inDropdown = dropdownRef.current?.contains(e.target)
      if (!inContainer && !inDropdown) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleSelect = (item) => {
    const id = getValue(item)
    if (multiple) {
      const next = selectedValues.includes(id)
        ? selectedValues.filter((v) => v !== id)
        : [...selectedValues, id]
      onChange(next)
    } else {
      onChange(id)
      setOpen(false)
      setSearch('')
    }
  }

  const handleTriggerClick = () => {
    if (!disabled) {
      setOpen((prev) => !prev)
      if (!open) setSearch('')
    }
  }

  const hasSelection = selectedOption || (multiple && selectedOptions.length > 0)

  const displayContent = multiple
    ? selectedOptions.length > 0
      ? `${selectedOptions.length} selected`
      : placeholder
    : selectedOption
      ? (renderOption ? renderOption(selectedOption) : getLabel(selectedOption))
      : placeholder

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 border border-gray-600 rounded px-3 py-2 text-left text-sm bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={`flex items-center gap-2 truncate ${hasSelection ? 'text-gray-100' : 'text-gray-400'}`}>
          {displayContent}
        </span>
        <span className="text-gray-500 shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open &&
        dropdownRect &&
        createPortal(
          <div
            ref={dropdownRef}
            className="absolute z-10001 rounded border border-gray-600 bg-gray-800 shadow-xl"
            style={{
              top: dropdownRect.top + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
              minWidth: dropdownRect.width,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-gray-700">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  if (onSearchChange) onSearchChange(e.target.value)
                }}
                placeholder="Search..."
                className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {loading ? (
                <li className="px-3 py-2 text-sm text-gray-400">Loading…</li>
              ) : filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
              ) : (
                filteredOptions.map((item) => {
                  const id = getValue(item)
                  const label = getLabel(item)
                  const isSelected = multiple ? selectedValues.includes(id) : value === id
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 ${
                          isSelected ? 'bg-gray-700/80 text-amber-400' : 'text-gray-200'
                        }`}
                      >
                        {multiple && (
                          <span className="shrink-0 w-4 h-4 rounded border flex items-center justify-center">
                            {isSelected ? '✓' : ''}
                          </span>
                        )}
                        {renderOption ? renderOption(item) : label}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  )
}

export default SearchableDropdown
