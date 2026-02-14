import React, { cloneElement, Children } from 'react'

/**
 * Infinite horizontal ticker with no gap on loop.
 * Repeats content many times per copy so wide viewports stay filled.
 */
export default function InfiniteTicker({
  children,
  className = '',
  duration = 40,
  repeatPerCopy = 12,
}) {
  const base = Children.toArray(children)

  const renderCopy = (prefix) =>
    Array.from({ length: repeatPerCopy }, (_, i) => (
      <React.Fragment key={`${prefix}-${i}`}>
        {base.map((child, j) => cloneElement(child, { key: `${prefix}-${i}-${j}` }))}
      </React.Fragment>
    ))

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      style={{ ['--ticker-duration']: `${duration}s` }}
    >
      <div className="infinite-ticker-inner flex w-max shrink-0">
        <span className="inline-flex items-center gap-6 whitespace-nowrap px-4 shrink-0">
          {renderCopy('a')}
        </span>
        <span className="inline-flex items-center gap-6 whitespace-nowrap px-4 shrink-0">
          {renderCopy('b')}
        </span>
      </div>
    </div>
  )
}
