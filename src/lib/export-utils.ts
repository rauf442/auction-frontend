// frontend/src/lib/export-utils.ts

export interface ExportField {
  key: string
  label: string
  selected: boolean
  required?: boolean
}

export interface ExportConfig {
  title: string
  data: any
  fields: ExportField[]
  filename?: string
}

// Generate PDF from data
export const generatePDF = async (config: ExportConfig, selectedFields: string[]): Promise<void> => {
  const jsPDFModule = await import('jspdf')
  const jsPDF = jsPDFModule.default
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(18)
  doc.text(config.title, 20, 20)
  
  // Date
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30)
  
  let yPosition = 50
  const lineHeight = 7
  const pageHeight = doc.internal.pageSize.height
  
  // Add selected fields
  const fieldsToInclude = config.fields.filter(field => 
    selectedFields.includes(field.key)
  )
  
  if (Array.isArray(config.data)) {
    // Handle array data (tables)
    config.data.forEach((item: any, index: number) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setFontSize(12)
      doc.text(`Item ${index + 1}`, 20, yPosition)
      yPosition += lineHeight + 3
      
      fieldsToInclude.forEach(field => {
        if (yPosition > pageHeight - 20) {
          doc.addPage()
          yPosition = 20
        }
        
        doc.setFontSize(10)
        const value = item[field.key] || 'N/A'
        doc.text(`${field.label}: ${value}`, 25, yPosition)
        yPosition += lineHeight
      })
      
      yPosition += 5
    })
  } else {
    // Handle single object data
    fieldsToInclude.forEach(field => {
      if (yPosition > pageHeight - 20) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setFontSize(10)
      const value = config.data[field.key] || 'N/A'
      doc.text(`${field.label}: ${value}`, 20, yPosition)
      yPosition += lineHeight
    })
  }
  
  // Download the PDF
  const filename = config.filename || `${config.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`
  doc.save(filename)
}

// Generate CSV from data
export const generateCSV = (config: ExportConfig, selectedFields: string[]): void => {
  const fieldsToInclude = config.fields.filter(field => 
    selectedFields.includes(field.key)
  )
  
  let csvContent = ''
  
  // Headers
  csvContent += fieldsToInclude.map(field => `"${field.label}"`).join(',') + '\n'
  
  if (Array.isArray(config.data)) {
    // Handle array data
    config.data.forEach((item: any) => {
      const row = fieldsToInclude.map(field => {
        const value = item[field.key] || ''
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
      csvContent += row + '\n'
    })
  } else {
    // Handle single object data
    const row = fieldsToInclude.map(field => {
      const value = config.data[field.key] || ''
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
    csvContent += row + '\n'
  }
  
  // Download the CSV
  const filename = config.filename || `${config.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Generate JSON from data
export const generateJSON = (config: ExportConfig, selectedFields: string[]): void => {
  const fieldsToInclude = config.fields.filter(field => 
    selectedFields.includes(field.key)
  )
  
  let jsonData: any
  
  if (Array.isArray(config.data)) {
    jsonData = config.data.map((item: any) => {
      const filteredItem: any = {}
      fieldsToInclude.forEach(field => {
        filteredItem[field.key] = item[field.key]
      })
      return filteredItem
    })
  } else {
    jsonData = {}
    fieldsToInclude.forEach(field => {
      jsonData[field.key] = config.data[field.key]
    })
  }
  
  const jsonString = JSON.stringify(jsonData, null, 2)
  
  // Download the JSON
  const filename = config.filename || `${config.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Print function
export const printData = (config: ExportConfig, selectedFields: string[]): void => {
  const fieldsToInclude = config.fields.filter(field => 
    selectedFields.includes(field.key)
  )
  
  let printContent = `
    <html>
      <head>
        <title>${config.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          .item { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .field { margin: 5px 0; }
          .field-label { font-weight: bold; color: #374151; }
          .field-value { margin-left: 10px; }
          @media print {
            body { margin: 0; }
            .item { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${config.title}</h1>
        <div class="meta">Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
  `
  
  if (Array.isArray(config.data)) {
    config.data.forEach((item: any, index: number) => {
      printContent += `<div class="item"><h3>Item ${index + 1}</h3>`
      fieldsToInclude.forEach(field => {
        const value = item[field.key] || 'N/A'
        printContent += `
          <div class="field">
            <span class="field-label">${field.label}:</span>
            <span class="field-value">${value}</span>
          </div>
        `
      })
      printContent += '</div>'
    })
  } else {
    printContent += '<div class="item">'
    fieldsToInclude.forEach(field => {
      const value = config.data[field.key] || 'N/A'
      printContent += `
        <div class="field">
          <span class="field-label">${field.label}:</span>
          <span class="field-value">${value}</span>
        </div>
      `
    })
    printContent += '</div>'
  }
  
  printContent += '</body></html>'
  
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

// Share functions
export const shareViaLink = async (config: ExportConfig, selectedFields: string[]): Promise<void> => {
  // Generate a temporary link (in a real app, this would create a secure link on the server)
  const exportData = {
    title: config.title,
    fields: selectedFields,
    timestamp: Date.now()
  }
  
  const dataUrl = `data:application/json,${encodeURIComponent(JSON.stringify(exportData))}`
  
  if (navigator.share) {
    await navigator.share({
      title: config.title,
      text: `Shared data: ${config.title}`,
      url: dataUrl
    })
  } else {
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(dataUrl)
    alert('Link copied to clipboard!')
  }
}

export const shareViaEmail = (config: ExportConfig, selectedFields: string[]): void => {
  const subject = encodeURIComponent(`Shared Data: ${config.title}`)
  const body = encodeURIComponent(`
Please find the shared data below:

Title: ${config.title}
Generated: ${new Date().toLocaleString()}
Fields: ${selectedFields.join(', ')}

This data was generated from the system on ${new Date().toLocaleDateString()}.
  `)
  
  window.open(`mailto:?subject=${subject}&body=${body}`)
}

export const copyToClipboard = async (config: ExportConfig, selectedFields: string[]): Promise<void> => {
  const fieldsToInclude = config.fields.filter(field => 
    selectedFields.includes(field.key)
  )
  
  let textContent = `${config.title}\n`
  textContent += `Generated: ${new Date().toLocaleString()}\n\n`
  
  if (Array.isArray(config.data)) {
    config.data.forEach((item: any, index: number) => {
      textContent += `Item ${index + 1}:\n`
      fieldsToInclude.forEach(field => {
        const value = item[field.key] || 'N/A'
        textContent += `  ${field.label}: ${value}\n`
      })
      textContent += '\n'
    })
  } else {
    fieldsToInclude.forEach(field => {
      const value = config.data[field.key] || 'N/A'
      textContent += `${field.label}: ${value}\n`
    })
  }
  
  await navigator.clipboard.writeText(textContent)
}
