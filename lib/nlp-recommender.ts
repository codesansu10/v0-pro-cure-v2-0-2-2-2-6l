/**
 * TK NLP Supplier Recommendation Engine
 *
 * Scores and ranks suppliers for an RFQ using:
 *   - Eligibility filtering (hard block + soft warnings)
 *   - Relevance scoring  (40%) – SCC/material-group overlap + TF-IDF cosine similarity
 *   - Risk/compliance    (30%) – risk %, assessment rating, credit check, cert penalties
 *   - Performance        (30%) – SGP score, evaluation score, sustainability audit
 *
 * All implemented in pure TypeScript (no external ML dependencies).
 */

import type { Supplier, RFQ, SupplierRecommendation, RFQRecommendationResult } from "./types";

// ─── Scoring weights (configurable) ──────────────────────────────────────────

const WEIGHTS = {
  relevance: 0.40,
  riskCompliance: 0.30,
  performance: 0.30,
};

const RELEVANCE_WEIGHTS = {
  ruleBased: 0.50,
  nlp: 0.50,
};

const RULE_BASED_WEIGHTS = {
  scc: 50,
  materialGroup: 35,
  countryBonus: 5,
  segmentBonus: { preferred: 5, approved: 3, conditional: 2, new: 1 },
};

const RISK_WEIGHTS = {
  riskScore: 0.50,
  assessmentRating: 0.25,
  creditCheck: 0.25,
};

const RISK_RATING_SCORES: Record<string, number> = { A: 90, B: 70, C: 40 };

const PERFORMANCE_WEIGHTS = {
  sgp: 0.40,
  evaluation: 0.40,
  sustainability: 0.20,
};

// Cert penalty points (deducted from risk/compliance score)
const CERT_PENALTY = 5;

// ─── TF-IDF + Cosine Similarity ───────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  const total = tokens.length || 1;
  tf.forEach((v, k) => tf.set(k, v / total));
  return tf;
}

function buildIDF(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  const N = docs.length || 1;
  for (const doc of docs) {
    const unique = new Set(doc);
    for (const t of unique) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  df.forEach((count, term) => {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1); // smoothed IDF
  });
  return idf;
}

function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = termFrequency(tokens);
  const vec = new Map<string, number>();
  tf.forEach((tfVal, term) => {
    vec.set(term, tfVal * (idf.get(term) ?? 1));
  });
  return vec;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  a.forEach((va, term) => {
    const vb = b.get(term) ?? 0;
    dot += va * vb;
    normA += va * va;
  });
  b.forEach((vb) => {
    normB += vb * vb;
  });
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Eligibility helpers ─────────────────────────────────────────────────────

function isExpired(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function getEligibility(supplier: Supplier): {
  eligible: boolean;
  reason: "Eligible" | "Blocked";
  softWarnings: string[];
} {
  if (supplier.purchasingBlock) {
    return { eligible: false, reason: "Blocked", softWarnings: [] };
  }
  const warnings: string[] = [];
  if (isExpired(supplier.qmCertExpiry)) warnings.push("QM certificate expired");
  if (isExpired(supplier.iso14001Expiry)) warnings.push("ISO 14001 expired");
  if (isExpired(supplier.iso45001Expiry)) warnings.push("ISO 45001 expired");
  if (!supplier.technicalCompliance) warnings.push("Technical compliance incomplete");
  if (!supplier.commercialSpecCompliant) warnings.push("Commercial spec not compliant");
  return { eligible: true, reason: "Eligible", softWarnings: warnings };
}

// ─── Relevance scoring (rule-based) ──────────────────────────────────────────

function rfqKeywords(rfq: RFQ): string[] {
  return tokenize(`${rfq.component} ${rfq.project} ${rfq.requestType} ${rfq.plant}`);
}

function supplierKeywords(supplier: Supplier): string[] {
  const scc = (supplier.sccCodes ?? []).join(" ");
  const mg = (supplier.materialGroups ?? []).join(" ");
  return tokenize(`${supplier.commodityFocus} ${scc} ${mg}`);
}

function ruleBasedRelevance(rfq: RFQ, supplier: Supplier): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // SCC overlap (max 50 pts)
  const rfqWords = new Set(rfqKeywords(rfq));
  const sccWords = new Set(
    tokenize((supplier.sccCodes ?? []).concat(supplier.materialGroups ?? []).join(" "))
  );
  const overlapTerms = [...rfqWords].filter((w) => sccWords.has(w));
  const sccRatio = rfqWords.size > 0 ? overlapTerms.length / rfqWords.size : 0;
  const sccPts = sccRatio * RULE_BASED_WEIGHTS.scc;
  score += sccPts;
  if (overlapTerms.length > 0) {
    reasons.push(`Keyword overlap: ${overlapTerms.slice(0, 5).join(", ")}`);
  }

  // Material group overlap (max 35 pts)
  const mgWords = new Set(tokenize((supplier.materialGroups ?? []).join(" ")));
  const mgOverlap = [...rfqWords].filter((w) => mgWords.has(w));
  const mgRatio = rfqWords.size > 0 ? mgOverlap.length / rfqWords.size : 0;
  score += mgRatio * RULE_BASED_WEIGHTS.materialGroup;
  if (mgOverlap.length > 0) {
    reasons.push(`Material group match: ${mgOverlap.slice(0, 3).join(", ")}`);
  }

  // Country bonus (max 5 pts) – match plant location hint
  if (
    supplier.country &&
    rfq.plant &&
    rfq.plant.toLowerCase().includes(supplier.country.toLowerCase())
  ) {
    score += RULE_BASED_WEIGHTS.countryBonus;
    reasons.push(`Country match: ${supplier.country}`);
  }

  // Segment bonus (max 5 pts)
  const seg = supplier.segment ?? "new";
  const segBonus = RULE_BASED_WEIGHTS.segmentBonus[seg] ?? 1;
  score += segBonus;
  reasons.push(`Segment: ${seg} (+${segBonus})`);

  return { score: Math.min(score, 100), reasons };
}

// ─── Risk/compliance scoring ─────────────────────────────────────────────────

function riskComplianceScore(supplier: Supplier): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  // Risk percentage score (lower risk → higher score)
  const riskPct = supplier.riskScore ?? 50;
  const riskPts = 100 - riskPct;
  reasons.push(`Risk score: ${riskPts.toFixed(0)} (${riskPct}% risk)`);

  // Risk assessment rating
  const ratingKey = supplier.riskAssessmentResult ?? supplier.rating ?? "B";
  const ratingPts = RISK_RATING_SCORES[ratingKey] ?? 70;
  reasons.push(`Risk assessment: ${ratingKey} (${ratingPts})`);

  // Credit check score
  const creditPts = supplier.creditCheckScore ?? 70;
  reasons.push(`Credit check: ${creditPts.toFixed(0)}`);

  let score =
    riskPts * RISK_WEIGHTS.riskScore +
    ratingPts * RISK_WEIGHTS.assessmentRating +
    creditPts * RISK_WEIGHTS.creditCheck;

  // Cert expiry penalties
  if (isExpired(supplier.qmCertExpiry)) { score -= CERT_PENALTY; reasons.push("⚠ QM cert expired (−5)"); }
  if (isExpired(supplier.iso14001Expiry)) { score -= CERT_PENALTY; reasons.push("⚠ ISO 14001 expired (−5)"); }
  if (isExpired(supplier.iso45001Expiry)) { score -= CERT_PENALTY; reasons.push("⚠ ISO 45001 expired (−5)"); }

  return { score: Math.max(0, Math.min(score, 100)), reasons };
}

// ─── Performance scoring ─────────────────────────────────────────────────────

function performanceScore(supplier: Supplier): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  const sgp = supplier.sgpTotalScore ?? 70;
  const eval_ = supplier.supplierEvaluationScore ?? 70;
  const sustain = supplier.sustainabilityAuditScore ?? 70;

  const score =
    sgp * PERFORMANCE_WEIGHTS.sgp +
    eval_ * PERFORMANCE_WEIGHTS.evaluation +
    sustain * PERFORMANCE_WEIGHTS.sustainability;

  reasons.push(`SGP score: ${sgp.toFixed(0)}`);
  reasons.push(`Evaluation score: ${eval_.toFixed(0)}`);
  reasons.push(`Sustainability audit: ${sustain.toFixed(0)}`);

  return { score: Math.min(score, 100), reasons };
}

// ─── Main recommendation function ────────────────────────────────────────────

export function recommendSuppliers(
  rfq: RFQ,
  suppliers: Supplier[],
  topN = 10
): RFQRecommendationResult {
  // Build TF-IDF IDF over the whole corpus (rfq + all suppliers)
  const rfqTokens = rfqKeywords(rfq);
  const supplierTokenDocs = suppliers.map((s) => supplierKeywords(s));
  const allDocs = [rfqTokens, ...supplierTokenDocs];
  const idf = buildIDF(allDocs);
  const rfqVec = tfidfVector(rfqTokens, idf);

  const results: SupplierRecommendation[] = [];

  for (let i = 0; i < suppliers.length; i++) {
    const supplier = suppliers[i];
    const { eligible, reason: eligibilityReason, softWarnings } = getEligibility(supplier);

    // Skip hard-blocked suppliers
    if (!eligible) continue;

    // Relevance scoring
    const { score: ruleScore, reasons: ruleReasons } = ruleBasedRelevance(rfq, supplier);
    const supTokens = supplierTokenDocs[i];
    const supVec = tfidfVector(supTokens, idf);
    const nlpSim = cosineSimilarity(rfqVec, supVec) * 100; // 0–100
    const enhancedRelevance =
      ruleScore * RELEVANCE_WEIGHTS.ruleBased + nlpSim * RELEVANCE_WEIGHTS.nlp;

    // Risk/compliance scoring
    const { score: riskScore, reasons: riskReasons } = riskComplianceScore(supplier);

    // Performance scoring
    const { score: perfScore, reasons: perfReasons } = performanceScore(supplier);

    // Final weighted score
    const finalScore =
      enhancedRelevance * WEIGHTS.relevance +
      riskScore * WEIGHTS.riskCompliance +
      perfScore * WEIGHTS.performance;

    const allReasons = [
      `NLP similarity: ${nlpSim.toFixed(1)}%`,
      ...ruleReasons,
      ...riskReasons,
      ...perfReasons,
    ];

    results.push({
      rank: 0, // filled in after sort
      supplierId: supplier.id,
      supplierName: supplier.name,
      finalScore: Math.round(finalScore * 10) / 10,
      enhancedRelevanceScore: Math.round(enhancedRelevance * 10) / 10,
      riskComplianceScore: Math.round(riskScore * 10) / 10,
      performanceScore: Math.round(perfScore * 10) / 10,
      nlpSimilarityScore: Math.round(nlpSim * 10) / 10,
      eligibilityReason,
      softWarnings,
      reasons: allReasons,
    });
  }

  // Sort descending by final score and assign ranks
  results.sort((a, b) => b.finalScore - a.finalScore);
  const topResults = results.slice(0, topN).map((r, idx) => ({ ...r, rank: idx + 1 }));

  return {
    rfqId: rfq.id,
    rfqComponent: rfq.component,
    totalEligibleSuppliers: results.length,
    recommendations: topResults,
    generatedAt: new Date().toISOString(),
  };
}
