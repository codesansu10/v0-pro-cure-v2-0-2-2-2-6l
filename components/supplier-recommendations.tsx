"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sparkles, AlertTriangle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { RFQ, Supplier, RFQRecommendationResult, SupplierRecommendation } from "@/lib/types";

interface Props {
  rfq: RFQ;
  suppliers: Supplier[];
  onSelect?: (supplierIds: string[]) => void;
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums w-8 text-right">{value.toFixed(0)}</span>
    </div>
  );
}

function RecommendationRow({
  rec,
  selected,
  onToggle,
}: {
  rec: SupplierRecommendation;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        className={`cursor-pointer ${selected ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
        onClick={onToggle}
      >
        <TableCell className="w-8">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer accent-[#00A0E3]"
          />
        </TableCell>
        <TableCell className="text-xs font-semibold text-center">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00A0E3] text-white text-[11px]">
            {rec.rank}
          </span>
        </TableCell>
        <TableCell className="text-xs font-medium">{rec.supplierName}</TableCell>
        <TableCell className="text-xs">
          <span className="font-bold text-[#00A0E3]">{rec.finalScore.toFixed(1)}</span>
        </TableCell>
        <TableCell className="min-w-[120px]">
          <ScoreBar value={rec.enhancedRelevanceScore} color="bg-green-500" />
        </TableCell>
        <TableCell className="min-w-[120px]">
          <ScoreBar value={rec.riskComplianceScore} color="bg-amber-500" />
        </TableCell>
        <TableCell className="min-w-[120px]">
          <ScoreBar value={rec.performanceScore} color="bg-purple-500" />
        </TableCell>
        <TableCell>
          {rec.softWarnings.length > 0 ? (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 gap-1">
              <AlertTriangle className="w-3 h-3" />
              {rec.softWarnings.length} warning{rec.softWarnings.length > 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Clean
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={9} className="py-2 px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {rec.softWarnings.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-amber-600 mb-1">Warnings</p>
                  <ul className="space-y-0.5">
                    {rec.softWarnings.map((w, i) => (
                      <li key={i} className="text-[11px] text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">Scoring Reasons</p>
                <ul className="space-y-0.5">
                  {rec.reasons.map((r, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground">• {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function SupplierRecommendations({ rfq, suppliers, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RFQRecommendationResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchRecommendations() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/rfq/recommend-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfq, suppliers }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data: RFQRecommendationResult = await res.json();
      setResult(data);
      // Pre-select top 5
      setSelected(data.recommendations.slice(0, 5).map((r) => r.supplierId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch recommendations");
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    fetchRecommendations();
  }

  function toggleSupplier(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleConfirm() {
    if (onSelect) onSelect(selected);
    setOpen(false);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs border-[#00A0E3] text-[#00A0E3] hover:bg-[#00A0E3]/10"
        onClick={handleOpen}
      >
        <Sparkles className="w-3.5 h-3.5" />
        AI Recommendations
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-[#00A0E3]" />
              AI Supplier Recommendations
              <span className="text-muted-foreground font-normal">— {rfq.component}</span>
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#00A0E3]" />
              <p className="text-sm text-muted-foreground">Analyzing {suppliers.length} suppliers…</p>
              <div className="text-xs text-muted-foreground space-y-1 text-center">
                <p>🔍 Filtering eligibility</p>
                <p>📊 Computing relevance scores</p>
                <p>🔐 Evaluating risk &amp; compliance</p>
                <p>🏆 Measuring performance</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {error}
            </div>
          )}

          {result && !loading && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card className="bg-muted/30">
                  <CardContent className="pt-3 pb-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Eligible</p>
                    <p className="text-2xl font-bold text-[#00A0E3]">{result.totalEligibleSuppliers}</p>
                    <p className="text-[10px] text-muted-foreground">of {suppliers.length} suppliers</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-3 pb-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Top Score</p>
                    <p className="text-2xl font-bold text-green-600">
                      {result.recommendations[0]?.finalScore.toFixed(1) ?? "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{result.recommendations[0]?.supplierName}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-3 pb-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Selected</p>
                    <p className="text-2xl font-bold text-purple-600">{selected.length}</p>
                    <p className="text-[10px] text-muted-foreground">suppliers to send RFQ</p>
                  </CardContent>
                </Card>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Relevance (40%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Risk/Compliance (30%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Performance (30%)</span>
              </div>

              {/* Recommendations table */}
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="w-10 text-center text-[11px]">#</TableHead>
                      <TableHead className="text-[11px]">Supplier</TableHead>
                      <TableHead className="text-[11px]">Score</TableHead>
                      <TableHead className="text-[11px] min-w-[120px]">Relevance</TableHead>
                      <TableHead className="text-[11px] min-w-[120px]">Risk</TableHead>
                      <TableHead className="text-[11px] min-w-[120px]">Performance</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.recommendations.map((rec) => (
                      <RecommendationRow
                        key={rec.supplierId}
                        rec={rec}
                        selected={selected.includes(rec.supplierId)}
                        onToggle={() => toggleSupplier(rec.supplierId)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-[10px] text-muted-foreground mt-1">
                Generated at {new Date(result.generatedAt).toLocaleString()} · Click a row to expand scoring details
              </p>
            </>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {result && (
              <Button
                size="sm"
                className="bg-[#00A0E3] text-white text-xs hover:bg-[#0090cc] gap-1.5"
                onClick={handleConfirm}
                disabled={selected.length === 0}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Use Selected ({selected.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
