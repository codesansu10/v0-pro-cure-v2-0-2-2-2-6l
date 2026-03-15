import { supabase } from "./supabaseClient";
import {
  fromSupabaseRFQRow,
  fromSupabaseRFQSupplierRow,
  fromSupabaseQuotationRow,
  fromSupabaseQCSRow,
  fromSupabaseMessageRow,
  fromSupabaseNotificationRow,
  fetchQuotationItems,
} from "./supabase-data";
import type {
  RFQ,
  RFQSupplier,
  Quotation,
  QCS,
  Message,
  Notification,
  QuotationLineItem,
} from "./types";

export interface RealtimeCallbacks {
  onRFQInsert: (rfq: RFQ) => void;
  onRFQUpdate: (rfq: RFQ) => void;
  onRFQSupplierInsert: (assignment: RFQSupplier) => void;
  onRFQSupplierUpdate: (assignment: RFQSupplier) => void;
  onQuotationInsert: (quotation: Quotation & { lineItems: QuotationLineItem[] }) => void;
  onQuotationUpdate: (quotation: Quotation) => void;
  onQuotationItemsChange: (quotationId: string, items: QuotationLineItem[]) => void;
  onQCSInsert: (qcs: QCS) => void;
  onQCSUpdate: (qcs: QCS) => void;
  onMessageInsert: (message: Message) => void;
  onNotificationInsert: (notification: Notification) => void;
  onNotificationUpdate: (notification: Notification) => void;
  onConnectionChange: (connected: boolean) => void;
}

/**
 * Sets up Supabase Realtime subscriptions for all procurement tables.
 * Subscribes to: rfqs, rfq_suppliers, quotations, quotation_items, qcs, messages, notifications.
 * Returns a cleanup function to unsubscribe when the component unmounts.
 */
export function setupRealtimeSubscriptions(callbacks: RealtimeCallbacks): () => void {
  if (!supabase) {
    callbacks.onConnectionChange(false);
    return () => {};
  }

  const channel = supabase
    .channel("procure-realtime")
    // RFQs: new requests become visible to all roles instantly
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "rfqs" },
      (payload) => {
        callbacks.onRFQInsert(fromSupabaseRFQRow(payload.new as Record<string, unknown>));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rfqs" },
      (payload) => {
        callbacks.onRFQUpdate(fromSupabaseRFQRow(payload.new as Record<string, unknown>));
      }
    )
    // RFQ-Supplier assignments: procurement sends to supplier → supplier sees in real-time
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "rfq_suppliers" },
      (payload) => {
        callbacks.onRFQSupplierInsert(
          fromSupabaseRFQSupplierRow(payload.new as Record<string, unknown>)
        );
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rfq_suppliers" },
      (payload) => {
        callbacks.onRFQSupplierUpdate(
          fromSupabaseRFQSupplierRow(payload.new as Record<string, unknown>)
        );
      }
    )
    // Quotations: supplier submits → all users see it with line items in real-time
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "quotations" },
      async (payload) => {
        const quotation = fromSupabaseQuotationRow(payload.new as Record<string, unknown>);
        // Fetch associated line items for the newly inserted quotation
        const lineItems = await fetchQuotationItems(quotation.id);
        callbacks.onQuotationInsert({ ...quotation, lineItems });
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "quotations" },
      (payload) => {
        callbacks.onQuotationUpdate(
          fromSupabaseQuotationRow(payload.new as Record<string, unknown>)
        );
      }
    )
    // Quotation items: sync line items when they are inserted or updated
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "quotation_items" },
      async (payload) => {
        const quotationId = (payload.new as Record<string, unknown>).quotation_id as string;
        const items = await fetchQuotationItems(quotationId);
        callbacks.onQuotationItemsChange(quotationId, items);
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "quotation_items" },
      async (payload) => {
        const quotationId = (payload.new as Record<string, unknown>).quotation_id as string;
        const items = await fetchQuotationItems(quotationId);
        callbacks.onQuotationItemsChange(quotationId, items);
      }
    )
    // QCS changes: procurement submits → HOP sees it in real-time
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "qcs" },
      (payload) => {
        callbacks.onQCSInsert(fromSupabaseQCSRow(payload.new as Record<string, unknown>));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "qcs" },
      (payload) => {
        callbacks.onQCSUpdate(fromSupabaseQCSRow(payload.new as Record<string, unknown>));
      }
    )
    // Messages: real-time chat between roles
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        callbacks.onMessageInsert(fromSupabaseMessageRow(payload.new as Record<string, unknown>));
      }
    )
    // Notifications: real-time alerts broadcast to all relevant users
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      (payload) => {
        callbacks.onNotificationInsert(
          fromSupabaseNotificationRow(payload.new as Record<string, unknown>)
        );
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notifications" },
      (payload) => {
        callbacks.onNotificationUpdate(
          fromSupabaseNotificationRow(payload.new as Record<string, unknown>)
        );
      }
    )
    .subscribe((status) => {
      callbacks.onConnectionChange(status === "SUBSCRIBED");
    });

  return () => {
    supabase!.removeChannel(channel);
  };
}
