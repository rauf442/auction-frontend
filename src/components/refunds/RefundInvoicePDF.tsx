// frontend/src/components/refunds/RefundInvoicePDF.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { Refund } from '@/types/api';

interface RefundInvoicePDFProps {
  refund: Refund;
  onGenerate?: () => void;
}

export default function RefundInvoicePDF({ refund, onGenerate }: RefundInvoicePDFProps) {
  const generatePDF = () => {
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Refund Invoice - ${refund.refund_number}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.4; 
            color: #333; 
            background: white;
            padding: 20px;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header { 
            border-bottom: 3px solid #0ea5e9; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
        }
        .logo-section h1 { 
            color: #0ea5e9; 
            font-size: 28px; 
            margin-bottom: 5px; 
        }
        .logo-section p { 
            color: #666; 
            font-size: 14px; 
        }
        .invoice-info { 
            text-align: right; 
        }
        .invoice-info h2 { 
            color: #dc2626; 
            font-size: 24px; 
            margin-bottom: 10px; 
        }
        .invoice-info p { 
            margin-bottom: 5px; 
            font-size: 14px; 
        }
        .client-details { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 30px; 
        }
        .client-details h3 { 
            color: #374151; 
            margin-bottom: 15px; 
            font-size: 18px; 
        }
        .details-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
        }
        .detail-item { 
            margin-bottom: 8px; 
        }
        .detail-label { 
            font-weight: 600; 
            color: #374151; 
            display: inline-block; 
            width: 120px; 
        }
        .refund-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px; 
            background: white; 
            border: 1px solid #e5e7eb; 
        }
        .refund-table th { 
            background: #f3f4f6; 
            padding: 12px; 
            text-align: left; 
            font-weight: 600; 
            border-bottom: 2px solid #d1d5db; 
        }
        .refund-table td { 
            padding: 12px; 
            border-bottom: 1px solid #e5e7eb; 
        }
        .amount { 
            text-align: right; 
            font-weight: 600; 
        }
        .total-row { 
            background: #fef3c7; 
            font-weight: bold; 
        }
        .total-row td { 
            border-bottom: 2px solid #d97706; 
        }
        .notes-section { 
            margin-top: 30px; 
            padding: 20px; 
            background: #fefefe; 
            border-left: 4px solid #0ea5e9; 
        }
        .notes-section h4 { 
            color: #374151; 
            margin-bottom: 10px; 
        }
        .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #e5e7eb; 
            text-align: center; 
            color: #6b7280; 
            font-size: 12px; 
        }
        .status-badge { 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
            text-transform: uppercase; 
        }
        .status-pending { 
            background: #fef3c7; 
            color: #92400e; 
        }
        .status-approved { 
            background: #d1fae5; 
            color: #065f46; 
        }
        .status-completed { 
            background: #dbeafe; 
            color: #1e40af; 
        }
        @media print {
            body { padding: 0; }
            .container { max-width: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <h1>MetSab Auctions Ltd</h1>
                <p>Professional Art Auction House</p>
                <p>London, United Kingdom</p>
            </div>
            <div class="invoice-info">
                <h2>REFUND INVOICE</h2>
                <p><strong>Refund #:</strong> ${refund.refund_number}</p>
                <p><strong>Date:</strong> ${new Date(refund.created_at).toLocaleDateString()}</p>
                <p><strong>Status:</strong> 
                    <span class="status-badge status-${refund.status}">
                        ${refund.status.replace('_', ' ')}
                    </span>
                </p>
                ${refund.invoice_number ? `<p><strong>Original Invoice:</strong> ${refund.invoice_number}</p>` : ''}
            </div>
        </div>

        <!-- Client Details -->
        <div class="client-details">
            <h3>Refund Details</h3>
            <div class="details-grid">
                <div>
                    <div class="detail-item">
                        <span class="detail-label">Client:</span>
                        ${refund.client_name || 'N/A'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Refund Type:</span>
                        ${refund.type === 'refund_of_artwork' ? 'Refund of Artwork' : 'Refund of Courier Difference'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Method:</span>
                        ${refund.refund_method.replace('_', ' ').toUpperCase()}
                    </div>
                </div>
                <div>
                    <div class="detail-item">
                        <span class="detail-label">Item:</span>
                        ${refund.item_title || 'N/A'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Auction:</span>
                        ${refund.auction_name || 'N/A'}
                    </div>
                    ${refund.refund_date ? `
                    <div class="detail-item">
                        <span class="detail-label">Refund Date:</span>
                        ${new Date(refund.refund_date).toLocaleDateString()}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <!-- Refund Breakdown -->
        <table class="refund-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="amount">Amount (£)</th>
                </tr>
            </thead>
            <tbody>
                ${refund.type === 'refund_of_artwork' ? `
                    ${refund.hammer_price ? `
                    <tr>
                        <td>Hammer Price</td>
                        <td class="amount">£${Number(refund.hammer_price).toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    ${refund.buyers_premium ? `
                    <tr>
                        <td>Buyer's Premium</td>
                        <td class="amount">£${Number(refund.buyers_premium).toFixed(2)}</td>
                    </tr>
                    ` : ''}
                ` : `
                    ${refund.international_shipping_cost ? `
                    <tr>
                        <td>International Shipping Cost</td>
                        <td class="amount">£${Number(refund.international_shipping_cost).toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    ${refund.local_shipping_cost ? `
                    <tr>
                        <td>Local Shipping Cost</td>
                        <td class="amount">-£${Number(refund.local_shipping_cost).toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    ${refund.handling_insurance_cost ? `
                    <tr>
                        <td>Handling & Insurance</td>
                        <td class="amount">£${Number(refund.handling_insurance_cost).toFixed(2)}</td>
                    </tr>
                    ` : ''}
                `}
                <tr class="total-row">
                    <td><strong>TOTAL REFUND AMOUNT</strong></td>
                    <td class="amount"><strong>£${Number(refund.amount).toFixed(2)}</strong></td>
                </tr>
            </tbody>
        </table>

        <!-- Reason -->
        <div class="notes-section">
            <h4>Reason for Refund</h4>
            <p>${refund.reason || 'No reason provided'}</p>
        </div>

        ${refund.client_notes ? `
        <div class="notes-section">
            <h4>Additional Notes</h4>
            <p>${refund.client_notes}</p>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <p>This refund invoice confirms that your refund has been issued by <strong>MetSab Auctions Ltd</strong>.</p>
            <p>It can take approximately 10 days to appear on your statement. If it takes longer please contact your bank for assistance.</p>
            <br>
            <p>If you have any questions, contact us at <strong>info@MetSabauctions.com</strong> or call us at <strong>+44 20 3488 4977</strong>.</p>
        </div>
    </div>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };

    // Call onGenerate callback
    onGenerate?.();
  };

  return (
    <Button onClick={generatePDF} variant="outline" size="sm">
      <FileDown className="h-4 w-4 mr-2" />
      Generate Refund Invoice PDF
    </Button>
  );
}
