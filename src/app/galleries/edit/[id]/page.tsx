// frontend/src/app/galleries/edit/[id]/page.tsx
'use client'

import GalleryForm from '@/components/galleries/GalleryForm'
import { useParams } from 'next/navigation'

export default function EditGalleryPage() {
  const params = useParams()
  const galleryId = params.id as string

  return <GalleryForm mode="edit" galleryId={galleryId} />
} 