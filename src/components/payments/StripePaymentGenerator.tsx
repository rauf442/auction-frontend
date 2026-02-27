// frontend/src/components/payments/StripePaymentGenerator.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard, 
  ExternalLink, 
  Check, 
  AlertCircle, 
  Copy,
  Loader2,
  QrCode
} from 'lucide-react';
import { createStripePaymentLink, StripePaymentLink } from '@/lib/stripe-payments-api';
import QRCode from 'qrcode';

interface StripePaymentGeneratorProps {
  brandId?: string;
  defaultAmount?: number;
  defaultTitle?: string;
  defaultDescription?: string;
  onPaymentLinkCreated?: (paymentLink: StripePaymentLink) => void;
}

export default function StripePaymentGenerator({
  brandId,
  defaultAmount,
  defaultTitle,
  defaultDescription,
  onPaymentLinkCreated
}: StripePaymentGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<StripePaymentLink | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    brandId: brandId || '',
    amount: defaultAmount?.toString() || '',
    title: defaultTitle || '',
    description: defaultDescription || ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateQRCode = async (url: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!formData.brandId || !formData.amount || !formData.title) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount greater than 0' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const result = await createStripePaymentLink(
        formData.brandId,
        amount,
        formData.title,
        formData.description || undefined
      );

      if (result.success) {
        setPaymentLink(result.paymentLink);
        await generateQRCode(result.paymentLink.url);
        setMessage({ type: 'success', text: 'Payment link generated successfully!' });
        onPaymentLinkCreated?.(result.paymentLink);
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to generate payment link' 
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: 'success', text: 'Copied to clipboard!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const openPaymentLink = () => {
    if (paymentLink?.url) {
      window.open(paymentLink.url, '_blank');
    }
  };

  const downloadQRCode = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.download = `payment-qr-${paymentLink?.id || 'code'}.png`;
      link.href = qrCodeDataUrl;
      link.click();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Generate Stripe Payment Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <div className={`p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {!brandId && (
            <div>
              <Label htmlFor="brandId">Brand ID *</Label>
              <Input
                id="brandId"
                value={formData.brandId}
                onChange={(e) => handleInputChange('brandId', e.target.value)}
                placeholder="Enter brand ID"
                disabled={loading}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount (£) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="title">Payment Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Invoice Payment"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description for the payment..."
              rows={3}
              disabled={loading}
            />
          </div>

          <Button 
            onClick={handleGeneratePaymentLink}
            disabled={loading || !formData.amount || !formData.title || (!brandId && !formData.brandId)}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Generate Payment Link
              </>
            )}
          </Button>
        </div>

        {/* Generated Payment Link */}
        {paymentLink && (
          <div className="space-y-4">
            <hr />
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3">Payment Link Generated!</h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Payment ID:</span>
                    <div className="text-gray-600 font-mono text-xs">{paymentLink.id}</div>
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span>
                    <div className="text-gray-600">£{paymentLink.amount.toFixed(2)}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Title:</span>
                    <div className="text-gray-600">{paymentLink.title}</div>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-sm">Payment URL:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={paymentLink.url}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      onClick={() => copyToClipboard(paymentLink.url)}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={openPaymentLink}
                      size="sm"
                      variant="outline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <span className="font-medium text-sm">QR Code:</span>
                      <p className="text-xs text-gray-600 mt-1">
                        Customers can scan this QR code to access the payment link
                      </p>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <img
                        src={qrCodeDataUrl}
                        alt="Payment QR Code"
                        className="border border-gray-200 rounded"
                      />
                      <Button
                        onClick={downloadQRCode}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <QrCode className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>Enter the payment amount and title</li>
            <li>Add an optional description for clarity</li>
            <li>Click "Generate Payment Link" to create the Stripe payment link</li>
            <li>Share the URL or QR code with your customer</li>
            <li>Customer can pay securely through Stripe's hosted checkout</li>
            <li>You'll receive payment confirmations via Stripe dashboard</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
