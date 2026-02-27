// frontend/src/components/payments/XeroPaymentGenerator.tsx
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
  Loader2
} from 'lucide-react';
import { createXeroPaymentLink, XeroPaymentLink } from '@/lib/xero-payments-api';

interface XeroPaymentGeneratorProps {
  brandId?: string;
  defaultAmount?: number;
  defaultDescription?: string;
  defaultCustomerEmail?: string;
  onPaymentLinkCreated?: (paymentLink: XeroPaymentLink) => void;
}

export default function XeroPaymentGenerator({
  brandId,
  defaultAmount,
  defaultDescription,
  defaultCustomerEmail,
  onPaymentLinkCreated
}: XeroPaymentGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<XeroPaymentLink | null>(null);
  const [formData, setFormData] = useState({
    brandId: brandId || '',
    amount: defaultAmount?.toString() || '',
    description: defaultDescription || '',
    customerEmail: defaultCustomerEmail || ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGeneratePaymentLink = async () => {
    if (!formData.brandId || !formData.amount || !formData.description) {
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

      const result = await createXeroPaymentLink(
        formData.brandId,
        amount,
        formData.description,
        formData.customerEmail || undefined
      );

      if (result.success) {
        setPaymentLink(result.paymentLink);
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
    if (paymentLink?.paymentUrl) {
      window.open(paymentLink.paymentUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Generate Xero Payment Link
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
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                placeholder="customer@example.com"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this payment is for..."
              rows={3}
              disabled={loading}
            />
          </div>

          <Button 
            onClick={handleGeneratePaymentLink}
            disabled={loading || !formData.amount || !formData.description || (!brandId && !formData.brandId)}
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
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Invoice Number:</span>
                    <div className="text-gray-600">{paymentLink.invoiceNumber}</div>
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span>
                    <div className="text-gray-600">£{paymentLink.amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Due Date:</span>
                    <div className="text-gray-600">{new Date(paymentLink.dueDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <div className="text-gray-600">{paymentLink.status}</div>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-sm">Payment URL:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={paymentLink.paymentUrl}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      onClick={() => copyToClipboard(paymentLink.paymentUrl)}
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
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>Enter the payment amount and description</li>
            <li>Optionally provide customer email for automatic contact creation</li>
            <li>Click "Generate Payment Link" to create a Xero invoice</li>
            <li>Share the payment URL with your customer</li>
            <li>Customer can pay directly through Xero's secure payment portal</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
