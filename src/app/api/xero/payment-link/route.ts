import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { 
      invoiceNumber, 
      amount, 
      customerEmail, 
      customerName,
      dueDate,
      lineItems = []
    } = await req.json();

    if (!invoiceNumber || !amount || !customerName) {
      return NextResponse.json(
        { error: 'Invoice number, amount, and customer name are required' },
        { status: 400 }
      );
    }

    // Call the backend Xero API to create invoice and get payment link
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    try {
      // First create invoice in Xero
      const invoiceData = {
        contactName: customerName,
        contactEmail: customerEmail,
        invoiceNumber: invoiceNumber,
        reference: `Invoice ${invoiceNumber}`,
        lineItems: lineItems.length > 0 ? lineItems : [
          {
            description: `Payment for Invoice ${invoiceNumber}`,
            quantity: 1,
            unitAmount: amount,
            accountCode: '200',
            taxType: 'NONE'
          }
        ],
        dueDate: dueDate,
        currency: 'GBP'
      };

      // Create invoice in Xero
      const invoiceResponse = await fetch(`${backendUrl}/api/xero/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || ''
        },
        body: JSON.stringify(invoiceData)
      });

      if (!invoiceResponse.ok) {
        throw new Error('Failed to create invoice in Xero');
      }

      const { invoice } = await invoiceResponse.json();

      // Create payment link for the invoice
      const paymentLinkResponse = await fetch(`${backendUrl}/api/xero/invoices/${invoice.invoiceId}/payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || ''
        }
      });

      if (!paymentLinkResponse.ok) {
        throw new Error('Failed to create payment link');
      }

      const { paymentLink } = await paymentLinkResponse.json();

      return NextResponse.json({
        success: true,
        paymentLink: {
          ...paymentLink,
          invoiceNumber: invoice.invoiceNumber,
          xeroInvoiceId: invoice.invoiceId
        }
      });

    } catch (xeroError) {
      console.error('Xero API error:', xeroError);
      
      // Fallback to local payment URL if Xero fails
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const fallbackPaymentUrl = `${baseUrl}/payment/${invoiceNumber}?amount=${amount}&email=${encodeURIComponent(customerEmail || '')}&due=${dueDate || ''}`;

      const fallbackPaymentLink = {
        paymentUrl: fallbackPaymentUrl,
        onlineInvoiceUrl: fallbackPaymentUrl,
        invoiceId: invoiceNumber,
        amount: amount,
        currency: 'GBP',
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        fallback: true,
        error: 'Xero integration not available, using fallback payment system'
      };

      return NextResponse.json({
        success: true,
        paymentLink: fallbackPaymentLink,
        warning: 'Using fallback payment system'
      });
    }

  } catch (error) {
    console.error('Error generating payment link:', error);
    return NextResponse.json(
      { error: 'Failed to generate payment link' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceNumber = searchParams.get('invoice');

    if (!invoiceNumber) {
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      );
    }

    // Mock response for getting payment link status
    const paymentStatus = {
      invoiceId: invoiceNumber,
      status: 'pending', // pending, paid, expired, failed
      paymentDate: null,
      amount: 0,
      currency: 'GBP'
    };

    return NextResponse.json({
      success: true,
      payment: paymentStatus
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    );
  }
} 