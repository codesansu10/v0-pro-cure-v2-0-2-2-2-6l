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
  console.log("[v0] Starting Supabase debug test insert...");
  
  const testData = {
    rfq_number: "RFQ-TEST-001",
    project: "Test Project",
    component: "Test Component",
    quantity: 10,
    budget: 1000,
    status: "RFQ Sent",
  };
  
  console.log("[v0] Inserting test data:", testData);
  
  const { data, error } = await supabase
    .from("rfqs")
    .insert(testData)
    .select();
  
  console.log("[v0] Supabase response - data:", data);
  console.log("[v0] Supabase response - error:", error);
  
  if (error) {
    console.error("[v0] Supabase insert failed:", error.message, error.details, error.hint);
  } else {
    console.log("[v0] Supabase insert succeeded! Inserted row:", data);
  }
  
  return { data, error };
}
