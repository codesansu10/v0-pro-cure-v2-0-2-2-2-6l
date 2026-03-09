import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TEMPORARY DEBUG: Test Supabase connection by inserting a row
export async function debugTestSupabaseInsert() {
  console.log("[v0] ========== SUPABASE DEBUG TEST ==========");
  console.log("[v0] Supabase URL:", supabaseUrl);
  console.log("[v0] Supabase Anon Key present:", !!supabaseAnonKey);
  
  const testData = {
    rfq_number: "RFQ-DEBUG-001",
    project: "Debug Project",
    component: "Debug Component",
    quantity: 1,
    budget: 100,
    status: "Sent to Suppliers",
  };
  
  console.log("[v0] Inserting test data into 'rfqs' table:", testData);
  
  const { data, error } = await supabase
    .from("rfqs")
    .insert(testData)
    .select();
  
  console.log("[v0] ========== SUPABASE RESPONSE ==========");
  console.log("[v0] Response data:", JSON.stringify(data, null, 2));
  console.log("[v0] Response error:", error ? JSON.stringify(error, null, 2) : "null");
  
  if (error) {
    console.error("[v0] SUPABASE INSERT FAILED!");
    console.error("[v0] Error message:", error.message);
    console.error("[v0] Error details:", error.details);
    console.error("[v0] Error hint:", error.hint);
    console.error("[v0] Error code:", error.code);
  } else {
    console.log("[v0] SUPABASE INSERT SUCCEEDED!");
    console.log("[v0] Inserted row:", data);
  }
  
  console.log("[v0] ========================================");
  
  return { data, error };
}
