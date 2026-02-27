// frontend/admin/src/components/social-media/EmailCampaignDialog.tsx
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface EmailCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any;
  onSuccess: () => void;
}

export default function EmailCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: EmailCampaignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
    audience_type: 'all',
    brand_id: '',
  });
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        subject: campaign.subject || '',
        html_content: campaign.html_content || '',
        audience_type: campaign.audience_type || 'all',
        brand_id: campaign.brand_id?.toString() || 'all',
      });
    } else {
      setFormData({
        name: '',
        subject: '',
        html_content: '',
        audience_type: 'all',
        brand_id: 'all',
      });
    }
  }, [campaign, open]);

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/brands', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBrands(data.data || []);
      } else {
        console.error('Failed to fetch brands:', response.statusText);
        setBrands([]);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      setBrands([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = campaign
        ? `http://localhost:3001/api/social-media/email-campaigns/${campaign.id}`
        : 'http://localhost:3001/api/social-media/email-campaigns';

      const response = await fetch(url, {
        method: campaign ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          brand_id: formData.brand_id && formData.brand_id !== 'all' ? parseInt(formData.brand_id) : null,
        }),
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? 'Edit Campaign' : 'Create Email Campaign'}</DialogTitle>
          <DialogDescription>
            {campaign
              ? 'Update your email campaign details'
              : 'Create a new bulk email campaign to send to your audience'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Spring Sale Announcement"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand (Optional)</Label>
              <Select
                value={formData.brand_id}
                onValueChange={(value) => setFormData({ ...formData, brand_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Don't Miss Our Spring Sale!"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Select
              value={formData.audience_type}
              onValueChange={(value) => setFormData({ ...formData, audience_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="buyers">Buyers Only</SelectItem>
                <SelectItem value="sellers">Sellers/Vendors Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="html_content">Email Content (HTML) *</Label>
            <Textarea
              id="html_content"
              value={formData.html_content}
              onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
              placeholder="Enter your email HTML content here..."
              rows={12}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              You can use HTML tags to format your email. Example: &lt;h1&gt;Title&lt;/h1&gt;, &lt;p&gt;Paragraph&lt;/p&gt;, etc.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {campaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

