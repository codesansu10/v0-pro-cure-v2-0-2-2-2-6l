import { NextRequest, NextResponse } from "next/server";
import { recommendSuppliers } from "@/lib/nlp-recommender";
import { supabase } from "@/lib/supabaseClient";
import type { RFQ, Supplier } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rfq, suppliers } = body as {
      rfqId?: string;
      rfq: RFQ;
      suppliers: Supplier[];
    };

    // Validate required fields
    if (!rfq || !rfq.id || !rfq.component) {
      return NextResponse.json(
        { error: "Missing required RFQ fields (id, component)" },
        { status: 400 }
      );
    }
    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      return NextResponse.json(
        { error: "suppliers array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Run the NLP recommendation engine
    const result = recommendSuppliers(rfq, suppliers);

    // Persist recommendations to Supabase (fire-and-forget)
    if (supabase) {
      const rows = result.recommendations.map((rec) => ({
        rfq_id: rfq.id,
        supplier_id: rec.supplierId,
        rank: rec.rank,
        final_score: rec.finalScore,
        enhanced_relevance_score: rec.enhancedRelevanceScore,
        risk_compliance_score: rec.riskComplianceScore,
        performance_score: rec.performanceScore,
        nlp_similarity_score: rec.nlpSimilarityScore,
        eligibility_reason: rec.eligibilityReason,
        soft_warnings: rec.softWarnings.join("; "),
        reasons: rec.reasons.join(" | "),
        generated_at: result.generatedAt,
      }));

      supabase
        .from("rfq_supplier_recommendations")
        .upsert(rows, { onConflict: "rfq_id,supplier_id" })
        .then(({ error }) => {
          if (error) console.warn("[recommend-suppliers] Supabase upsert error:", error.message);
        });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[recommend-suppliers] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
