// frontend/src/hooks/useExportShare.ts
'use client'

import { useState, useCallback } from 'react'
import { 
  generatePDF, 
  generateCSV, 
  generateJSON, 
  printData, 
  shareViaLink, 
  shareViaEmail, 
  copyToClipboard,
  type ExportField,
  type ExportConfig
} from '@/lib/export-utils'

interface UseExportShareOptions {
  title: string
  data: any
  fields: ExportField[]
  filename?: string
  userRole?: string
}

export const useExportShare = (options: UseExportShareOptions) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const config: ExportConfig = {
    title: options.title,
    data: options.data,
    fields: options.fields,
    filename: options.filename
  }

  const handleExport = useCallback(async (
    format: 'pdf' | 'csv' | 'json',
    selectedFields: string[]
  ) => {
    setLoading(true)
    try {
      switch (format) {
        case 'pdf':
          await generatePDF(config, selectedFields)
          break
        case 'csv':
          generateCSV(config, selectedFields)
          break
        case 'json':
          generateJSON(config, selectedFields)
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [config])

  const handlePrint = useCallback((selectedFields: string[]) => {
    try {
      printData(config, selectedFields)
    } catch (error) {
      console.error('Print failed:', error)
      throw error
    }
  }, [config])

  const handleShare = useCallback(async (
    method: 'link' | 'email' | 'copy',
    selectedFields: string[]
  ) => {
    setLoading(true)
    try {
      switch (method) {
        case 'link':
          await shareViaLink(config, selectedFields)
          break
        case 'email':
          shareViaEmail(config, selectedFields)
          break
        case 'copy':
          await copyToClipboard(config, selectedFields)
          break
      }
    } catch (error) {
      console.error('Share failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [config])

  const openModal = useCallback(() => {
    // Only allow super_admins to access this feature
    if (options.userRole === 'super_admin') {
      setIsModalOpen(true)
    }
  }, [options.userRole])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return {
    isModalOpen,
    loading,
    openModal,
    closeModal,
    handleExport,
    handlePrint,
    handleShare,
    config
  }
}
