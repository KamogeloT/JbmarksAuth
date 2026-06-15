'use client'

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'

interface ExportButtonProps {
  data: Record<string, any>[]
  filename: string
  title?: string
  /** ID of the report container element to capture for PDF */
  reportContainerId?: string
}

/**
 * Strip common task title prefixes for export
 */
function cleanTitle(value: any): string {
  if (typeof value !== 'string') return value?.toString() || ''
  return value.replace(/^.+?[-:]\s+/, '').trim()
}

function cleanExportData(data: Record<string, any>[]): Record<string, any>[] {
  return data.map(row => {
    const cleaned: Record<string, any> = {}
    for (const key of Object.keys(row)) {
      const lk = key.toLowerCase()
      if (lk === 'title' || lk === 'task title' || lk === 'task') {
        cleaned[key] = cleanTitle(row[key])
      } else {
        cleaned[key] = row[key]
      }
    }
    return cleaned
  })
}

export function ExportButton({ data, filename, title, reportContainerId }: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  const exportExcel = () => {
    if (data.length === 0) return
    setShowMenu(false)
    setExporting(true)

    try {
      const cleaned = cleanExportData(data)
      const worksheet = XLSX.utils.json_to_sheet(cleaned)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks')

      worksheet['!cols'] = Object.keys(cleaned[0]).map(key => ({
        wch: Math.max(
          key.length + 2,
          ...cleaned.map(row => (row[key]?.toString() || '').length)
        )
      }))

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `JBmarks-${filename}-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Excel export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const exportPDF = async () => {
    setShowMenu(false)
    setExporting(true)

    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const html2canvas = (await import('html2canvas')).default

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const margin = 10
      const contentW = pageW - margin * 2
      const today = new Date().toLocaleDateString('en-ZA', {
        year: 'numeric', month: 'long', day: 'numeric'
      })

      // ── Helper: Draw header on current page ──
      const drawHeader = () => {
        doc.setFillColor(27, 94, 32)
        doc.rect(0, 0, pageW, 18, 'F')
        try {
          const logoImg = document.querySelector('img[src="/logo.png"]') as HTMLImageElement
          if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
            doc.addImage(logoImg, 'PNG', 4, 1.5, 15, 15)
          }
        } catch { /* skip */ }
        doc.setFontSize(14)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text(title || 'Report', 22, 11)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(200, 230, 201)
        doc.text(`Generated: ${today}`, pageW - margin, 8, { align: 'right' })
        doc.text('JBmarks Reports', pageW - margin, 13, { align: 'right' })
      }

      // ── Helper: Draw footer on current page ──
      const drawFooter = (pageNum: number, totalPages: number) => {
        doc.setFillColor(27, 94, 32)
        doc.rect(0, pageH - 7, pageW, 7, 'F')
        doc.setFontSize(7)
        doc.setTextColor(255, 255, 255)
        doc.text(
          `JBmarks Reports  |  ${title || 'Report'}  |  Page ${pageNum} of ${totalPages}`,
          pageW / 2, pageH - 2.5, { align: 'center' }
        )
      }

      // ── Page 1: Header + Charts ──
      drawHeader()

      // Capture charts section
      const containerId = reportContainerId || 'report-content'
      const container = document.getElementById(containerId)
      let yPos = 22

      if (container) {
        // Capture the full report as image
        const originalMaxH = container.style.maxHeight
        const originalOverflow = container.style.overflow
        container.style.maxHeight = 'none'
        container.style.overflow = 'visible'

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#f5f5f7',
          logging: false,
        })

        container.style.maxHeight = originalMaxH
        container.style.overflow = originalOverflow

        const imgData = canvas.toDataURL('image/png')
        const imgWidth = contentW
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // Add chart image across pages
        const availableH = pageH - yPos - 10
        if (imgHeight <= availableH) {
          doc.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight)
          yPos += imgHeight + 5
        } else {
          // Split across pages
          let srcY = 0
          let remaining = imgHeight

          while (remaining > 0) {
            const sliceH = Math.min(remaining, availableH)
            const srcH = Math.round((sliceH / imgHeight) * canvas.height)

            const sliceCanvas = document.createElement('canvas')
            sliceCanvas.width = canvas.width
            sliceCanvas.height = srcH
            const ctx = sliceCanvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)
              const sliceData = sliceCanvas.toDataURL('image/png')
              doc.addImage(sliceData, 'PNG', margin, yPos, imgWidth, sliceH)
            }

            srcY += srcH
            remaining -= sliceH

            if (remaining > 0) {
              doc.addPage()
              drawHeader()
              yPos = 22
            }
          }
        }
      }

      // ── Add data table on new page ──
      if (data.length > 0) {
        doc.addPage()
        drawHeader()

        // Summary band
        doc.setFillColor(232, 245, 233)
        doc.rect(0, 18, pageW, 7, 'F')
        doc.setFontSize(8)
        doc.setTextColor(46, 125, 50)
        doc.setFont('helvetica', 'normal')
        doc.text(`Total records: ${data.length}`, margin + 4, 22.5)

        const cleaned = cleanExportData(data)
        const headers = Object.keys(cleaned[0])
        const rows = cleaned.map(row => headers.map(h => {
          const val = row[h]?.toString() || ''
          return val.length > 55 ? val.substring(0, 52) + '...' : val
        }))

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 27,
          styles: {
            fontSize: 7,
            cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
            lineColor: [220, 220, 220],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [27, 94, 32],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'center',
          },
          alternateRowStyles: {
            fillColor: [245, 250, 245],
          },
          margin: { left: margin, right: margin, top: 22 },
          didDrawPage: (hookData: any) => {
            // Draw header on every new page the table spills onto
            if (hookData.pageNumber > 1 || hookData.pageCount > 1) {
              drawHeader()
            }
          },
        })
      }

      // ── Draw footers on all pages ──
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        drawFooter(i, totalPages)
      }

      doc.save(`JBmarks-${filename}-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-[13px] font-medium text-ios-label shadow-ios hover:shadow-ios-lg active:scale-95 transition-all duration-200 disabled:opacity-40"
      >
        {exporting ? (
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-brand-dark" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        Export
        <svg className={`w-3 h-3 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-52 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-ios-xl border border-white/50 overflow-hidden z-50">
          <div className="px-4 py-2 border-b border-ios-separator">
            <p className="text-[11px] font-semibold text-ios-tertiary uppercase tracking-wide">Export As</p>
          </div>
          <button
            onClick={exportExcel}
            disabled={data.length === 0}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] font-medium text-ios-label hover:bg-gray-50/80 transition-colors disabled:opacity-40"
          >
            <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 17l2-3-2-3h1.5l1.25 2 1.25-2H13.5l-2 3 2 3H12l-1.25-2L9.5 17H8z"/>
              </svg>
            </span>
            <div>
              <p>Excel Spreadsheet</p>
              <p className="text-[11px] text-ios-tertiary">Filtered data as .xlsx</p>
            </div>
          </button>
          <div className="border-t border-ios-separator mx-3"></div>
          <button
            onClick={exportPDF}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] font-medium text-ios-label hover:bg-gray-50/80 transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM10.5 11c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H9v2H7.5v-6h3zm0 3c.28 0 .5-.22.5-.5v-1c0-.28-.22-.5-.5-.5H9v2h1.5z"/>
              </svg>
            </span>
            <div>
              <p>PDF with Charts</p>
              <p className="text-[11px] text-ios-tertiary">Full visual report</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
