'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CreditCard, Building, Smartphone, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PaymentInfo {
  invoiceNumber: string;
  amount: string;
  customerEmail: string;
  dueDate: string;
}

function PaymentPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    invoiceNumber: params.invoiceNumber as string,
    amount: searchParams.get('amount') || '0',
    customerEmail: searchParams.get('email') || '',
    dueDate: searchParams.get('due') || ''
  });

  const [selectedMethod, setSelectedMethod] = useState<string>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(num);
  };

  const formatDueDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demo purposes, we'll always succeed
      setIsSuccess(true);
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Payment Successful</CardTitle>
            <p className="text-gray-600">
              Your payment has been processed successfully
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Invoice Number</p>
              <p className="font-semibold">{paymentInfo.invoiceNumber}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="font-semibold text-lg">{formatAmount(paymentInfo.amount)}</p>
            </div>
            <p className="text-sm text-gray-600">
              A confirmation email will be sent to {paymentInfo.customerEmail}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pay Your Invoice</h1>
          <p className="text-gray-600">Secure payment powered by MetSab Auctions</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Number:</span>
                <span className="font-semibold">{paymentInfo.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Due:</span>
                <span className="font-bold text-lg text-blue-600">
                  {formatAmount(paymentInfo.amount)}
                </span>
              </div>
              {paymentInfo.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-semibold">{formatDueDate(paymentInfo.dueDate)}</span>
                </div>
              )}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  <strong>Payment Methods Available:</strong>
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">VISA</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Mastercard</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">AMEX</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Apple Pay</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Google Pay</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <p className="text-gray-600">Select your preferred payment method</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Payment Method Selection */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedMethod('card')}
                    className={`p-3 border rounded-lg flex flex-col items-center space-y-2 ${
                      selectedMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <CreditCard className="w-6 h-6" />
                    <span className="text-sm">Card</span>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('bank')}
                    className={`p-3 border rounded-lg flex flex-col items-center space-y-2 ${
                      selectedMethod === 'bank' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <Building className="w-6 h-6" />
                    <span className="text-sm">Bank</span>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('wallet')}
                    className={`p-3 border rounded-lg flex flex-col items-center space-y-2 ${
                      selectedMethod === 'wallet' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <Smartphone className="w-6 h-6" />
                    <span className="text-sm">Wallet</span>
                  </button>
                </div>

                {/* Card Payment Form */}
                {selectedMethod === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        placeholder="John Doe"
                        value={cardDetails.name}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardDetails.number}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, number: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={cardDetails.expiry}
                          onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Transfer */}
                {selectedMethod === 'bank' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Bank Transfer Details</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Account Name:</strong> MetSab Auctions Ltd</p>
                        <p><strong>Sort Code:</strong> 04-29-09</p>
                        <p><strong>Account Number:</strong> 62496255</p>
                        <p><strong>Reference:</strong> {paymentInfo.invoiceNumber}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Please use the invoice number as your payment reference when making the transfer.
                    </p>
                  </div>
                )}

                {/* Digital Wallets */}
                {selectedMethod === 'wallet' && (
                  <div className="space-y-4">
                    <Button className="w-full bg-black text-white" onClick={handlePayment}>
                      Pay with Apple Pay
                    </Button>
                    <Button className="w-full" variant="outline" onClick={handlePayment}>
                      Pay with Google Pay
                    </Button>
                  </div>
                )}

                {/* Payment Button */}
                {selectedMethod !== 'wallet' && (
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? 'Processing...' : `Pay ${formatAmount(paymentInfo.amount)}`}
                  </Button>
                )}

                <div className="text-xs text-gray-500 text-center">
                  <p>🔒 Your payment information is secure and encrypted</p>
                  <p>Powered by MetSab Auctions Payment System</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading payment details...</p>
        </div>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
} 