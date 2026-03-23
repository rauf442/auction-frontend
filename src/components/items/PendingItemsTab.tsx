"use client";

import React, { useEffect, useState } from "react";

interface PendingRecord {
    id: number;
    status: string | null;
    client_id?: number | null;
    client_info?: any;
    items: any[];
    created_at?: string;
}

interface ActionLoading {
    id: number;
    action: "approve" | "reject";
}

interface ConfirmState {
    id: number;
    action: "approve" | "reject";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : "http://localhost:3001/api";

export default function PendingItemsTab() {
    const [pending, setPending] = useState<PendingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<ActionLoading | null>(null);
    const [confirm, setConfirm] = useState<ConfirmState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch(`${API_BASE_URL}/pending-items`, { headers: { ...(token && { Authorization: `Bearer ${token}` }) } });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load pending items");
            setPending(data.data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load() }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setConfirm(null);
        };
        if (confirm) document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [confirm]);

    const approve = async (id: number) => {
        try {
            setConfirm(null);
            setActionLoading({ id, action: "approve" });
            setError(null);
            setSuccessMessage(null);
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch(`${API_BASE_URL}/pending-items/${id}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Approve failed");

            // Extract item IDs from wherever the API returns them
            const itemIds: number[] = data.item_ids || data.ids || (Array.isArray(data.data) ? data.data.map((d: any) => d.id).filter(Boolean) : []);

            const idText = itemIds.length > 0 ? ` Item${itemIds.length > 1 ? "s" : ""} listed with ID${itemIds.length > 1 ? "s" : ""}: ${itemIds.join(", ")}.` : "";

            setSuccessMessage(`Submission #${id} approved successfully.${idText} The item${itemIds.length > 1 ? "s have" : " has"} been added to inventory.`);
            await load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const reject = async (id: number) => {
        try {
            setConfirm(null);
            setActionLoading({ id, action: "reject" });
            setError(null);
            setSuccessMessage(null);
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch(`${API_BASE_URL}/pending-items/${id}/reject`, {
                method: "POST",
                headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Reject failed");

            setSuccessMessage(`Submission #${id} has been rejected and will not be listed in inventory.`);
            await load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleAction = (id: number, action: "approve" | "reject") => {
        setConfirm({ id, action });
    };

    const handleConfirm = () => {
        if (!confirm) return;
        if (confirm.action === "approve") approve(confirm.id);
        else reject(confirm.id);
    };

    return (
        <div className="h-full overflow-auto p-6">
            {/* Confirmation Modal */}
            {confirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{confirm.action === "approve" ? "Approve Submission" : "Reject Submission"}</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Please confirm that you want to {confirm.action} submission #{confirm.id}.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirm(null)} className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleConfirm} className={`px-4 py-2 text-sm rounded text-white font-medium ${confirm.action === "approve" ? "bg-teal-600 hover:bg-teal-700" : "bg-red-600 hover:bg-red-700"}`}>
                                {confirm.action === "approve" ? "Yes, Approve" : "Yes, Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pending Artwork Submissions</h2>
                <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Refresh
                </button>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                        <span className="text-red-500 text-lg leading-none mt-0.5">✕</span>
                        <span className="text-sm leading-relaxed">{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0 text-xl leading-none">
                        ×
                    </button>
                </div>
            )}

            {/* Success banner */}
            {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                        <span className="text-green-500 text-lg leading-none mt-0.5">✓</span>
                        <span className="text-sm leading-relaxed">{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600 shrink-0 text-xl leading-none">
                        ×
                    </button>
                </div>
            )}

            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : pending.length === 0 ? (
                <div className="p-6 text-gray-600">No pending submissions.</div>
            ) : (
                <div className="space-y-4">
                    {pending.map((p) => {
                        const isApprovingThis = actionLoading?.id === p.id && actionLoading?.action === "approve";
                        const isRejectingThis = actionLoading?.id === p.id && actionLoading?.action === "reject";
                        const isBusy = isApprovingThis || isRejectingThis;

                        return (
                            <div key={p.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold text-gray-900">Submission #{p.id}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            Status: <span className="font-medium">{p.status || "submitted"}</span>
                                            {p.created_at ? ` • ${new Date(p.created_at).toLocaleString()}` : ""}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button disabled={isBusy} onClick={() => handleAction(p.id, "approve")} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded disabled:opacity-50 min-w-[100px] transition-colors">
                                            {isApprovingThis ? (
                                                <span className="flex items-center justify-center gap-1.5">
                                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                    </svg>
                                                    Approving…
                                                </span>
                                            ) : (
                                                "Approve"
                                            )}
                                        </button>
                                        <button disabled={isBusy} onClick={() => handleAction(p.id, "reject")} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded disabled:opacity-50 min-w-[90px] transition-colors">
                                            {isRejectingThis ? (
                                                <span className="flex items-center justify-center gap-1.5">
                                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                    </svg>
                                                    Rejecting…
                                                </span>
                                            ) : (
                                                "Reject"
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {(p.items || []).map((it, idx) => (
                                        <div key={idx} className="border rounded p-3 bg-gray-50">
                                            <div className="font-medium text-gray-900 truncate">{it.title || "Untitled"}</div>
                                            <div className="text-xs text-gray-500 truncate mt-0.5">{it.description || ""}</div>
                                            {Array.isArray(it.images) && it.images.length > 0 && (
                                                <div className="mt-2 grid grid-cols-3 gap-1">
                                                    {it.images.slice(0, 6).map((u: string, i: number) => (
                                                        <div key={i} className="aspect-square overflow-hidden bg-gray-100 border rounded">
                                                            <img src={u} className="object-cover w-full h-full" alt={`img-${i}`} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}