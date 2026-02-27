// frontend/src/components/settings/XeroConfiguration.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  ExternalLink, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  getXeroCredentials, 
  saveXeroCredentials, 
  getXeroAuthUrl, 
  refreshXeroToken 
} from '@/lib/xero-payments-api';

interface XeroConfigurationProps {
  brandId: string;
  brandName: string;
  selectedBrand: string;
}

export default function XeroConfiguration({ brandId, brandName, selectedBrand }: XeroConfigurationProps) {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    tenantName: '',
    hasTokens: false,
    tokenExpiresAt: ''
  });
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: ''
  });
  const [showSecret, setShowSecret] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadXeroCredentials();
  }, [selectedBrand]);

  useEffect(() => {
    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('xero_success') === 'true') {
      setMessage({ type: 'success', text: 'Xero connection established successfully!' });
      loadXeroCredentials();
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('xero_error')) {
      const error = urlParams.get('xero_error');
      setMessage({ type: 'error', text: `Xero connection failed: ${error}` });
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadXeroCredentials = async () => {
    try {
      setLoading(true);

      // Use the platform-credentials API endpoint instead
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api`
        : 'http://localhost:3001/api';

      const response = await fetch(`${API_BASE_URL}/platform-credentials?brand_code=${encodeURIComponent(selectedBrand)}&platform=xero`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load Xero credentials');
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const creds = result.data[0]; // Get the first Xero credential
        const additional = creds.additional || {};

        setConfigured(true);
        setCredentials({
          clientId: creds.key_id || '',
          clientSecret: '', // Never load secret from API for security
          tenantName: additional.tenant_name || '',
          hasTokens: !!(additional.access_token && additional.refresh_token),
          tokenExpiresAt: additional.token_expires_at || ''
        });
        setFormData({
          clientId: creds.key_id || '',
          clientSecret: '' // Keep empty for security
        });
      } else {
        // No credentials found - show empty form
        setConfigured(false);
        setCredentials({
          clientId: '',
          clientSecret: '',
          tenantName: '',
          hasTokens: false,
          tokenExpiresAt: ''
        });
        setFormData({
          clientId: '',
          clientSecret: ''
        });
      }
    } catch (error) {
      console.error('Error loading Xero credentials:', error);
      setMessage({ type: 'error', text: 'Failed to load Xero configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!formData.clientId || !formData.clientSecret) {
      setMessage({ type: 'error', text: 'Please provide both Client ID and Client Secret' });
      return;
    }

    try {
      setLoading(true);
      await saveXeroCredentials(brandId, formData.clientId, formData.clientSecret);
      setMessage({ type: 'success', text: 'Xero credentials saved successfully!' });
      loadXeroCredentials();
    } catch (error) {
      console.error('Error saving Xero credentials:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save credentials' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const { authUrl } = await getXeroAuthUrl(brandId);
      
      // Open Xero authorization in new window
      window.open(authUrl, '_blank', 'width=600,height=700');
      setMessage({ type: 'success', text: 'Redirecting to Xero for authorization...' });
    } catch (error) {
      console.error('Error getting Xero auth URL:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to get authorization URL' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setLoading(true);
      await refreshXeroToken(brandId);
      setMessage({ type: 'success', text: 'Xero access token refreshed successfully!' });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Xero Integration - {brandName}
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

        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium">Connection Status</h4>
            <p className="text-sm text-gray-600">
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
                  Connected
                </Badge>
                {isTokenExpired() && (
                  <Badge variant="destructive">
                    Token Expired
                  </Badge>
                )}
              </>
            ) : configured ? (
              <Badge variant="secondary">
                Credentials Saved
              </Badge>
            ) : (
              <Badge variant="outline">
                Not Configured
              </Badge>
            )}
          </div>
        </div>

        {/* Credentials Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="clientId">Xero Client ID *</Label>
            <Input
              id="clientId"
              value={formData.clientId}
              onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="Enter your Xero Client ID"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="clientSecret">Xero Client Secret *</Label>
            <div className="relative">
              <Input
                id="clientSecret"
                type={showSecret ? 'text' : 'password'}
                value={formData.clientSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                placeholder={configured ? '••••••••••••••••' : 'Enter your Xero Client Secret'}
                disabled={loading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleSaveCredentials} 
            disabled={loading || (!formData.clientId || !formData.clientSecret)}
            className="w-full"
          >
            {loading ? 'Saving...' : 'Save Credentials'}
          </Button>
        </div>

        {/* Connection Actions */}
        {configured && (
          <div className="space-y-3">
            <hr />
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Xero Authorization</h4>
                <p className="text-sm text-gray-600">
                  Connect to your Xero organization to enable payment processing
                </p>
              </div>
              <div className="flex space-x-2">
                {credentials.hasTokens && isTokenExpired() && (
                  <Button 
                    onClick={handleRefreshToken} 
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Token
                  </Button>
                )}
                <Button 
                  onClick={handleConnect} 
                  disabled={loading}
                  variant={credentials.hasTokens ? 'outline' : 'default'}
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {credentials.hasTokens ? 'Reconnect' : 'Connect to Xero'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>
              Create a Xero app at{' '}
              <a 
                href="https://developer.xero.com/myapps" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-600"
              >
                Xero Developer Portal
              </a>
            </li>
            <li>Set the redirect URI to: <code className="bg-white px-1 rounded">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/xero-payments/callback</code></li>
            <li>Copy the Client ID and Client Secret from your Xero app</li>
            <li>Paste them above and save</li>
            <li>Click "Connect to Xero" to authorize the connection</li>
          </ol>
        </div>

        {/* Token Info */}
        {configured && credentials.hasTokens && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Connection Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Organization: {credentials.tenantName || 'Unknown'}</div>
              {credentials.tokenExpiresAt && (
                <div>
                  Token expires: {new Date(credentials.tokenExpiresAt).toLocaleString()}
                  {isTokenExpired() && <span className="text-red-600 ml-2">(Expired)</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
