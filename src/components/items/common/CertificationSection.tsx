// frontend/src/components/items/common/CertificationSection.tsx
"use client"

import React from 'react'

interface CertificationSectionProps {
  galleryCertification: boolean
  galleryCertificationFile: string
  galleryId: string
  artistCertification: boolean
  artistCertificationFile: string
  certifiedArtistId: string
  artistFamilyCertification: boolean
  artistFamilyCertificationFile: string
  restorationDone: boolean
  restorationDoneFile: string
  restorationBy: string
  onFieldChange: (field: string, value: string | boolean) => void
  onCertificationFileUpload: (certificationType: 'gallery_certification_file' | 'artist_certification_file' | 'artist_family_certification_file' | 'restoration_done_file', file: File) => void
  uniqueIdPrefix?: string // For unique IDs when multiple forms exist
}

export default function CertificationSection({
  galleryCertification,
  galleryCertificationFile,
  galleryId,
  artistCertification,
  artistCertificationFile,
  certifiedArtistId,
  artistFamilyCertification,
  artistFamilyCertificationFile,
  restorationDone,
  restorationDoneFile,
  restorationBy,
  onFieldChange,
  onCertificationFileUpload,
  uniqueIdPrefix = ''
}: CertificationSectionProps) {

  return (
    <div className="space-y-4">
      {/* Gallery Certification */}
      <div>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            id={`${uniqueIdPrefix}gallery_certification`}
            checked={galleryCertification}
            onChange={(e) => onFieldChange('gallery_certification', e.target.checked)}
            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded hover:border-teal-400 transition-colors duration-200 cursor-pointer"
          />
          <label htmlFor={`${uniqueIdPrefix}gallery_certification`} className="text-sm font-medium text-gray-700 cursor-pointer hover:text-teal-600 transition-colors duration-200">
            Gallery Certification
          </label>
        </div>
        {galleryCertification && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Which Gallery?</label>
              <input
                type="text"
                value={galleryId}
                onChange={(e) => onFieldChange('gallery_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
                placeholder="Gallery name"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Certification Document (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    onCertificationFileUpload('gallery_certification_file', file)
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {galleryCertificationFile && (
                <div className="mt-2 text-xs text-green-600">
                  ✓ File uploaded
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Artist Certification */}
      <div>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            id={`${uniqueIdPrefix}artist_certification`}
            checked={artistCertification}
            onChange={(e) => onFieldChange('artist_certification', e.target.checked)}
            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded hover:border-teal-400 transition-colors duration-200 cursor-pointer"
          />
          <label htmlFor={`${uniqueIdPrefix}artist_certification`} className="text-sm font-medium text-gray-700 cursor-pointer hover:text-teal-600 transition-colors duration-200">
            Artist Certification
          </label>
        </div>
        {artistCertification && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Which Artist?</label>
              <input
                type="text"
                value={certifiedArtistId}
                onChange={(e) => onFieldChange('certified_artist_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
                placeholder="Artist name for certification"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Certification Document (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    onCertificationFileUpload('artist_certification_file', file)
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {artistCertificationFile && (
                <div className="mt-2 text-xs text-green-600">
                  ✓ File uploaded
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Artist Family Certification */}
      <div>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            id={`${uniqueIdPrefix}artist_family_certification`}
            checked={artistFamilyCertification}
            onChange={(e) => onFieldChange('artist_family_certification', e.target.checked)}
            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded hover:border-teal-400 transition-colors duration-200 cursor-pointer"
          />
          <label htmlFor={`${uniqueIdPrefix}artist_family_certification`} className="text-sm font-medium text-gray-700 cursor-pointer hover:text-teal-600 transition-colors duration-200">
            Artist Family Certification
          </label>
        </div>
        {artistFamilyCertification && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Certification Document (optional)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  onCertificationFileUpload('artist_family_certification_file', file)
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {artistFamilyCertificationFile && (
              <div className="mt-2 text-xs text-green-600">
                ✓ File uploaded
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restoration */}
      <div>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            id={`${uniqueIdPrefix}restoration_done`}
            checked={restorationDone}
            onChange={(e) => onFieldChange('restoration_done', e.target.checked)}
            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded hover:border-teal-400 transition-colors duration-200 cursor-pointer"
          />
          <label htmlFor={`${uniqueIdPrefix}restoration_done`} className="text-sm font-medium text-gray-700 cursor-pointer hover:text-teal-600 transition-colors duration-200">
            Restoration Done
          </label>
        </div>
        {restorationDone && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Done by (Person/Company)</label>
              <input
                type="text"
                value={restorationBy}
                onChange={(e) => onFieldChange('restoration_by', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-300 transition-colors duration-200"
                placeholder="Name of person or company who did the restoration"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Restoration Documentation (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    onCertificationFileUpload('restoration_done_file', file)
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {restorationDoneFile && (
                <div className="mt-2 text-xs text-green-600">
                  ✓ File uploaded
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
