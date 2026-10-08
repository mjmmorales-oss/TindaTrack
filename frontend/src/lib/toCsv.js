/**
 * Utility to convert tabular records to CSV format and trigger client-side download.
 *
 * @param {Array<object>} data - Records to export
 * @param {Array<{ key: string, label: string }>} columns - Column mappings
 * @param {string} [filename='export.csv'] - File name for download
 */
export function exportToCsv(data = [], columns = [], filename = 'export.csv') {
  if (!data || !data.length || !columns.length) return

  const headers = columns.map((col) => `"${(col.label || col.key).replace(/"/g, '""')}"`).join(',')
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const val = item[col.key]
        if (val === null || val === undefined) return '""'
        const strVal = String(val).replace(/"/g, '""')
        return `"${strVal}"`
      })
      .join(','),
  )

  const csvContent = [headers, ...rows].join('\r\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default exportToCsv
