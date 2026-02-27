// Common API response wrapper
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

// Pagination
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// User and Auth Types
export interface User {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Artist Types
export interface Artist {
  id: number;
  first_name: string;
  last_name: string;
  birth_year?: number;
  death_year?: number;
  nationality?: string;
  biography?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArtistFormData {
  first_name: string;
  last_name: string;
  birth_year?: string;
  death_year?: string;
  nationality?: string;
  biography?: string;
  is_active: boolean;
}

// School Types
export interface School {
  id: number;
  name: string;
  location?: string;
  founded_year?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolFormData {
  name: string;
  location?: string;
  founded_year?: string;
  description?: string;
  is_active: boolean;
}

// Client Types
export interface Client {
  id: number;
  display_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  company_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface ClientFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  company_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  status: 'active' | 'inactive' | 'pending';
}

// Gallery Types
export interface Gallery {
  id: number;
  name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  commission_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryFormData {
  name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  commission_rate?: string;
  is_active: boolean;
}

// Auction Types
export interface Auction {
  id: number;
  type: 'timed' | 'live' | 'sealed_bid';
  short_name: string;
  long_name: string;
  target_reserve?: number;
  specialist_id?: number;
  charges?: any;
  description?: string;
  important_notice?: string;
  title_image_url?: string;
  catalogue_launch_date?: string;
  aftersale_deadline?: string;
  shipping_date?: string;
  settlement_date: string;
  auction_days: any[];
  sale_events?: any[];
  auctioneer_declaration?: string;
  bid_value_increments?: string;
  sorting_mode?: 'standard' | 'automatic' | 'manual';
  estimates_visibility?: 'use_global' | 'show_always' | 'do_not_show';
  time_zone?: string;
  total_estimate_low?: number;
  total_estimate_high?: number;
  total_sold_value?: number;
  sold_lots_count?: number;
  status?: 'planned' | 'in_progress' | 'ended' | 'aftersale' | 'archived';
  brand_id?: number;
  brand_code?: string; // For frontend compatibility
  artwork_ids?: number[]; // Array of artwork/item IDs
  created_at: string;
  updated_at: string;
}

export interface AuctionFormData {
  type?: 'timed' | 'live' | 'sealed_bid';
  short_name: string;
  long_name: string;
  target_reserve?: number;
  specialist_id?: number;
  description?: string;
  settlement_date: string;
  auction_days?: any[];
  status?: 'planned' | 'in_progress' | 'ended' | 'aftersale' | 'archived';
  brand_code?: string;
  artwork_ids?: number[];
}

export interface InvoiceFormData {
  auction_id?: number;
  client_id?: number;
  status?: 'draft' | 'generated' | 'sent' | 'paid' | 'cancelled';
  logistics?: any;
  shipping_charge?: number;
  insurance_charge?: number;
  tracking_number?: string;
  total_shipping_amount?: number;
  total_amount?: number;
}

// Item Types
export interface Item {
  id: number;
  title: string;
  lot_num?: string;
  artist_id?: number;
  school_id?: number;
  medium?: string;
  height_inches?: string;
  width_inches?: string;
  height_cm?: string;
  width_cm?: string;
  height_with_frame_inches?: string;
  width_with_frame_inches?: string;
  height_with_frame_cm?: string;
  width_with_frame_cm?: string;
  weight?: string;
  year_created?: string;
  description?: string;
  condition_report?: string;
  provenance?: string;
  literature?: string;
  exhibition_history?: string;
  estimate_low?: number;
  estimate_high?: number;
  reserve_price?: number;
  hammer_price?: number;
  buyers_premium?: number;
  total_price?: number;
  currency: string;
  status: string;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
  artist_name?: string;
  school_name?: string;
}

export interface ItemFormData {
  title: string;
  lot_num?: string;
  artist_id?: string;
  school_id?: string;
  medium?: string;
  height_inches?: string;
  width_inches?: string;
  height_cm?: string;
  width_cm?: string;
  height_with_frame_inches?: string;
  width_with_frame_inches?: string;
  height_with_frame_cm?: string;
  width_with_frame_cm?: string;
  weight?: string;
  year_created?: string;
  description?: string;
  condition_report?: string;
  provenance?: string;
  literature?: string;
  exhibition_history?: string;
  estimate_low?: string;
  estimate_high?: string;
  reserve_price?: string;
  hammer_price?: string;
  buyers_premium?: string;
  total_price?: string;
  currency: string;
  status: string;
}

// Consignment Types
export interface Consignment {
  id: number;
  receipt_no: string;
  client_id: number;
  specialist_id?: string;
  date_received: string;
  date_due?: string;
  status: 'pending' | 'in_review' | 'approved' | 'declined' | 'completed';
  commission_rate?: number;
  insurance_value?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_company?: string;
  specialist_name?: string;
  items?: ConsignmentItem[];
}

export interface ConsignmentItem {
  id?: number;
  title: string;
  artist_name?: string;
  medium?: string;
  height_inches?: string;
  width_inches?: string;
  height_cm?: string;
  width_cm?: string;
  height_with_frame_inches?: string;
  width_with_frame_inches?: string;
  height_with_frame_cm?: string;
  width_with_frame_cm?: string;
  weight?: string;
  year_created?: string;
  estimate_low?: number;
  estimate_high?: number;
  reserve_price?: number;
  description?: string;
  condition?: string;
}

export interface ConsignmentFormData {
  receipt_no: string;
  client_id: string;
  specialist_id?: string;
  date_received: string;
  date_due?: string;
  status: 'pending' | 'in_review' | 'approved' | 'declined' | 'completed';
  commission_rate?: string;
  insurance_value?: string;
  notes?: string;
  items: ConsignmentItem[];
}

// Logistics Types
export interface LogisticsEntry {
  id: number;
  item_id?: number;
  client_id?: number;
  type: 'pickup' | 'delivery' | 'storage' | 'shipping';
  status: 'pending' | 'scheduled' | 'in_transit' | 'completed' | 'cancelled';
  pickup_address?: string;
  delivery_address?: string;
  scheduled_date?: string;
  completed_date?: string;
  carrier?: string;
  tracking_number?: string;
  cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  item_title?: string;
  client_name?: string;
}

export interface LogisticsFormData {
  item_id?: string;
  client_id?: string;
  type: 'pickup' | 'delivery' | 'storage' | 'shipping';
  status: 'pending' | 'scheduled' | 'in_transit' | 'completed' | 'cancelled';
  pickup_address?: string;
  delivery_address?: string;
  scheduled_date?: string;
  completed_date?: string;
  carrier?: string;
  tracking_number?: string;
  cost?: string;
  notes?: string;
}

// Banking Types
export interface BankingTransaction {
  id: number;
  client_id?: number;
  auction_id?: number;
  item_id?: number;
  transaction_type: 'payment' | 'refund' | 'commission' | 'fee';
  amount: number;
  currency: string;
  payment_method?: string;
  reference_number?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_date: string;
  reconciled_date?: string;
  reconciled_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
  auction_name?: string;
  item_title?: string;
}

// Internal Communication Types
export interface Message {
  id: string;
  content: string;
  message_type: 'text' | 'task' | 'file' | 'system';
  sender_id: string;
  receiver_id?: string;
  department?: string;
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Task fields (matching database schema)
  task_title?: string;
  task_description?: string;
  task_status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  task_due_date?: string;
  task_assigned_to?: string;
  task_estimated_hours?: number;
  task_completed_at?: string;
  task_completed_by?: string;
  
  // File attachments
  attachments?: FileAttachment[];
  
  // Metadata
  created_at: string;
  updated_at: string;
  read_at?: string;
  
  // From view/joined data
  sender_name?: string;
  sender_email?: string;
  receiver_name?: string;
  task_assignee_name?: string;
  task_completed_by_name?: string;
  reaction_count?: number;
  comment_count?: number;
  reactions?: Array<{
    type: string;
    user_id: string;
    user_name: string;
  }>;
}

export interface MessageRequest {
  content: string;
  message_type?: 'text' | 'task' | 'file' | 'system';
  receiver_id?: string;
  department?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // Task-specific fields (matching database schema)
  task_title?: string;
  task_description?: string;
  task_due_date?: string;
  task_assigned_to?: string;
  task_estimated_hours?: number;
  
  // Attachments
  attachments?: File[];
  metadata?: Record<string, unknown>;
}

export interface TaskFormData {
  task_title: string;
  task_description: string;
  task_assigned_to: string;
  task_due_date: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  task_estimated_hours?: number;
}

// File Attachment Types
export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploaded_at: string;
  uploaded_by: string;
  message_id?: string;
}

// Group Chat Types (temporary, not persisted)
export interface GroupChat {
  id: string;
  name: string;
  members: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
}

// Search and Filter Types
export interface SearchOptions {
  query?: string;
  type?: 'messages' | 'tasks' | 'files';
  user?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dateRange?: {
    start: string;
    end: string;
  };
}

// Task Comment Types
export interface TaskComment {
  id: string;
  message_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Filter and Search Types
export interface FilterOptions {
  search?: string;
  status?: string;
  type?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchFilters {
  query?: string;
  artist_id?: number;
  school_id?: number;
  medium?: string;
  year_from?: number;
  year_to?: number;
  estimate_min?: number;
  estimate_max?: number;
  status?: string;
}

// CSV Upload Types
export interface CSVUploadResult<T> {
  success: boolean;
  imported_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  data?: T[];
}

// Invoice Types
export interface Invoice {
  id: number;
  invoice_number: string;
  auction_id?: number;
  client_id?: number;
  client_name?: string;
  invoice_date: string;
  status: 'draft' | 'generated' | 'sent' | 'paid' | 'cancelled';
  hammer_price?: number;
  buyers_premium?: number;
  vat_amount?: number;
  total_amount?: number;
  logistics?: any;
  shipping_charge?: number;
  insurance_charge?: number;
  tracking_number?: string;
  total_shipping_amount?: number;
  is_international?: boolean;
  brand_id?: number;
  created_at: string;
  updated_at: string;
  // Relations
  auction?: Auction;
  client?: Client;
  created_by_profile?: User;
}

// Refund Types
export interface Refund {
  id: number;
  refund_number: string;
  type: 'refund_of_artwork' | 'refund_of_courier_difference';
  reason: string;
  amount: number;
  
  // Invoice-based refunds
  invoice_id?: number;
  invoice_number?: string;
  
  // Legacy fields (kept for compatibility)
  item_id?: number;
  client_id?: number;
  auction_id?: number;
  
  // Refund type specific amounts
  hammer_price?: number;
  buyers_premium?: number;
  shipping_difference?: number;
  international_shipping_cost?: number;
  local_shipping_cost?: number;
  handling_insurance_cost?: number;
  
  original_payment_reference?: string;
  refund_method: 'bank_transfer' | 'credit_card' | 'cheque' | 'cash' | 'store_credit';
  bank_account_details?: any;
  refund_date?: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'cancelled' | 'failed';
  approval_required: boolean;
  approved_by?: number;
  approved_at?: string;
  processed_by?: number;
  processed_at?: string;
  internal_notes?: string;
  client_notes?: string;
  attachment_urls?: string[];
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  brand_id?: string;
  
  // Joined fields
  client_name?: string;
  auction_name?: string;
  item_title?: string;
}

// Reimbursement Types
export interface Reimbursement {
  id: number;
  reimbursement_number: string;
  title: string;
  description: string;
  category: 'food' | 'fuel' | 'internal_logistics' | 'international_logistics' | 'stationary' | 'travel' | 'accommodation' | 'other';
  total_amount: number;
  currency: string;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'other';
  payment_date: string;
  vendor_name?: string;
  vendor_details?: string;
  receipt_urls?: string[];
  receipt_numbers?: string;
  has_receipts: boolean;
  requested_by: number;
  purpose: string;
  status: 'pending' | 'director1_approved' | 'director2_approved' | 'accountant_approved' | 'completed' | 'rejected' | 'cancelled';
  director1_approval_status: 'pending' | 'approved' | 'rejected';
  director1_approved_by?: number;
  director1_approved_at?: string;
  director1_comments?: string;
  director2_approval_status: 'pending' | 'approved' | 'rejected';
  director2_approved_by?: number;
  director2_approved_at?: string;
  director2_comments?: string;
  accountant_approval_status: 'pending' | 'approved' | 'rejected';
  accountant_approved_by?: number;
  accountant_approved_at?: string;
  accountant_comments?: string;
  processed_by?: number;
  processed_at?: string;
  payment_reference?: string;
  payment_completed_at?: string;
  rejection_reason?: string;
  rejected_by?: number;
  rejected_at?: string;
  project_code?: string;
  cost_center?: string;
  tax_amount: number;
  tax_rate: number;
  net_amount?: number;
  internal_notes?: string;
  accounting_notes?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expected_payment_date?: string;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  brand_id?: string;
  
  // Joined fields
  requested_by_name?: string;
  requested_by_email?: string;
}

// Dashboard and Statistics Types
export interface DashboardStats {
  total_items: number;
  total_clients: number;
  total_auctions: number;
  total_revenue: number;
  pending_consignments: number;
  active_listings: number;
}

export interface ReportData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }>;
}

// Form Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}

// Event and Callback Types
export type EventHandler<T = HTMLElement> = (event: React.ChangeEvent<T>) => void;
export type SubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;
export type ClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;

// Utility Types
export type Status = 'idle' | 'loading' | 'success' | 'error';
export type SortDirection = 'asc' | 'desc';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';

// API Error Types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

// File Upload Types
export interface FileUpload {
  file: File;
  preview?: string;
  progress?: number;
  error?: string;
}

export interface ImageAnalysisResult {
  title?: string;
  artist?: string;
  medium?: string;
  year?: string;
  description?: string;
  condition?: string;
  style?: string;
  confidence?: number;
} 