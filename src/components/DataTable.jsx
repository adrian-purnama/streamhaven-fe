/**
 * Reusable data table with optional pagination.
 * @param {Object} props
 * @param {Array<{ key: string, label: string, render?: (row: any) => React.ReactNode }>} props.columns
 * @param {Array<any>} props.data
 * @param {boolean} [props.loading]
 * @param {{ page: number, totalPages: number, total: number, limit: number, onPageChange: (page: number) => void }} [props.pagination]
 * @param {(row: any) => React.ReactNode} [props.actions] - optional actions cell per row
 */
function DataTable({ columns = [], data = [], loading = false, pagination, actions }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/80">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium text-gray-300">
                  {col.label}
                </th>
              ))}
              {actions ? <th className="px-4 py-3 font-medium text-gray-300 w-24">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-400">
                  No data
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row._id || idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-200">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {actions ? <td className="px-4 py-3">{actions(row)}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-700 bg-gray-800/50">
          <span className="text-gray-400 text-sm">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
