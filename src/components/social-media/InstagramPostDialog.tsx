// frontend/admin/src/components/social-media/InstagramPostDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { Loader2, Upload } from 'lucide-react';

interface InstagramPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: any;
  onSuccess: () => void;
}

export default function InstagramPostDialog({
  open,
  onOpenChange,
  post,
  onSuccess,
}: InstagramPostDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    media_type: 'IMAGE',
    media_url: '',
    caption: '',
    brand_id: 'none',
  });
  const [brands, setBrands] = useState<any[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (post) {
      setFormData({
        media_type: post.media_type || 'IMAGE',
        media_url: post.media_url || '',
        caption: post.caption || '',
        brand_id: post.brand_id?.toString() || 'none',
      });
    } else {
      setFormData({
        media_type: 'IMAGE',
        media_url: '',
        caption: '',
        brand_id: 'none',
      });
    }
  }, [post, open]);

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
        const result = await response.json();
        // API returns { success: true, data: [...] }, so we need result.data
        setBrands(Array.isArray(result.data) ? result.data : []);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('http://localhost:3001/api/images/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, media_url: data.url }));
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  console.log('🚀 Submitting form with data:', formData); // Debug log
  setLoading(true);

  try {
    const token = localStorage.getItem('token');
    const url = post
      ? `http://localhost:3001/api/social-media/instagram/posts/${post.id}`
      : 'http://localhost:3001/api/social-media/instagram/posts';

    console.log('📡 Sending request to:', url); // Debug log

    const response = await fetch(url, {
      method: post ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...formData,
        brand_id: formData.brand_id === 'none' ? null : parseInt(formData.brand_id),
      }),
    });

    console.log('📥 Response status:', response.status); // Debug log

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Response data:', data); // Debug log
      
      toast.success(post ? 'Post updated successfully!' : 'Post created successfully!'); // User feedback
      
      onSuccess();
      onOpenChange(false);
    } else {
      // Handle error response
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Server error:', errorData);
      toast.error(`Failed to save: ${errorData.error || errorData.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('💥 Network/Error saving post:', error);
    toast.error(`Error: ${error instanceof Error ? error.message : 'Network error'}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{post ? 'Edit Post' : 'Create Instagram Post'}</DialogTitle>
          <DialogDescription>
            {post
              ? 'Update your Instagram post details'
              : 'Create a new Instagram post to publish or schedule'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="media_type">Media Type</Label>
              <Select
                value={formData.media_type}
                onValueChange={(value) => setFormData({ ...formData, media_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand (Optional)</Label>
              <Select
                value={formData.brand_id}
                onValueChange={(value) => setFormData({ ...formData, brand_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
<SelectContent>
  {/* ✅ Use "none" instead of "" */}
  <SelectItem value="none">None</SelectItem>
  {brandsLoading ? (
    <SelectItem value="loading" disabled>
      Loading brands...
    </SelectItem>
  ) : brands.length > 0 ? (
    brands.map((brand) => (
      <SelectItem key={brand.id} value={brand.id.toString()}>
        {brand.name}
      </SelectItem>
    ))
  ) : (
    <SelectItem value="empty" disabled>
      No brands available
    </SelectItem>
  )}
</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Media {formData.media_type === 'VIDEO' ? 'Video' : 'Image'}</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept={formData.media_type === 'VIDEO' ? 'video/*' : 'image/*'}
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <Input
                placeholder="Or paste media URL"
                value={formData.media_url}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
              />
              {formData.media_url && formData.media_type === 'IMAGE' && (
                <img
                  src={formData.media_url}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded border"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              placeholder="Write your Instagram caption here... #hashtags"
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              Include relevant hashtags and mentions to increase engagement
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.media_url}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {post ? 'Update Post' : 'Create Post'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

