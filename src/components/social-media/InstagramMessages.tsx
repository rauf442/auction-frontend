// frontend/admin/src/components/social-media/InstagramMessages.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import SearchableSelect, { SearchableOption } from '@/components/ui/SearchableSelect';

interface InstagramMessage {
  id: string;
  instagram_username: string;
  message: string;
  status: string;
  sent_at: string | null;
  error: string | null;
  created_at: string;
  brand?: { name: string; brand_code: string };
  client?: { first_name: string; last_name: string; email: string };
}

export default function InstagramMessages() {
  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [formData, setFormData] = useState({
    brand_id: '',
    instagram_username: '',
    message: '',
  });

  // Transform brands data to SearchableOption format
  const brandOptions: SearchableOption<number>[] = useMemo(() =>
    brands.map((brand) => ({
      value: brand.id,
      label: brand.name,
      description: brand.brand_code ? `Code: ${brand.brand_code}` : undefined,
    })), [brands]);

  useEffect(() => {
    fetchMessages();
    fetchBrands();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/social-media/instagram/messages', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/social-media/instagram/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brand_id: parseInt(formData.brand_id),
          instagram_username: formData.instagram_username,
          message: formData.message,
        }),
      });

      if (response.ok) {
        alert('Message queued successfully!');
        setFormData({
          brand_id: '',
          instagram_username: '',
          message: '',
        });
        fetchMessages();
      } else {
        const error = await response.json();
        alert(`Failed to send message: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      sent: 'outline',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Instagram Direct Messages</h2>
        <p className="text-muted-foreground">Send direct messages to Instagram users</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Send Message Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send New Message</CardTitle>
            <CardDescription>
              Queue a direct message to an Instagram user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <SearchableSelect
                  value={formData.brand_id ? parseInt(formData.brand_id) : undefined}
                  options={brandOptions}
                  placeholder="Select brand"
                  onChange={(value) => setFormData({ ...formData, brand_id: value.toString() })}
                  isLoading={brandsLoading}
                  disabled={brandsLoading}
                  inputPlaceholder="Search brands..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram_username">Instagram Username *</Label>
                <Input
                  id="instagram_username"
                  value={formData.instagram_username}
                  onChange={(e) =>
                    setFormData({ ...formData, instagram_username: e.target.value })
                  }
                  placeholder="@username (without @)"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the Instagram username without the @ symbol
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Type your message here..."
                  rows={6}
                  required
                />
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <strong>Note:</strong> Instagram DM API requires special permissions and is only
                available for certain business accounts. Messages will be queued for manual review.
              </div>

              <Button type="submit" disabled={sending} className="w-full">
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Queue Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Queue Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {messages.filter((m) => m.status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {messages.filter((m) => m.status === 'sent').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {messages.filter((m) => m.status === 'failed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>To send Instagram DMs via API, you need:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Instagram Business or Creator Account</li>
                <li>Facebook Page connected to Instagram</li>
                <li>Instagram Graph API access</li>
                <li>pages_messaging and instagram_basic permissions</li>
                <li>Users must have initiated conversation first</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Message Queue</CardTitle>
          <CardDescription>
            View all queued and sent Instagram direct messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
              <p className="text-muted-foreground">
                Queue your first Instagram direct message using the form above
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">
                        @{message.instagram_username}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{message.message}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{message.brand?.name || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(message.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {message.sent_at
                          ? new Date(message.sent_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-destructive max-w-xs">
                        {message.error ? (
                          <span className="truncate block">{message.error}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

