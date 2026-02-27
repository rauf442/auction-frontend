// frontend/src/components/test/XeroTestPage.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  createXeroPaymentLink, 
  getXeroCredentials,
  saveXeroCredentials,
  getXeroAuthUrl
} from '@/lib/xero-payments-api';

export default function XeroTestPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addTestResult = (test: string, success: boolean, data?: any, error?: any) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    try {
      setLoading(true);
      const result = await testFn();
      addTestResult(testName, true, result);
    } catch (error) {
      addTestResult(testName, false, null, error);
    } finally {
      setLoading(false);
    }
  };

  const testSaveCredentials = () => runTest('Save Xero Credentials', async () => {
    return await saveXeroCredentials('test-brand', 'test-client-id', 'test-client-secret');
  });

  const testGetCredentials = () => runTest('Get Xero Credentials', async () => {
    return await getXeroCredentials('test-brand');
  });

  const testGetAuthUrl = () => runTest('Get Auth URL', async () => {
    return await getXeroAuthUrl('test-brand');
  });

  const testCreatePaymentLink = () => runTest('Create Payment Link', async () => {
    return await createXeroPaymentLink('test-brand', 100.50, 'Test payment description', 'test@example.com');
  });

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Xero Integration Test Suite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={testSaveCredentials} disabled={loading} variant="outline">
            Test Save Credentials
          </Button>
          <Button onClick={testGetCredentials} disabled={loading} variant="outline">
            Test Get Credentials
          </Button>
          <Button onClick={testGetAuthUrl} disabled={loading} variant="outline">
            Test Get Auth URL
          </Button>
          <Button onClick={testCreatePaymentLink} disabled={loading} variant="outline">
            Test Create Payment Link
          </Button>
          <Button onClick={clearResults} variant="secondary">
            Clear Results
          </Button>
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Test Results:</h3>
          {testResults.length === 0 ? (
            <p className="text-gray-500">No tests run yet. Click a test button above.</p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{result.test}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.success ? 'PASS' : 'FAIL'}
                      </Badge>
                      <span className="text-sm text-gray-500">{result.timestamp}</span>
                    </div>
                  </div>
                  
                  {result.success && result.data && (
                    <div className="bg-green-50 p-2 rounded text-sm">
                      <strong>Response:</strong>
                      <pre className="mt-1 text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {!result.success && result.error && (
                    <div className="bg-red-50 p-2 rounded text-sm">
                      <strong>Error:</strong>
                      <pre className="mt-1 text-xs text-red-600">
                        {result.error.message || JSON.stringify(result.error, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Test Instructions</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li><strong>Save Credentials:</strong> Tests saving Xero API credentials to the database</li>
            <li><strong>Get Credentials:</strong> Tests retrieving saved credentials (without secrets)</li>
            <li><strong>Get Auth URL:</strong> Tests generating Xero OAuth authorization URL</li>
            <li><strong>Create Payment Link:</strong> Tests creating a payment link via Xero API</li>
          </ol>
          <p className="text-sm text-blue-700 mt-2">
            <strong>Note:</strong> Some tests may fail if Xero credentials are not properly configured or if the OAuth flow hasn't been completed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
