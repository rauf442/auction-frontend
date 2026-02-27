// frontend/admin/src/components/social-media/InstagramCredentialsDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ExternalLink } from 'lucide-react';

interface InstagramCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InstagramCredentialsDialog({
  open,
  onOpenChange,
}: InstagramCredentialsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    brand_id: '',
    instagram_business_account_id: '',
    instagram_username: '',
    access_token: '',
    token_expires_at: '',
  });
  const [brands, setBrands] = useState<any[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [existingCredentials, setExistingCredentials] = useState<any>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (formData.brand_id) {
      fetchCredentials(formData.brand_id);
    }
  }, [formData.brand_id]);

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/brands', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // setBrands(Array.isArray(data) ? data : []);
        setBrands(Array.isArray(data.data) ? data.data : []);
      } else {
        console.error('Failed to fetch brands:', response.status);
        setBrands([]);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      setBrands([]);
    } finally {
      setBrandsLoading(false);
    }
  };

  const fetchCredentials = async (brandId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/social-media/instagram/credentials/${brandId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setExistingCredentials(data);
          setFormData({
            brand_id: brandId,
            instagram_business_account_id: data.instagram_business_account_id || '',
            instagram_username: data.instagram_username || '',
            access_token: '', // Don't show existing token for security
            token_expires_at: data.token_expires_at
              ? new Date(data.token_expires_at).toISOString().slice(0, 16)
              : '',
          });
        } else {
          setExistingCredentials(null);
          setFormData({
            ...formData,
            instagram_business_account_id: '',
            instagram_username: '',
            access_token: '',
            token_expires_at: '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        'http://localhost:3001/api/social-media/instagram/credentials',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            brand_id: parseInt(formData.brand_id),
            instagram_business_account_id: formData.instagram_business_account_id,
            instagram_username: formData.instagram_username,
            access_token: formData.access_token,
            token_expires_at: formData.token_expires_at || null,
          }),
        }
      );

      if (response.ok) {
        alert('Instagram credentials saved successfully!');
        onOpenChange(false);
      } else {
        const error = await response.json();
        alert(`Failed to save credentials: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      alert('Error saving credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Instagram API Credentials</DialogTitle>
          <DialogDescription>
            Configure Instagram Graph API credentials for posting and managing content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">How to get Instagram credentials:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Create a Facebook App at developers.facebook.com</li>
              <li>Add Instagram Graph API product</li>
              <li>Connect your Instagram Business Account</li>
              <li>Generate a long-lived access token</li>
              <li>Get your Instagram Business Account ID</li>
            </ol>
            <a
              href="https://developers.facebook.com/docs/instagram-api/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View detailed documentation
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Select
                value={formData.brand_id}
                onValueChange={(value) => setFormData({ ...formData, brand_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brandsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading brands...
                    </SelectItem>
                  ) : Array.isArray(brands) && brands.length > 0 ? (
                    brands.map((brand) => (
                      <SelectItem
                        key={brand.id}
                        value={brand.id?.toString() || `brand-${brand.id}`}
                      >
                        {brand.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-brands" disabled>
                      No brands available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : formData.brand_id ? (
              <>
                {existingCredentials && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                    ✓ Credentials configured for @{existingCredentials.instagram_username}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="instagram_business_account_id">
                    Instagram Business Account ID *
                  </Label>
                  <Input
                    id="instagram_business_account_id"
                    value={formData.instagram_business_account_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        instagram_business_account_id: e.target.value,
                      })
                    }
                    placeholder="17841400000000000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_username">Instagram Username (Optional)</Label>
                  <Input
                    id="instagram_username"
                    value={formData.instagram_username}
                    onChange={(e) =>
                      setFormData({ ...formData, instagram_username: e.target.value })
                    }
                    placeholder="@yourbrand"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access_token">Access Token *</Label>
                  <Input
                    id="access_token"
                    type="password"
                    value={formData.access_token}
                    onChange={(e) =>
                      setFormData({ ...formData, access_token: e.target.value })
                    }
                    placeholder="Enter long-lived access token"
                    required={!existingCredentials}
                  />
                  <p className="text-xs text-muted-foreground">
                    {existingCredentials
                      ? 'Leave empty to keep existing token'
                      : 'Paste your long-lived access token'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token_expires_at">Token Expiration (Optional)</Label>
                  <Input
                    id="token_expires_at"
                    type="datetime-local"
                    value={formData.token_expires_at}
                    onChange={(e) =>
                      setFormData({ ...formData, token_expires_at: e.target.value })
                    }
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Credentials
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Please select a brand to configure credentials
              </p>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

