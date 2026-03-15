"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
  User,
  RFQ,
  Supplier,
  RFQSupplier,
  Quotation,
  QCS,
  Message,
  Notification,
} from "@/lib/types";
import {
  fetchUsers,
  fetchRFQs,
  fetchSuppliers,
  fetchRFQSuppliers,
  fetchQuotationsWithItems,
  fetchQCS,
  fetchMessages,
  fetchNotifications,
  insertUser,
  updateUser,
  insertRFQ,
  updateRFQFields,
  updateRFQStatus,
  insertSupplier,
  updateSupplier,
  insertRFQSupplier,
  updateRFQSupplierStatus,
  insertQuotationWithItems,
  updateQuotationInSupabase,
  insertQCS,
  updateQCSInSupabase,
  insertMessage,
  insertNotification,
  updateNotificationRead,
} from "@/lib/supabase-data";

// ─── Generic fetch hook ────────────────────────────────────────────────────────

function useFetch<T>(
  fetcher: () => Promise<T[]>,
  realtimeTable?: string
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!realtimeTable || !supabase) return;
    const channel = supabase
      .channel(`realtime:${realtimeTable}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: realtimeTable },
        () => { load(); }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel).catch((err: unknown) => {
        console.error("[Supabase] Error removing realtime channel:", err);
      });
    };
  }, [realtimeTable, load]);

  return { data, loading, error, refetch: load };
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export function useUsers() {
  const { data, loading, error, refetch } = useFetch<User>(fetchUsers);

  const addUser = useCallback(async (user: User) => {
    const ok = await insertUser(user);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  const editUser = useCallback(async (id: string, updates: Partial<User>) => {
    const ok = await updateUser(id, updates);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  return { users: data, loading, error, refetch, addUser, editUser };
}

// ─── RFQs ──────────────────────────────────────────────────────────────────────

export function useRFQs() {
  const { data, loading, error, refetch } = useFetch<RFQ>(fetchRFQs, "rfqs");

  const addRFQ = useCallback(async (rfq: RFQ) => {
    const ok = await insertRFQ(rfq);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  const updateStatus = useCallback(async (rfqId: string, status: string) => {
    const ok = await updateRFQStatus(rfqId, status);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  const updateFields = useCallback(async (rfqId: string, updates: Record<string, unknown>) => {
    const ok = await updateRFQFields(rfqId, updates);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  return { rfqs: data, loading, error, refetch, addRFQ, updateStatus, updateFields };
}

// ─── Suppliers ─────────────────────────────────────────────────────────────────

export function useSuppliers() {
  const { data, loading, error, refetch } = useFetch<Supplier>(fetchSuppliers);

  const addSupplier = useCallback(async (supplier: Supplier) => {
    const ok = await insertSupplier(supplier);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  const editSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    const ok = await updateSupplier(id, updates);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  return { suppliers: data, loading, error, refetch, addSupplier, editSupplier };
}

// ─── RFQ Suppliers ─────────────────────────────────────────────────────────────

export function useRFQSuppliers() {
  const { data, loading, error, refetch } = useFetch<RFQSupplier>(fetchRFQSuppliers, "rfq_suppliers");

  const assign = useCallback(async (assignment: RFQSupplier) => {
    const ok = await insertRFQSupplier(assignment);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  const updateStatus = useCallback(async (
    rfqId: string,
    supplierId: string,
    updates: Parameters<typeof updateRFQSupplierStatus>[2]
  ) => {
    const ok = await updateRFQSupplierStatus(rfqId, supplierId, updates);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  return { rfqSuppliers: data, loading, error, refetch, assign, updateStatus };
}

// ─── Quotations ────────────────────────────────────────────────────────────────

export function useQuotations(rfqId?: string) {
  const fetcher = useCallback(() => fetchQuotationsWithItems(rfqId || ""), [rfqId]);
  const { data, loading, error, refetch } = useFetch<Quotation & { lineItems: Quotation["lineItems"] }>(
    rfqId ? fetcher : (() => Promise.resolve([])),
    "quotations"
  );

  const addQuotation = useCallback(async (
    quotation: Omit<Quotation, "lineItems">,
    lineItems: NonNullable<Quotation["lineItems"]>
  ) => {
    const ok = await insertQuotationWithItems(quotation, lineItems);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  const editQuotation = useCallback(async (id: string, updates: Partial<Quotation>) => {
    const ok = await updateQuotationInSupabase(id, updates);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  return { quotations: data, loading, error, refetch, addQuotation, editQuotation };
}

// ─── QCS ───────────────────────────────────────────────────────────────────────

export function useQCS() {
  const { data, loading, error, refetch } = useFetch<QCS>(fetchQCS, "qcs");

  const addQCS = useCallback(async (qcs: QCS) => {
    const ok = await insertQCS(qcs);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  const editQCS = useCallback(async (id: string, updates: Partial<QCS>) => {
    const ok = await updateQCSInSupabase(id, updates);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  return { qcsList: data, loading, error, refetch, addQCS, editQCS };
}

// ─── Messages ──────────────────────────────────────────────────────────────────

export function useMessages() {
  const { data, loading, error, refetch } = useFetch<Message>(fetchMessages, "messages");

  const sendMessage = useCallback(async (msg: Message) => {
    const ok = await insertMessage(msg);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  return { messages: data, loading, error, refetch, sendMessage };
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export function useNotifications() {
  const { data, loading, error, refetch } = useFetch<Notification>(fetchNotifications, "notifications");

  const addNotification = useCallback(async (notif: Notification) => {
    const ok = await insertNotification(notif);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  const markRead = useCallback(async (id: string, read: boolean) => {
    const ok = await updateNotificationRead(id, read);
    if (ok) refetch();
    return ok;
  }, [refetch]);

  return { notifications: data, loading, error, refetch, addNotification, markRead };
}
