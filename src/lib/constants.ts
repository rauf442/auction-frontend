// frontend/src/lib/constants.ts

export const AUCTION_PLATFORMS = [
  { value: 'liveauctioneers', label: 'LiveAuctioneers' },
  { value: 'easylive', label: 'Easy Live Auction' },
  { value: 'invaluable', label: 'Invaluable' },
  { value: 'thesaleroom', label: 'The Saleroom' },
  { value: 'bidsquare', label: 'BidSquare' },
  { value: 'artsy', label: 'Artsy' },
  { value: 'custom', label: 'Custom Platform' }
] as const;

export const AUCTION_TYPES = [
  { value: 'timed', label: 'Timed Auction', description: 'Online bidding with time limits' },
  { value: 'live', label: 'Live Auction', description: 'Real-time bidding event' },
  { value: 'sealed_bid', label: 'Private Sale', description: 'Private bid submissions' }
] as const;

export const AUCTION_SUBTYPES = [
  { value: 'actual', label: 'Actual', description: 'Regular auction with bidding' },
  { value: 'post_sale_platform', label: 'Post Sale (Platform)', description: 'Post-auction sales through platform' },
  { value: 'post_sale_private', label: 'Post Sale (Private)', description: 'Private post-auction sales' },
  { value: 'free_timed', label: 'Free Timed', description: 'Timed auction with no fees' }
] as const;

export const AUCTION_STATUSES = [
  { value: 'planned', label: 'Planned', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-red-100 text-red-800' },
  { value: 'ended', label: 'Ended', color: 'bg-green-100 text-green-800' },
  { value: 'aftersale', label: 'Aftersale', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'archived', label: 'Archived', color: 'bg-blue-100 text-blue-800' }
] as const;

export const CONSIGNMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'archived', label: 'Archived' }
] as const;

export const SORTING_MODES = [
  { value: 'standard', label: 'Standard' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' }
] as const;

export const ESTIMATES_VISIBILITY = [
  { value: 'use_global', label: 'Use Global Setting' },
  { value: 'show_always', label: 'Always Visible' },
  { value: 'do_not_show', label: 'Always Hidden' }
] as const;

export const TIME_ZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
] as const;

// Helper functions
export const getAuctionPlatformLabel = (value: string): string => {
  return AUCTION_PLATFORMS.find(platform => platform.value === value)?.label || value;
};

export const getAuctionStatusColor = (status: string): string => {
  return AUCTION_STATUSES.find(s => s.value === status.toLowerCase())?.color || 'bg-gray-100 text-gray-800';
};

export const getAuctionTypeLabel = (value: string): string => {
  return AUCTION_TYPES.find(type => type.value === value)?.label || value;
};

export const getSortingModeLabel = (value: string): string => {
  return SORTING_MODES.find(mode => mode.value === value)?.label || value;
};

export const getEstimatesVisibilityLabel = (value: string): string => {
  return ESTIMATES_VISIBILITY.find(option => option.value === value)?.label || value;
};

export const getTimeZoneLabel = (value: string): string => {
  return TIME_ZONES.find(tz => tz.value === value)?.label || value;
};

export const getAuctionSubtypeLabel = (value: string): string => {
  return AUCTION_SUBTYPES.find(subtype => subtype.value === value)?.label || value;
};
