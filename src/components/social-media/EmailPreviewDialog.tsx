// frontend/admin/src/components/social-media/EmailPreviewDialog.tsx
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
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Mail, Users, CheckCircle2, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any;
  onSuccess: () => void;
}

export default function EmailPreviewDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: EmailPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    if (open && campaign) {
      fetchPreview();
    }
  }, [open, campaign]);

  const fetchPreview = async () => {
    if (!campaign) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/social-media/email-campaigns/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brand_id: campaign.brand_id,
          audience_type: campaign.audience_type,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !campaign) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/social-media/email-campaigns/${campaign.id}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ test_email: testEmail }),
        }
      );

      if (response.ok) {
        toast.success('Test email sent successfully!');
      } else {
        toast.error('Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Error sending test email');
    } finally {
      setSending(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaign) return;

    if (!confirm(`Are you sure you want to send this campaign to ${preview?.total_count || 0} recipients?`)) {
      return;
    }

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/social-media/email-campaigns/${campaign.id}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Campaign is being sent!');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Failed to send campaign');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Error sending campaign');
    } finally {
      setSending(false);
    }
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Preview & Send</DialogTitle>
          <DialogDescription>
            Review your campaign and send it to your audience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Campaign Name</p>
              <p className="font-semibold">{campaign.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subject</p>
              <p className="font-semibold">{campaign.subject}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Audience</p>
              <Badge>{campaign.audience_type}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={campaign.status === 'sent' ? 'outline' : 'default'}>
                {campaign.status}
              </Badge>
            </div>
          </div>

          {/* Recipient Count */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : preview && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5" />
                <span className="font-semibold">Target Recipients: {preview.total_count}</span>
              </div>
              {preview.message && (
                <p className="text-sm text-muted-foreground">{preview.message}</p>
              )}
            </div>
          )}

          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview">Email Preview</TabsTrigger>
              <TabsTrigger value="recipients">Recipients</TabsTrigger>
              <TabsTrigger value="test">Send Test</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-4 border-b">
                  <p className="text-sm font-semibold">Subject: {campaign.subject}</p>
                </div>
                <div 
                  className="p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: campaign.html_content }}
                />
              </div>
            </TabsContent>

            <TabsContent value="recipients" className="space-y-4">
              {preview?.preview_recipients && preview.preview_recipients.length > 0 ? (
                <div className="border rounded-lg">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-sm font-semibold">Name</th>
                          <th className="text-left p-2 text-sm font-semibold">Email</th>
                          <th className="text-left p-2 text-sm font-semibold">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview_recipients.map((recipient: any) => (
                          <tr key={recipient.id} className="border-t">
                            <td className="p-2 text-sm">
                              {recipient.first_name} {recipient.last_name}
                            </td>
                            <td className="p-2 text-sm">{recipient.email}</td>
                            <td className="p-2 text-sm">
                              <Badge variant="outline">{recipient.client_type}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.total_count > 100 && (
                    <div className="p-2 bg-muted text-sm text-center">
                      Showing first 100 of {preview.total_count} recipients
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recipients found for this audience
                </div>
              )}
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <div className="space-y-4 p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2">Send Test Email</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Send a test email to yourself before sending to all recipients
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="testEmail">Test Email Address</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleSendTest} disabled={!testEmail || sending}>
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Stats for sent campaigns */}
          {campaign.status === 'sent' && campaign.total_recipients && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Total Recipients</span>
                </div>
                <p className="text-2xl font-bold">{campaign.total_recipients}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Successful</span>
                </div>
                <p className="text-2xl font-bold">{campaign.successful_sends || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">Failed</span>
                </div>
                <p className="text-2xl font-bold">{campaign.failed_sends || 0}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {campaign.status === 'draft' && preview && preview.total_count > 0 && (
            <Button onClick={handleSendCampaign} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send to {preview.total_count} Recipients
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}





