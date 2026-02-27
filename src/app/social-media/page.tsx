// frontend/admin/src/app/social-media/page.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Instagram } from 'lucide-react';
import EmailCampaigns from '@/components/social-media/EmailCampaigns';
import InstagramPosts from '@/components/social-media/InstagramPosts';

export default function SocialMediaPage() {
  const [activeTab, setActiveTab] = useState<string>('email');

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Social Media & Marketing</h1>
        <p className="text-muted-foreground">
          Manage email campaigns and Instagram posts
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Campaigns
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            Instagram Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <EmailCampaigns />
        </TabsContent>

        <TabsContent value="instagram" className="space-y-4">
          <InstagramPosts />
        </TabsContent>
      </Tabs>
    </div>
  );
}

