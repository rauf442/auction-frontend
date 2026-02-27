"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchClients,
  deleteClient,
  bulkActionClients,
  formatClientDisplay,
  getClientFullName,
  getClientTypeDisplay,
  getClientTypeColor,
  type Client,
  type ClientsResponse,
  type BulkActionRequest
} from '@/lib/clients-api';
import { fetchBrands, type Brand } from '@/lib/api';
import { PhoneNumberUtils } from '@/lib/phone-number-utils';

// Props interface for the ClientsTable component
interface ClientsTableProps {
  clients?: Client[];
  loading?: boolean;
  selectedClients?: string[];
  onSelectionChange?: (selected: string[]) => void;
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onClientEdit?: (client: Client) => void;
  onRefresh?: () => void;
  
  // Legacy props for backward compatibility
  status?: string;
  search?: string;
  client_type?: 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor' | 'all';
  tags?: string;
  platform?: 'all' | 'Liveauctioneer' | 'The saleroom' | 'Invaluable' | 'Easylive auctions' | 'Private' | 'Others';
  registration_date?: 'all' | '30days' | '3months' | '6months' | '1year';
}

// Table column configuration
interface TableColumn {
  key: keyof Client | 'actions' | 'display_name' | 'contact_info';
  label: string;
  sortable?: boolean;
  width?: string;
}

const columns: TableColumn[] = [
  { key: 'id', label: 'Client ID', sortable: true, width: 'w-24' },
  { key: 'display_name', label: 'Name / Company', sortable: false, width: 'w-64' },
  { key: 'contact_info', label: 'Contact Info', sortable: false, width: 'w-70' },
  { key: 'client_type', label: 'Type', sortable: false, width: 'w-20' },
  { key: 'buyer_premium', label: 'Buyer Premium', sortable: false, width: 'w-24' },
  { key: 'vendor_premium', label: 'Vendor Premium', sortable: false, width: 'w-24' },
  { key: 'created_at', label: 'Created', sortable: true, width: 'w-32' },
  { key: 'actions', label: 'Actions', sortable: false, width: 'w-24' }
];

// Utility function to get status styling
const getStatusStyling = (status: string): string => {
  const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
  switch (status) {
    case 'active':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'suspended':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'archived':
      return `${baseClasses} bg-gray-100 text-gray-800`;
    case 'deleted':
      return `${baseClasses} bg-red-200 text-red-900`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

// Utility function to format date
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return '';
  }
};

// Utility function to format phone number with + prefix
const formatPhoneNumber = (phoneNumber: string | undefined): string => {
  if (!phoneNumber) return '';
  // If phone number already starts with +, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  // Add + prefix if not present
  return `+${phoneNumber}`;
};


// Main ClientsTable component
export default function ClientsTable({ 
  clients: propClients,
  loading: propLoading = false,
  selectedClients: propSelectedClients,
  onSelectionChange,
  onSort,
  sortField: propSortField,
  sortDirection: propSortDirection,
  onClientEdit, 
  onRefresh,
  // Legacy props
  status = 'all', 
  search = '', 
  client_type = 'all',
  tags = '',
  platform = 'all',
  registration_date = 'all'
}: ClientsTableProps) {
  // Internal state for when props are not provided (legacy mode)
  const [internalClients, setInternalClients] = useState<Client[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalSelectedClients, setInternalSelectedClients] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Use prop data when available, fallback to internal state (legacy mode)
  const clients = propClients || internalClients;
  const loading = propLoading || (propClients ? false : internalLoading);
  const selectedClients = propSelectedClients ? propSelectedClients.map(id => parseInt(id)) : internalSelectedClients;
  

  
  // Sorting state (use props when available)
  const [internalSortField, setInternalSortField] = useState<string>('id');
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const sortField = propSortField || internalSortField;
  const sortDirection = propSortDirection || internalSortDirection;
  

  // Brand filter (quick scope)
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandCode, setBrandCode] = useState<string>('ALL')

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchBrands()
        setBrands(list)
      } catch {}
    })()
  }, [])

  // Fetch clients data (only used in legacy mode when no props provided)
  const loadClients = async () => {
    // Skip loading if clients are provided via props
    if (propClients) return;
    
    try {
      setInternalLoading(true);
      setError(null);
      
      const params: any = {
        status: status === 'all' ? 'active' : status,
        search: search || undefined,
        sort_field: sortField,
        sort_direction: sortDirection
      };
      if (client_type && client_type !== 'all') params.client_type = client_type;
      if (tags && tags.trim() !== '') params.tags = tags;
      if (platform && platform !== 'all') params.platform = platform;
      if (registration_date && registration_date !== 'all') params.registration_date = registration_date;
      if (brandCode && brandCode !== 'ALL') params.brand_code = brandCode;

      const response: ClientsResponse = await fetchClients(params);

      setInternalClients(response.data);
      
    } catch (err) {
      console.error('Error loading clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setInternalLoading(false);
    }
  };

  // Effect to reload data when filters or sorting change (only in legacy mode)
  useEffect(() => {
    if (!propClients) {
      loadClients();
    }
  }, [status, search, client_type, tags, platform, registration_date, sortField, sortDirection, brandCode, propClients]);

  // Handle sorting
  const handleSort = (field: string) => {
    if (onSort) {
      // Use parent's sort handler when available
      onSort(field);
    } else {
      // Legacy mode: handle sorting internally
      if (field === sortField) {
        setInternalSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setInternalSortField(field);
        setInternalSortDirection(field === 'id' ? 'asc' : 'asc');
      }
    }
  };

  // Handle individual client selection
  const handleClientSelect = (clientId: number, selected: boolean) => {
    if (onSelectionChange) {
      // Use parent's selection handler when available
      const newSelection = selected
        ? [...selectedClients, clientId]
        : selectedClients.filter(id => id !== clientId);
      onSelectionChange(newSelection.map(id => id.toString()));
    } else {
      // Legacy mode: handle selection internally
      if (selected) {
        setInternalSelectedClients([...selectedClients, clientId]);
      } else {
        setInternalSelectedClients(selectedClients.filter(id => id !== clientId));
        setSelectAll(false);
      }
    }
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    setSelectAll(selected);
    if (onSelectionChange) {
      // Use parent's selection handler when available
      const newSelection = selected ? clients.map(client => client.id!).filter(id => id !== undefined) : [];
      onSelectionChange(newSelection.map(id => id.toString()));
    } else {
      // Legacy mode: handle selection internally
      if (selected) {
        setInternalSelectedClients(clients.map(client => client.id!).filter(id => id !== undefined));
      } else {
        setInternalSelectedClients([]);
      }
    }
  };

  // Handle client deletion
  const handleDeleteClient = async (clientId: number, hardDelete: boolean = false) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteClient(clientId, hardDelete);
      await loadClients();
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting client:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'delete' | 'update_status', data?: { status?: string }) => {
    if (selectedClients.length === 0) return;

    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedClients.length} client(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const request: BulkActionRequest = {
        action,
        client_ids: selectedClients,
        ...(data && { data })
      };

      await bulkActionClients(request);
      if (onSelectionChange) {
        onSelectionChange([]);
      } else {
        setInternalSelectedClients([]);
      }
      setSelectAll(false);
      await loadClients();
      onRefresh?.();
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
    }
  };



  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800 font-medium">Error Loading Clients</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <button 
          onClick={loadClients}
          className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Brand Filter */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {clients.length} result{clients.length === 1 ? '' : 's'}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Brand</label>
          <select
            value={brandCode}
            onChange={(e)=> setBrandCode(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="ALL">All Brands</option>
            {brands.map(b => (
              <option key={b.id} value={b.code}>{b.name} ({b.code})</option>
            ))}
          </select>
        </div>
      </div>
      {/* Bulk Actions Bar */}
      {selectedClients.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
          <span className="text-blue-800 font-medium">
            {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
          </span>
          <div className="space-x-2">
            <button
              onClick={() => handleBulkAction('update_status', { status: 'active' })}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('update_status', { status: 'suspended' })}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Suspend
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* Table Header */}
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.width}`}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key as string)}
                        className="group inline-flex items-center space-x-1 hover:text-gray-900"
                      >
                        <span>{column.label}</span>
                        <span className="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-500">
                          {sortField === column.key ? (
                            sortDirection === 'asc' ? '↑' : '↓'
                          ) : (
                            '↕'
                          )}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-gray-500">
                    No clients found
                  </td>
                </tr>
              ) : (
                clients
                  .filter(client => client.id !== undefined)
                  .map((client) => (
                    <tr 
                      key={client.id} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id as number)}
                          onChange={(e) => handleClientSelect(client.id as number, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      
                      {/* Client ID (MSA-XXX format) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatClientDisplay(client)}
                      </td>

                      {/* Name / Company */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex flex-col">
                          <Link href={`/clients/${client.id}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors cursor-pointer">
                            {getClientFullName(client)}
                          </Link>
                          {client.company_name && (
                            <span className="text-xs text-gray-500">{client.company_name}</span>
                          )}
                          {client.platform && (
                            <span className="text-sm text-gray-500">{client.platform}</span>
                          )}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex flex-col space-y-1">
                          {/* Email - takes remaining space */}
                          <div className="text-gray-600 break-all whitespace-normal flex-1 min-w-0">
                            {client.email || '-'}
                          </div>
                          {/* Phone with country code */}
                          {client.phone_number && (
                            <div className="flex items-center gap-1 text-gray-600 flex-shrink-0">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{PhoneNumberUtils.getCountryCode(client.phone_number) || 'US'}</span>
                              <span className="whitespace-nowrap">{formatPhoneNumber(client.phone_number)}</span>
                            </div>
                          )}
                          {!client.phone_number && (
                            <div className="text-gray-400 text-xs flex-shrink-0">-</div>
                          )}
                        </div>
                      </td>

                      {/* Client Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getClientTypeColor(client)}`}>
                          {getClientTypeDisplay(client)}
                        </span>
                      </td>

                      {/* Buyer Premium */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.buyer_premium !== undefined && client.buyer_premium !== null
                          ? `${client.buyer_premium}%`
                          : '-'
                        }
                      </td>

                      {/* Vendor Premium */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.vendor_premium !== undefined && client.vendor_premium !== null
                          ? `${client.vendor_premium}%`
                          : '-'
                        }
                      </td>

                      {/* Created Date & Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-500">{formatDate(client.created_at)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium mt-1 inline-block ${getStatusStyling(client.status || 'active')}`}>
                            {client.status?.charAt(0).toUpperCase() + (client.status?.slice(1) || '') || 'Active'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1">
                          {onClientEdit && (
                            <button
                              onClick={() => onClientEdit(client)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:text-indigo-800 active:bg-indigo-200 transition-colors cursor-pointer"
                              title="Edit client"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClient(client.id as number, false)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:text-red-800 active:bg-red-200 transition-colors cursor-pointer"
                            title="Delete client"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>


      </div>

    </div>
  );
} 