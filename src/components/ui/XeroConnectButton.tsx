// frontend/src/components/ui/XeroConnectButton.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  getXeroCredentials,
  getXeroAuthUrl,
  refreshXeroToken
} from '@/lib/xero-payments-api';

interface XeroConnectButtonProps {
  brandId: string;
  brandName: string;
  selectedBrand: string;
  size?: 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'compact';
}

export default function XeroConnectButton({
  brandId,
  brandName,
  selectedBrand,
  size = 'sm',
  variant = 'default'
}: XeroConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [credentials, setCredentials] = useState({
    tenantName: '',
    hasTokens: false,
    tokenExpiresAt: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (selectedBrand) {
      loadXeroCredentials();
    }
  }, [selectedBrand]);

  useEffect(() => {
    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('xero_success') === 'true') {
      setMessage({ type: 'success', text: 'Xero connected successfully!' });
      loadXeroCredentials();
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('xero_error')) {
      const error = urlParams.get('xero_error');
      setMessage({ type: 'error', text: `Connection failedx00: ${error}` });
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadXeroCredentials = async () => {
    try {
      setLoading(true);

      // Validate that we have a valid brand code
      if (!selectedBrand || selectedBrand.trim() === '' || /^\d+$/.test(selectedBrand)) {
        console.warn('Invalid brand code for Xero credentials:', selectedBrand);
        setConfigured(false);
        setCredentials({
          tenantName: '',
          hasTokens: false,
          tokenExpiresAt: ''
        });
        return;
      }

      // Use the platform-credentials API endpoint instead
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api`
        : 'http://localhost:3001/api';

      console.log('Loading Xero credentials for brand:', selectedBrand);

      const response = await fetch(`${API_BASE_URL}/platform-credentials?brand_code=${encodeURIComponent(selectedBrand)}&platform=xero`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Xero credentials API error:', response.status, errorText, 'for brand:', selectedBrand);
        throw new Error(`Failed to load Xero credentials: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const creds = result.data[0]; // Get the first Xero credential
        const additional = creds.additional || {};

        const hasTokens = !!(additional.access_token && additional.refresh_token);
        
        setConfigured(true);
        setCredentials({
          tenantName: additional.tenant_name || '',
          hasTokens: hasTokens,
          tokenExpiresAt: additional.token_expires_at || ''
        });
        
        // If tokens exist but no tenant name, still show as connected
        // Tenant will be discovered on first API call
        if (hasTokens && !additional.tenant_name) {
          console.log('Xero connected with tokens but tenant not yet discovered');
        }
      } else {
        // No credentials found - show empty form
        setConfigured(false);
        setCredentials({
          tenantName: '',
          hasTokens: false,
          tokenExpiresAt: ''
        });
      }
    } catch (error) {
      console.error('Error loading Xero credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await getXeroAuthUrl(brandId);
      const { authUrl, redirectUri } = response;

      if (!authUrl) {
        throw new Error('Failed to generate authorization URL');
      }

      // Log redirect URI for debugging
      if (redirectUri) {
        console.log('Xero Redirect URI:', redirectUri);
        console.log('Make sure this URI is configured in your Xero app at https://developer.xero.com/app/my-apps');
      }

      // Set up message listener for popup communication
      const messageHandler = (event: MessageEvent) => {
        // Verify origin for security - allow same origin and localhost
        const currentOrigin = window.location.origin;
        const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
        const isSameOrigin = event.origin === currentOrigin;
        
        // Also check if it's from the backend (for production)
        const backendUrl = process.env.NEXT_PUBLIC_API_URL;
        let isBackendOrigin = false;
        if (backendUrl) {
          try {
            const backendOrigin = new URL(backendUrl).origin;
            isBackendOrigin = event.origin === backendOrigin;
          } catch (e) {
            // Ignore URL parsing errors
          }
        }
        
        if (!isSameOrigin && !isLocalhost && !isBackendOrigin) {
          console.warn('Rejected message from unauthorized origin:', event.origin);
          return;
        }

        if (event.data.type === 'xero_oauth_success') {
          setMessage({ type: 'success', text: 'Xero connected successfully!' });
          loadXeroCredentials();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'xero_oauth_error') {
          setMessage({ type: 'error', text: `Connection failed 13221: ${event.data.error}` });
          window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      // Open Xero authorization in new window
      const popup = window.open(authUrl, 'xero_oauth', 'width=600,height=700');
      
      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.removeEventListener('message', messageHandler);
        setMessage({ type: 'error', text: 'Popup was blocked. Please allow popups for this site.' });
        return;
      }

      // Monitor popup closing
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          // If popup closed without message, reload credentials to check status
          setTimeout(() => {
            loadXeroCredentials();
          }, 1000);
        }
      }, 500);

      setMessage({ type: 'success', text: 'Redirecting to Xero...' });
    } catch (error: any) {
      console.error('Error getting Xero auth URL:', error);
      
      // Try to extract error details from response
      let errorMessage = 'Failed to get authorization URL';
      let redirectUriInfo = '';
      
      if (error.errorData) {
        // Error data already parsed
        const errorData = error.errorData;
        errorMessage = errorData.error || errorMessage;
        if (errorData.redirectUri) {
          redirectUriInfo = `\n\nRedirect URI: ${errorData.redirectUri}\nMake sure this exact URI is configured in your Xero app at https://developer.xero.com/app/my-apps`;
        }
        if (errorData.instructions) {
          redirectUriInfo = `\n\n${errorData.instructions}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setMessage({ 
        type: 'error', 
        text: `${errorMessage}${redirectUriInfo}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setLoading(true);
      await refreshXeroToken(brandId);
      setMessage({ type: 'success', text: 'Token refreshed!' });
      loadXeroCredentials();
    } catch (error) {
      console.error('Error refreshing Xero token:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to refresh token' });
    } finally {
      setLoading(false);
    }
  };

  const isTokenExpired = () => {
    if (!credentials.tokenExpiresAt) return false;
    return new Date(credentials.tokenExpiresAt) < new Date();
  };

  // Compact variant - just show status badge and connect button
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {/* Status Badge */}
        {configured && credentials.hasTokens ? (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Xero Connected
          </Badge>
        ) : configured ? (
          <Badge variant="secondary">
            Configured
          </Badge>
        ) : (
          <Badge variant="outline">
            Not Connected
          </Badge>
        )}

        {/* Connect/Refresh Button */}
        {configured && credentials.hasTokens && isTokenExpired() ? (
          <Button
            onClick={handleRefreshToken}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={loading}
            variant={credentials.hasTokens ? 'outline' : 'default'}
            size="sm"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {credentials.hasTokens ? 'Reconnect' : 'Connect Xero'}
          </Button>
        )}

        {/* Message */}
        {message && (
          <div className={`text-xs px-2 py-1 rounded ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  // Default variant - more detailed
  return (
    <div className="space-y-3">
      {/* Status Section */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <h4 className="text-sm font-medium">Xero Integration</h4>
          <p className="text-xs text-gray-600">
            {configured && credentials.hasTokens
              ? `Connected to: ${credentials.tenantName || 'Xero Organization'}`
              : 'Not connected to Xero'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {configured && credentials.hasTokens ? (
            <>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
              {isTokenExpired() && (
                <Badge variant="destructive" className="text-xs">
                  Token Expired
                </Badge>
              )}
            </>
          ) : configured ? (
            <Badge variant="secondary">
              Configured
            </Badge>
          ) : (
            <Badge variant="outline">
              Not Connected
            </Badge>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-2 rounded-md text-xs ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <Check className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {configured && credentials.hasTokens && isTokenExpired() && (
          <Button
            onClick={handleRefreshToken}
            disabled={loading}
            variant="outline"
            size={size}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Token
          </Button>
        )}
        <Button
          onClick={handleConnect}
          disabled={loading}
          variant={credentials.hasTokens ? 'outline' : 'default'}
          size={size}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {credentials.hasTokens ? 'Reconnect to Xero' : 'Connect to Xero'}
        </Button>
      </div>
    </div>
  );
}
