// frontend/src/lib/consignment-pdf-api.ts

/**
 * API utilities for generating consignment PDFs from backend
 * Replaces frontend react-pdf components with backend PDFKit generation
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// Interface definitions to match backend
export interface PDFCustomization {
  includeHeader: boolean;
  includeFooter: boolean;
  includeLogo: boolean;
  includeClientDetails: boolean;
  includeItemDetails: boolean;
  includeSpecialistInfo: boolean;
  includeSignatures: boolean;
  includeTermsConditions: boolean;
  headerText: string;
  footerText: string;
  documentTitle: string;
  customNotes: string;
  fontSize: 'small' | 'medium' | 'large';
  orientation: 'portrait' | 'landscape';
  paperSize: 'A4' | 'A3' | 'Letter';
  margin: 'small' | 'medium' | 'large';
  branding: 'minimal' | 'standard' | 'full';
}

export interface SaleDetails {
  sale_name: string;
  sale_date: string;
  sale_location: string;
  viewing_dates?: string[];
}

export interface ReturnedItem {
  id: string;
  lot_number?: string;
  title: string;
  description: string;
  artist_name?: string;
  school_name?: string;
  dimensions?: string;
  condition?: string;
  return_reason?: string;
  return_date: string;
  location?: string;
}

/**
 * Get authorization headers
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
}

/**
 * Download file from blob response
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Consignment Receipt PDF
 */
export async function generateConsignmentReceiptPDF(
  consignmentId: string | number,
  download: boolean = true
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/consignments/${consignmentId}/receipt-pdf`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    
    if (download) {
      downloadBlob(blob, `consignment-receipt-${consignmentId}.pdf`);
    }
    
    return blob;
  } catch (error) {
    console.error('Error generating consignment receipt PDF:', error);
    throw error;
  }
}

/**
 * Generate Pre-Sale Invoice PDF (legacy - all non-returned items)
 */
export async function generatePreSaleInvoicePDF(
  consignmentId: string | number,
  saleDetails: SaleDetails,
  download: boolean = true
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/consignments/${consignmentId}/presale-invoice-pdf`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sale_details: saleDetails
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    if (download) {
      downloadBlob(blob, `presale-invoice-${consignmentId}.pdf`);
    }

    return blob;
  } catch (error) {
    console.error('Error generating pre-sale invoice PDF:', error);
    throw error;
  }
}

/**
 * Generate Auction-Specific Pre-Sale Invoice PDF
 */
export async function generateAuctionPreSaleInvoicePDF(
  consignmentId: string | number,
  auctionId: string | number,
  saleDetails: SaleDetails,
  download: boolean = true
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/consignments/${consignmentId}/presale-invoice-pdf/${auctionId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sale_details: saleDetails
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    if (download) {
      downloadBlob(blob, `presale-invoice-${consignmentId}-auction-${auctionId}.pdf`);
    }

    return blob;
  } catch (error) {
    console.error('Error generating auction-specific pre-sale invoice PDF:', error);
    throw error;
  }
}

/**
 * Generate Collection Receipt PDF
 */
export async function generateCollectionReceiptPDF(
  consignmentId: string | number,
  returnedItems: ReturnedItem[],
  options: {
    collectionDate?: string;
    collectedBy?: string;
    releasedBy?: string;
  } = {},
  download: boolean = true
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/consignments/${consignmentId}/collection-receipt-pdf`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        returned_items: returnedItems,
        collection_date: options.collectionDate,
        collected_by: options.collectedBy,
        released_by: options.releasedBy
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    
    if (download) {
      downloadBlob(blob, `collection-receipt-${consignmentId}.pdf`);
    }
    
    return blob;
  } catch (error) {
    console.error('Error generating collection receipt PDF:', error);
    throw error;
  }
}

/**
 * Generate Custom Consignment Report PDF
 */
export async function generateCustomConsignmentReportPDF(
  consignments: any[],
  template: 'summary' | 'detailed' | 'financial' | 'custom' = 'summary',
  customization?: Partial<PDFCustomization>,
  options: {
    userRole?: string;
  } = {},
  download: boolean = true
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/consignments/custom-report-pdf`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        consignments,
        template,
        customization,
        userRole: options.userRole || 'user'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    
    if (download) {
      downloadBlob(blob, `consignment-${template}-report.pdf`);
    }
    
    return blob;
  } catch (error) {
    console.error('Error generating custom consignment report PDF:', error);
    throw error;
  }
}

/**
 * Generate PDF and open in new tab for preview
 */
export async function previewConsignmentPDF(
  type: 'receipt' | 'presale' | 'collection' | 'custom',
  data: any
): Promise<void> {
  try {
    let blob: Blob;

    switch (type) {
      case 'receipt':
        blob = await generateConsignmentReceiptPDF(data.consignmentId, false);
        break;
      case 'presale':
        blob = await generatePreSaleInvoicePDF(data.consignmentId, data.saleDetails, false);
        break;
      case 'collection':
        blob = await generateCollectionReceiptPDF(data.consignmentId, data.returnedItems, data.options, false);
        break;
      case 'custom':
        blob = await generateCustomConsignmentReportPDF(data.consignments, data.template, data.customization, data.options, false);
        break;
      default:
        throw new Error('Invalid PDF type');
    }

    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // Clean up URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000);

  } catch (error) {
    console.error('Error previewing PDF:', error);
    throw error;
  }
}

/**
 * Generate Public Consignment Receipt PDF (for client-facing pages)
 */
export async function generatePublicConsignmentReceiptPDF(
  consignmentId: string | number,
  accessToken?: string,
  download: boolean = true
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/consignments/${consignmentId}/receipt-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    if (download) {
      downloadBlob(blob, `consignment-receipt-${consignmentId}.pdf`);
    }

    return blob;
  } catch (error) {
    console.error('Error generating public consignment receipt PDF:', error);
    throw error;
  }
}

/**
 * Generate Public Pre-Sale Invoice PDF (for client-facing pages)
 */
export async function generatePublicPreSaleInvoicePDF(
  consignmentId: string | number,
  saleDetails: SaleDetails,
  accessToken?: string,
  download: boolean = true
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/consignments/${consignmentId}/presale-invoice-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        sale_details: saleDetails
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    if (download) {
      downloadBlob(blob, `presale-invoice-${consignmentId}.pdf`);
    }

    return blob;
  } catch (error) {
    console.error('Error generating public pre-sale invoice PDF:', error);
    throw error;
  }
}

/**
 * Generate Public Collection Receipt PDF (for client-facing pages)
 */
export async function generatePublicCollectionReceiptPDF(
  consignmentId: string | number,
  returnedItems: ReturnedItem[],
  options: {
    collectionDate?: string;
    collectedBy?: string;
    releasedBy?: string;
  } = {},
  accessToken?: string,
  download: boolean = true
): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/consignments/${consignmentId}/collection-receipt-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        returned_items: returnedItems,
        collection_date: options.collectionDate,
        collected_by: options.collectedBy,
        released_by: options.releasedBy
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    if (download) {
      downloadBlob(blob, `collection-receipt-${consignmentId}.pdf`);
    }

    return blob;
  } catch (error) {
    console.error('Error generating public collection receipt PDF:', error);
    throw error;
  }
}

/**
 * Hook for React components to generate PDFs with loading states
 */
export function useConsignmentPDF() {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generatePDF = async (
    type: 'receipt' | 'presale' | 'collection' | 'custom',
    data: any,
    preview: boolean = false
  ) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      if (preview) {
        await previewConsignmentPDF(type, data);
      } else {
        switch (type) {
          case 'receipt':
            await generateConsignmentReceiptPDF(data.consignmentId);
            break;
          case 'presale':
            await generatePreSaleInvoicePDF(data.consignmentId, data.saleDetails);
            break;
          case 'collection':
            await generateCollectionReceiptPDF(data.consignmentId, data.returnedItems, data.options);
            break;
          case 'custom':
            await generateCustomConsignmentReportPDF(data.consignments, data.template, data.customization, data.options);
            break;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PDF';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePDF,
    isGenerating,
    error,
    clearError: () => setError(null)
  };
}

// Import React for the hook
import React from 'react';
