'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Instagram,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  Tag,
  ImageIcon,
  Loader2,
  X,
  AlertTriangle,
  Info,
  Send,
  CheckCheck,
  PartyPopper,
  MessageCircle,
  Users,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Auction {
  id: number;
  short_name: string;
  long_name: string;
  type: string;
  status?: string;
  settlement_date: string;
  catalogue_launch_date?: string;
  total_estimate_low?: number;
  total_estimate_high?: number;
  artwork_ids?: number[];
  title_image_url?: string;
  brand_id?: number;
  brand?: { id: number; code: string; name: string };
}

interface Conversation {
  conversation_id: string;
  updated_time: string;
  participants: { id: string; username?: string; name?: string }[];
}

interface ShareLog {
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  time: string;
}

interface RecipientResult {
  username: string;
  auctionName: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

const token = () =>
  typeof window !== 'undefined' ? localStorage.getItem('token') : null;

const authHeaders = () => ({
  Authorization: `Bearer ${token()}`,
  'Content-Type': 'application/json',
});

const fmt = (n?: number) =>
  n !== undefined
    ? new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0,
      }).format(n)
    : '—';

const fmtDate = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const fmtTime = () =>
  new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const IG_GRADIENT = 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)';

const SENDING_MESSAGES = [
  'Reaching out to your contacts…',
  'Delivering auction details…',
  'Almost there…',
  'Sending on your behalf…',
  'Connecting with recipients…',
];

// ─── Step Dots ────────────────────────────────────────────────────────────────

function Steps({ step }: { step: 1 | 2 }) {
  const labels = ['Select Auctions', 'Send to Recipients'];
  return (
    <div className="flex items-center gap-3 mt-5">
      {labels.map((label, i) => {
        const s = i + 1;
        const active = step === s;
        const done = step > s;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all"
                style={active || done ? { background: IG_GRADIENT, color: '#fff' } : { background: '#f1f5f9', color: '#94a3b8' }}
              >
                {done ? <Check className="w-3 h-3" /> : s}
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: active || done ? '#1e293b' : '#94a3b8' }}
              >
                {label}
              </span>
            </div>
            {s < 2 && (
              <div
                className="w-8 h-px mx-1"
                style={{ background: step > 1 ? 'linear-gradient(to right, #a855f7, #f97316)' : '#e2e8f0' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Auction Card ─────────────────────────────────────────────────────────────

function AuctionCard({
  auction,
  selected,
  onToggle,
}: {
  auction: Auction;
  selected: boolean;
  onToggle: () => void;
}) {
  const [fallbackImg, setFallbackImg] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(!auction.title_image_url);

  useEffect(() => {
    if (auction.title_image_url || !auction.artwork_ids?.length) {
      setImgLoading(false);
      return;
    }
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch(`${API_BASE}/artworks/${auction.artwork_ids[0]}`, {
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setFallbackImg(
          data.images?.[0] || data.image_url || data.image_file_1 || data.thumbnail_url || null
        );
      })
      .catch(() => {})
      .finally(() => setImgLoading(false));
  }, [auction.id]);

  const displayImg = auction.title_image_url || fallbackImg;
  const lotCount = auction.artwork_ids?.length ?? 0;

  return (
    <button
      onClick={onToggle}
      className={`relative w-full text-left rounded-xl border overflow-hidden transition-all duration-150 group ${
        selected
          ? 'border-violet-300 ring-1 ring-violet-200 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
      }`}
      style={selected ? { background: '#faf7ff' } : {}}
    >
      {/* Selection indicator */}
      <div
        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'border-transparent' : 'border-white/70 bg-black/10'
        }`}
        style={selected ? { background: IG_GRADIENT } : {}}
      >
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </div>

      {/* Image */}
      <div className="w-full h-[88px] bg-slate-100 relative overflow-hidden">
        {imgLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
          </div>
        ) : displayImg ? (
          <img
            src={displayImg}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
            onError={() => setFallbackImg(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="font-semibold text-[13px] text-slate-800 leading-snug truncate">
          {auction.short_name}
        </p>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">{auction.long_name}</p>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 rounded-md px-1.5 py-0.5 text-slate-500">
            <Calendar className="w-2.5 h-2.5" />
            {fmtDate(auction.settlement_date)}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 rounded-md px-1.5 py-0.5 text-slate-500">
            <Tag className="w-2.5 h-2.5" />
            {lotCount}
          </span>
        </div>
        {(auction.total_estimate_low || auction.total_estimate_high) && (
          <p className="text-[11px] mt-1.5 font-semibold text-violet-600">
            {fmt(auction.total_estimate_low)} – {fmt(auction.total_estimate_high)}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Tag Chip ─────────────────────────────────────────────────────────────────

function TagChip({
  label,
  onRemove,
  color = 'violet',
}: {
  label: string;
  onRemove: () => void;
  color?: 'violet' | 'slate';
}) {
  const styles =
    color === 'violet'
      ? 'bg-violet-50 border-violet-200 text-violet-700'
      : 'bg-slate-100 border-slate-200 text-slate-600';

  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-medium rounded-full border pl-2 pr-1 py-0.5 ${styles}`}
    >
      {label}
      <button
        onClick={onRemove}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ─── Result Row ───────────────────────────────────────────────────────────────

function ResultRow({ result }: { result: RecipientResult }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm border ${
        result.success
          ? 'bg-emerald-50 border-emerald-100'
          : 'bg-red-50 border-red-100'
      }`}
    >
      {result.success ? (
        <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
      ) : (
        <X className="w-4 h-4 text-red-400 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-slate-700">@{result.username}</span>
        <span className="text-slate-400 mx-1.5 text-xs">·</span>
        <span className="text-slate-500 text-xs">{result.auctionName}</span>
      </div>
      {!result.success && (
        <span className="text-[11px] text-red-500 shrink-0 truncate max-w-[160px]">
          {result.error}
        </span>
      )}
    </div>
  );
}

// ─── Progress Banner ─────────────────────────────────────────────────────────

function ProgressBanner({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const msg = SENDING_MESSAGES[Math.min(Math.floor((current / Math.max(total, 1)) * SENDING_MESSAGES.length), SENDING_MESSAGES.length - 1)];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3.5 shadow-sm">
      <div className="flex items-center gap-3.5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: IG_GRADIENT }}
        >
          <Loader2 className="w-4.5 h-4.5 text-white animate-spin" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-slate-800">Sending DMs</p>
          <p className="text-sm text-slate-400 mt-0.5">{msg}</p>
        </div>
      </div>
      <div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(pct, 3)}%`, background: IG_GRADIENT }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export default function InstagramShareAuctionDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(false);
  const [auctionSearch, setAuctionSearch] = useState('');
  const [selectedAuctions, setSelectedAuctions] = useState<Auction[]>([]);

  // Step 2
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Sending
  const [sharing, setSharing] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [shareResults, setShareResults] = useState<RecipientResult[]>([]);
  const [shareComplete, setShareComplete] = useState(false);

  const logsRef = useRef<ShareLog[]>([]);
  const addLog = useCallback((level: ShareLog['level'], message: string) => {
    logsRef.current.push({ level, message, time: fmtTime() });
  }, []);

  // Outside click closes dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedAuctions([]);
    setAuctionSearch('');
    setRecipientSearch('');
    setSelectedRecipients([]);
    setShareResults([]);
    setSentCount(0);
    setShareComplete(false);
    setConversations([]);
    logsRef.current = [];
    fetchAuctions();
    detectBrandId();
  }, [open]);

  useEffect(() => {
    if (step === 2 && brandId) fetchConversations(brandId);
  }, [step, brandId]);

  const detectBrandId = async () => {
    try {
      const r = await fetch(`${API_BASE}/brands`, { headers: authHeaders() as HeadersInit });
      if (r.ok) {
        const d = await r.json();
        const brands = Array.isArray(d.data) ? d.data : [];
        if (brands.length) setBrandId(brands[0].id);
      }
    } catch {}
  };

  const fetchAuctions = async () => {
    setLoadingAuctions(true);
    try {
      const r = await fetch(
        `${API_BASE}/auctions?limit=50&sort_field=settlement_date&sort_direction=desc`,
        { headers: authHeaders() as HeadersInit }
      );
      if (r.ok) {
        const d = await r.json();
        setAuctions(d.auctions || []);
      }
    } finally {
      setLoadingAuctions(false);
    }
  };

  const fetchConversations = async (bid: number) => {
    setLoadingConversations(true);
    try {
      const r = await fetch(
        `${API_BASE}/social-media/instagram/share-auction/conversations?brand_id=${bid}`,
        { headers: authHeaders() as HeadersInit }
      );
      const d = await r.json();
      if (r.ok && d.success) setConversations(d.conversations || []);
    } finally {
      setLoadingConversations(false);
    }
  };

  const toggleAuction = (a: Auction) =>
    setSelectedAuctions((prev) =>
      prev.find((x) => x.id === a.id) ? prev.filter((x) => x.id !== a.id) : [...prev, a]
    );

  const allParticipants = conversations.flatMap((c) =>
    c.participants.map((p) => ({ username: p.username || p.name || p.id }))
  );

  const filteredParticipants = allParticipants.filter((p) =>
    p.username.toLowerCase().includes(recipientSearch.toLowerCase())
  );

  const addRecipient = (username: string) => {
    const clean = username.replace(/^@/, '').trim();
    if (!clean) return;
    if (!selectedRecipients.includes(clean))
      setSelectedRecipients((prev) => [...prev, clean]);
    setRecipientSearch('');
    setShowDropdown(false);
  };

  // Add on Enter — picks first match or uses typed value
  const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredParticipants.length > 0) {
        addRecipient(filteredParticipants[0].username);
      } else if (recipientSearch.trim()) {
        addRecipient(recipientSearch.trim());
      }
    }
    if (e.key === 'Escape') setShowDropdown(false);
  };

  const removeRecipient = (u: string) =>
    setSelectedRecipients((prev) => prev.filter((r) => r !== u));

  const handleShare = async () => {
    if (!selectedRecipients.length || !selectedAuctions.length) return;

    setSharing(true);
    setShareResults([]);
    setSentCount(0);
    setShareComplete(false);
    logsRef.current = [];

    type Job = { auction: Auction; recipient: string };
    const jobs: Job[] = selectedAuctions.flatMap((auction) =>
      selectedRecipients.map((recipient) => ({ auction, recipient }))
    );

    let completedCount = 0;

    const settled = await Promise.allSettled(
      jobs.map(async ({ auction, recipient }) => {
        const res = await fetch(`${API_BASE}/social-media/instagram/share-auction`, {
          method: 'POST',
          headers: authHeaders() as HeadersInit,
          body: JSON.stringify({
            auction_id: auction.id,
            recipient,
            recipient_type: 'username',
            brand_id: auction.brand_id || brandId,
          }),
        });
        const data = await res.json();
        completedCount++;
        setSentCount(completedCount);

        if (res.ok && data.success)
          return { username: recipient, auctionName: auction.short_name, success: true, messageId: data.message_id } as RecipientResult;
        return { username: recipient, auctionName: auction.short_name, success: false, error: data.error || 'Failed to send DM' } as RecipientResult;
      })
    );

    const results: RecipientResult[] = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : { username: jobs[i].recipient, auctionName: jobs[i].auction.short_name, success: false, error: 'Network error' }
    );

    setShareResults(results);
    setShareComplete(true);
    setSharing(false);
  };

  const filteredAuctions = auctions.filter((a) => {
    const q = auctionSearch.toLowerCase();
    return a.short_name?.toLowerCase().includes(q) || a.long_name?.toLowerCase().includes(q);
  });

  const successCount = shareResults.filter((r) => r.success).length;
  const failCount = shareResults.filter((r) => !r.success).length;
  const totalOps = selectedAuctions.length * selectedRecipients.length;

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setSelectedAuctions([]);
      setRecipientSearch('');
      setSelectedRecipients([]);
      setShareResults([]);
      setSentCount(0);
      setShareComplete(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`max-w-[680px] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border border-slate-200 shadow-xl bg-white ${
          step === 2 ? 'max-h-[92vh]' : 'max-h-[86vh]'
        }`}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100 shrink-0">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: IG_GRADIENT }} />

          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: IG_GRADIENT }}
            >
              <Instagram className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[15px] font-semibold text-slate-900 leading-snug">
                Share Auction via Instagram DM
              </DialogTitle>
              <p className="text-[13px] text-slate-400 mt-0.5">
                {step === 1 ? 'Pick auctions to share' : 'Select recipients from your recent conversations'}
              </p>
            </div>
          </div>

          <Steps step={step} />
        </div>

        {/* ── Notice ── */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3.5 py-2.5 text-[13px] text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
            <span>
              Only users who have <strong>previously messaged your Instagram business account</strong> can receive DMs via the API.
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ══ STEP 1 — Select Auctions ══ */}
          {step === 1 && (
            <div className="px-6 py-4 space-y-4">

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search auctions…"
                  value={auctionSearch}
                  onChange={(e) => setAuctionSearch(e.target.value)}
                  className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-violet-300"
                />
                {auctionSearch && (
                  <button onClick={() => setAuctionSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Selection summary */}
              {selectedAuctions.length > 0 && (
                <div className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-lg px-3.5 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-violet-700 shrink-0">
                      {selectedAuctions.length} selected
                    </span>
                    <span className="text-violet-300">·</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAuctions.map((a) => (
                        <TagChip key={a.id} label={a.short_name} color="violet" onRemove={() => toggleAuction(a)} />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAuctions([])}
                    className="text-[12px] text-violet-400 hover:text-red-400 ml-3 shrink-0 font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Grid */}
              {loadingAuctions ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                  <p className="text-sm text-slate-400">Loading auctions…</p>
                </div>
              ) : filteredAuctions.length === 0 ? (
                <div className="text-center py-16">
                  <ImageIcon className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No auctions found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredAuctions.map((a) => (
                    <AuctionCard
                      key={a.id}
                      auction={a}
                      selected={!!selectedAuctions.find((x) => x.id === a.id)}
                      onToggle={() => toggleAuction(a)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 2 — Recipients ══ */}
          {step === 2 && (
            <div className="px-6 py-5 space-y-5">

              {/* Sending progress */}
              {sharing && <ProgressBanner current={sentCount} total={totalOps} />}

              {/* Completion */}
              {shareComplete && (
                <div className="space-y-3">
                  <div
                    className={`rounded-xl border p-5 flex items-start gap-4 ${
                      failCount === 0
                        ? 'bg-emerald-50 border-emerald-200'
                        : successCount === 0
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        failCount === 0 ? 'bg-emerald-100' : successCount === 0 ? 'bg-red-100' : 'bg-amber-100'
                      }`}
                    >
                      {failCount === 0 ? (
                        <PartyPopper className="w-5 h-5 text-emerald-600" />
                      ) : successCount === 0 ? (
                        <X className="w-5 h-5 text-red-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-[15px] font-semibold ${
                          failCount === 0 ? 'text-emerald-800' : successCount === 0 ? 'text-red-700' : 'text-amber-800'
                        }`}
                      >
                        {failCount === 0
                          ? 'All DMs sent successfully!'
                          : successCount === 0
                          ? 'No DMs could be sent'
                          : `${successCount} sent · ${failCount} failed`}
                      </p>
                      <p
                        className={`text-sm mt-1 ${
                          failCount === 0 ? 'text-emerald-600' : successCount === 0 ? 'text-red-500' : 'text-amber-600'
                        }`}
                      >
                        {failCount === 0
                          ? 'Your auction details have been delivered to all recipients.'
                          : successCount === 0
                          ? 'Users must message your Instagram account first before you can DM them.'
                          : 'Some messages failed — check the details below.'}
                      </p>
                    </div>
                  </div>

                  {/* Only show rows on partial/full failure */}
                  {failCount > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {shareResults.map((r, i) => (
                        <ResultRow key={i} result={r} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Recipient input (only before sending) ── */}
              {!sharing && !shareComplete && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      Recipients
                      {selectedRecipients.length > 0 && (
                        <span
                          className="text-[11px] font-bold text-white rounded-full px-2 py-0.5 leading-none"
                          style={{ background: IG_GRADIENT }}
                        >
                          {selectedRecipients.length}
                        </span>
                      )}
                    </label>
                    {selectedRecipients.length > 0 && (
                      <button
                        onClick={() => setSelectedRecipients([])}
                        className="text-xs text-slate-400 hover:text-red-400 font-medium transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Selected recipients */}
                  {selectedRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      {selectedRecipients.map((u) => (
                        <TagChip key={u} label={`@${u}`} color="violet" onRemove={() => removeRecipient(u)} />
                      ))}
                    </div>
                  )}

                  {/* Search with dropdown */}
                  <div className="relative" ref={searchRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <Input
                        placeholder="Search contacts or type a username…"
                        value={recipientSearch}
                        onChange={(e) => {
                          setRecipientSearch(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onKeyDown={handleRecipientKeyDown}
                        className="pl-9 pr-9 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-violet-300"
                      />
                      {loadingConversations && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />
                      )}
                      {recipientSearch && !loadingConversations && (
                        <button
                          onClick={() => { setRecipientSearch(''); setShowDropdown(false); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown */}
                    {showDropdown && !loadingConversations && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {filteredParticipants.length === 0 ? (
                          <div className="py-8 px-4 text-center">
                            <MessageCircle className="w-7 h-7 mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-medium text-slate-500">
                              {conversations.length === 0
                                ? 'No conversations found'
                                : `No results for "${recipientSearch}"`}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {conversations.length === 0
                                ? 'Users must message your Instagram account first'
                                : recipientSearch
                                ? 'Press Enter to add this username anyway'
                                : 'Try typing a username'}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                Recent conversations — {filteredParticipants.length} contact{filteredParticipants.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                              {filteredParticipants.map((p, i) => {
                                const isAdded = selectedRecipients.includes(p.username.replace(/^@/, ''));
                                return (
                                  <button
                                    key={i}
                                    onClick={() => !isAdded && addRecipient(p.username)}
                                    disabled={isAdded}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 last:border-0 ${
                                      isAdded
                                        ? 'bg-slate-50 opacity-50 cursor-not-allowed'
                                        : 'hover:bg-violet-50'
                                    }`}
                                  >
                                    <div
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                                      style={{ background: IG_GRADIENT }}
                                    >
                                      {p.username[0]?.toUpperCase() ?? '?'}
                                    </div>
                                    <p className="flex-1 text-sm font-medium text-slate-700">
                                      @{p.username}
                                    </p>
                                    {isAdded ? (
                                      <Check className="w-4 h-4 text-violet-400 shrink-0" />
                                    ) : (
                                      <span className="text-xs font-semibold text-violet-500 shrink-0">
                                        Add
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-[12px] text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono">Enter</kbd> to quickly add the first result.
                  </p>
                </div>
              )}

              {/* ── Selected auctions summary ── */}
              {!sharing && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                      Auctions · {selectedAuctions.length}
                    </p>
                    {!shareComplete && (
                      <button
                        onClick={() => setStep(1)}
                        className="text-[12px] font-semibold text-violet-500 hover:text-violet-700 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                    {selectedAuctions.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                        {a.title_image_url ? (
                          <img
                            src={a.title_image_url}
                            alt=""
                            className="w-8 h-8 rounded-md object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{a.short_name}</p>
                          <p className="text-[11px] text-slate-400">
                            {fmtDate(a.settlement_date)}
                            {a.artwork_ids?.length ? ` · ${a.artwork_ids.length} lots` : ''}
                          </p>
                        </div>
                        {a.total_estimate_low && (
                          <span className="text-[12px] font-semibold text-violet-600 shrink-0">
                            {fmt(a.total_estimate_low)}+
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={
              step === 1
                ? handleClose
                : () => { setStep(1); setShareComplete(false); setShareResults([]); setSentCount(0); }
            }
            disabled={sharing}
            className="text-slate-500 hover:text-slate-700 h-9 px-3"
          >
            {step === 2 && <ChevronLeft className="w-4 h-4 mr-1" />}
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex items-center gap-3">
            {step === 1 && (
              <p className="text-sm text-slate-400">
                {selectedAuctions.length === 0
                  ? 'Select at least one auction'
                  : <span className="text-violet-600 font-medium">✓ {selectedAuctions.length} selected</span>}
              </p>
            )}

            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedAuctions.length}
                size="sm"
                className="h-9 px-5 text-white border-0 rounded-lg font-medium disabled:opacity-40 text-sm"
                style={selectedAuctions.length ? { background: IG_GRADIENT } : {}}
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : shareComplete ? (
              <Button
                onClick={handleClose}
                size="sm"
                variant="outline"
                className="h-9 px-5 rounded-lg text-sm font-medium"
              >
                Done
              </Button>
            ) : (
              <Button
                onClick={handleShare}
                disabled={!selectedRecipients.length || sharing}
                size="sm"
                className="h-9 px-5 text-white border-0 rounded-lg font-semibold disabled:opacity-40 text-sm min-w-[120px]"
                style={selectedRecipients.length && !sharing ? { background: IG_GRADIENT } : {}}
              >
                {sharing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Send DMs</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}