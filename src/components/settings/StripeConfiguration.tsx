// frontend/src/components/settings/StripeConfiguration.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Check, 
  AlertCircle, 
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react';
import { 
  getStripeCredentials, 
  saveStripeCredentials, 
  testStripeConnection 
} from '@/lib/stripe-payments-api';

interface StripeConfigurationProps {
  brandId: string;
  brandName: string;
}

export default function StripeConfiguration({ brandId, brandName }: StripeConfigurationProps) {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [credentials, setCredentials] = useState({
    publishableKey: '',
    secretKey: '',
    webhookSecret: ''
  });
  const [formData, setFormData] = useState({
    publishableKey: '',
    secretKey: '',
    webhookSecret: ''
  });
  const [showSecrets, setShowSecrets] = useState({
    secretKey: false,
    webhookSecret: false
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStripeCredentials();
  }, [brandId]);

  const loadStripeCredentials = async () => {
    try {
      setLoading(true);
      const data = await getStripeCredentials(brandId);
      
      if (data.configured) {
        setConfigured(true);
        setCredentials({
          publishableKey: data.publishableKey || '',
          secretKey: '', // Never load secret from API
          webhookSecret: '' // Never load secret from API
        });
        setFormData({
          publishableKey: data.publishableKey || '',
          secretKey: '', // Keep empty for security
          webhookSecret: '' // Keep empty for security
        });
      }
    } catch (error) {
      console.error('Error loading Stripe credentials:', error);
      setMessage({ type: 'error', text: 'Failed to load Stripe configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!formData.publishableKey || !formData.secretKey) {
      setMessage({ type: 'error', text: 'Please provide both Publishable Key and Secret Key' });
      return;
    }

    try {
      setLoading(true);
      await saveStripeCredentials(brandId, formData.publishableKey, formData.secretKey, formData.webhookSecret);
      setMessage({ type: 'success', text: 'Stripe credentials saved successfully!' });
      loadStripeCredentials();
    } catch (error) {
      console.error('Error saving Stripe credentials:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save credentials' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      await testStripeConnection(brandId);
      setMessage({ type: 'success', text: 'Stripe connection test successful!' });
    } catch (error) {
      console.error('Error testing Stripe connection:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Connection test failed' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (field: 'secretKey' | 'webhookSecret') => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Stripe Integration - {brandName}
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
              {configured 
                ? `Connected to Stripe for ${brandName}`
                : 'Not connected to Stripe'
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {configured ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                Connected
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
            <Label htmlFor="publishableKey">Publishable Key *</Label>
            <Input
              id="publishableKey"
              value={formData.publishableKey}
              onChange={(e) => setFormData(prev => ({ ...prev, publishableKey: e.target.value }))}
              placeholder="pk_test_... or pk_live_..."
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="secretKey">Secret Key *</Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecrets.secretKey ? 'text' : 'password'}
                value={formData.secretKey}
                onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                placeholder={configured ? '••••••••••••••••' : 'sk_test_... or sk_live_...'}
                disabled={loading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => toggleSecretVisibility('secretKey')}
              >
                {showSecrets.secretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="webhookSecret">Webhook Secret (Optional)</Label>
            <div className="relative">
              <Input
                id="webhookSecret"
                type={showSecrets.webhookSecret ? 'text' : 'password'}
                value={formData.webhookSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, webhookSecret: e.target.value }))}
                placeholder={configured ? '••••••••••••••••' : 'whsec_...'}
                disabled={loading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => toggleSecretVisibility('webhookSecret')}
              >
                {showSecrets.webhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={handleSaveCredentials} 
              disabled={loading || (!formData.publishableKey || !formData.secretKey)}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Credentials'}
            </Button>
            
            {configured && (
              <Button 
                onClick={handleTestConnection} 
                disabled={loading}
                variant="outline"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>
              Create a Stripe account at{' '}
              <a 
                href="https://dashboard.stripe.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-600"
              >
                Stripe Dashboard
              </a>
            </li>
            <li>Go to Developers → API keys in your Stripe dashboard</li>
            <li>Copy the Publishable key and Secret key</li>
            <li>Optionally, set up webhooks and copy the webhook secret</li>
            <li>Paste the keys above and save</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
