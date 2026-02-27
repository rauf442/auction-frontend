// frontend/admin/src/components/social-media/InstagramPosts.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Eye, Edit, Trash2, Image, Video, Loader2, Share2 } from 'lucide-react';
import InstagramPostDialog from './InstagramPostDialog';
import InstagramCredentialsDialog from './InstagramCredentialsDialog';
import InstagramShareAuctionDialog from './InstagramShareAuctionDialog';

interface InstagramPost {
  id: number;
  media_type: string;
  media_url: string | null;
  caption: string | null;
  status: string;
  instagram_post_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
  brand_id?: number | null;
  brand?: { id: number; name: string; brand_code: string };
}

export default function InstagramPosts() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [shareAuctionOpen, setShareAuctionOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [credentialsStatus, setCredentialsStatus] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchPosts();
    checkCredentialsStatus();
  }, []);

  const checkCredentialsStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/brands', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const brands = Array.isArray(result.data) ? result.data : [];

        const status: Record<number, boolean> = {};
        for (const brand of brands) {
          try {
            const credResponse = await fetch(
              `http://localhost:3001/api/social-media/instagram/credentials/${brand.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            status[brand.id] = credResponse.ok && !!(await credResponse.json());
          } catch (error) {
            status[brand.id] = false;
          }
        }
        setCredentialsStatus(status);
      }
    } catch (error) {
      console.error('Error checking credentials status:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/social-media/instagram/posts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/social-media/instagram/posts/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handlePublish = async (id: number) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const hasCredentials = credentialsStatus[post.brand_id || 0];
    if (!hasCredentials) {
      alert('Instagram credentials are not configured for this brand. Please configure them first.');
      setCredentialsOpen(true);
      return;
    }

    if (!confirm('Are you sure you want to publish this post to Instagram? This will make it live on your Instagram account.')) return;

    setPublishingId(id);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/social-media/instagram/posts/${id}/publish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert('Post published successfully to Instagram!');
        fetchPosts();
        checkCredentialsStatus();
      } else {
        const error = await response.json();

        if (error.error?.includes('credentials not configured')) {
          alert('Instagram credentials are not configured. Please set them up first.');
          setCredentialsOpen(true);
        } else if (error.error?.includes('token has expired')) {
          alert('Instagram access token has expired. Please update your credentials.');
          setCredentialsOpen(true);
        } else {
          alert(`Failed to publish: ${error.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error publishing post:', error);
      alert('Network error while publishing. Please check your connection and try again.');
    } finally {
      setPublishingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      scheduled: 'default',
      published: 'outline',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Instagram Posts</h2>
          <p className="text-muted-foreground">Create and schedule Instagram posts</p>
        </div>
        <div className="flex gap-2">
          {/* ── NEW: Share Auction Button ── */}
          <Button
            variant="outline"
            onClick={() => setShareAuctionOpen(true)}
            className="gap-2 border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-300 bg-white"
          >
            <Share2 className="h-4 w-4" />
            Share Auction
          </Button>

          <Button
            variant="outline"
            onClick={() => setCredentialsOpen(true)}
          >
            Configure Credentials
          </Button>
          <Button onClick={() => {
            setSelectedPost(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {/* Credentials Warning Banner */}
      {!loading && Object.values(credentialsStatus).every(configured => !configured) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="text-yellow-600">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800">Instagram API Setup Required</h4>
              <p className="text-sm text-yellow-700">
                To publish posts to Instagram, you need to configure API credentials for your brands.
                <button
                  onClick={() => setCredentialsOpen(true)}
                  className="ml-1 font-medium underline hover:text-yellow-800"
                >
                  Set up credentials →
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-4">Get started by creating your first Instagram post</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setShareAuctionOpen(true)} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share an Auction
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                {/* <TableHead>Engagement</TableHead> */}
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    {post.media_url ? (
                      post.media_type === 'VIDEO' ? (
                        <div className="flex items-center gap-2">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      ) : (
                        <img
                          src={post.media_url}
                          alt="Post preview"
                          className="h-16 w-16 object-cover rounded"
                        />
                      )
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate">{post.caption || '(No caption)'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {post.media_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(post.status)}</TableCell>
                  {/* <TableCell>
                    {post.instagram_post_id ? (
                      <div className="text-sm">
                        <div>❤️ {post.likes_count || 0}</div>
                        <div>💬 {post.comments_count || 0}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell> */}
                  <TableCell className="text-sm text-muted-foreground">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {post.status === 'draft' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublish(post.id)}
                            disabled={publishingId === post.id}
                          >
                            {publishingId === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPost(post);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {post.media_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(post.media_url!, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InstagramPostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        post={selectedPost}
        onSuccess={fetchPosts}
      />

      <InstagramCredentialsDialog
        open={credentialsOpen}
        onOpenChange={(open) => {
          setCredentialsOpen(open);
          if (!open) {
            checkCredentialsStatus();
          }
        }}
      />

      {/* ── NEW: Share Auction Dialog ── */}
      <InstagramShareAuctionDialog
        open={shareAuctionOpen}
        onOpenChange={setShareAuctionOpen}
      />
    </div>
  );
}