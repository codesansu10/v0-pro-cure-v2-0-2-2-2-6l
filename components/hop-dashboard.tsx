"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { ChatPanel } from "./chat-panel";
import { useState } from "react";
import {
  CheckCircle,
  RotateCcw,
  BarChart3,
  FileText,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { TkLogo } from "@/components/tk-logo";

export function HOPDashboard() {
  const { state, updateQCS, updateRFQ } = useStore();
  const [chatRFQId, setChatRFQId] = useState<string | null>(null);

  const totalRFQs = state.rfqs.length;
  const totalBudget = state.rfqs.reduce((s, r) => s + r.budget, 0);
  const qcsCount = state.qcs.length;
  const approvedCount = state.qcs.filter((q) => q.status === "Approved").length;
  const closedRFQs = state.rfqs.filter((r) => r.status === "Closed").length;

  function handleApprove(qcsId: string) {
    const qcs = state.qcs.find((q) => q.id === qcsId);
    if (!qcs) return;
    updateQCS(qcsId, { status: "Approved" });
    updateRFQ(qcs.rfqId, { status: "Closed" });
  }

  function handleSendBack(qcsId: string) {
    const qcs = state.qcs.find((q) => q.id === qcsId);
    if (!qcs) return;
    updateQCS(qcsId, { status: "Sent Back" });
    updateRFQ(qcs.rfqId, { status: "In Negotiation" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <TkLogo containerClassName="h-7 w-28" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Head of Procurement Dashboard
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Review QCS, approve awards, and monitor procurement pipeline
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total RFQs", value: totalRFQs, icon: FileText },
          {
            label: "Total Budget",
            value: `${totalBudget.toLocaleString("de-DE")} EUR`,
            icon: TrendingUp,
          },
          { label: "QCS Created", value: qcsCount, icon: BarChart3 },
          { label: "Approved", value: approvedCount, icon: CheckCircle },
          { label: "Closed", value: closedRFQs, icon: CheckCircle },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-border">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {kpi.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* QCS Review */}
      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <BarChart3 className="h-3.5 w-3.5" />
            QCS for Review
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {state.qcs.length === 0 ? (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                No QCS to review yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    QCS ID
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    RFQ
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Project
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Budget
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Suppliers
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Recommended
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.qcs.map((qcs) => {
                  const quotations = state.quotations.filter(
                    (q) => q.rfqId === qcs.rfqId
                  );
                  const supplierInfo = quotations.map((q) => {
                    const s = state.suppliers.find(
                      (s) => s.id === q.supplierId
                    );
                    const val =
                      q.finalAwardValue || q.totalPrice + q.bonusMalus;
                    return { name: s?.name || "Unknown", value: val };
                  });

                  const recommended = supplierInfo.sort(
                    (a, b) => a.value - b.value
                  )[0];

                  return (
                    <TableRow key={qcs.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-mono">
                        {qcs.id}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {qcs.rfqId}
                      </TableCell>
                      <TableCell className="text-xs">{qcs.project}</TableCell>
                      <TableCell className="text-xs">
                        {qcs.budget.toLocaleString("de-DE")} EUR
                      </TableCell>
                      <TableCell className="text-xs">
                        {supplierInfo.map((s) => s.name).join(", ")}
                      </TableCell>
                      <TableCell>
                        {recommended ? (
                          <Badge className="bg-[#00A0E3] text-white text-[10px] border-0">
                            {recommended.name} —{" "}
                            {recommended.value.toLocaleString("de-DE")} EUR
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] border-0 text-white ${
                            qcs.status === "Approved"
                              ? "bg-emerald-600"
                              : qcs.status === "Sent Back"
                              ? "bg-orange-600"
                              : "bg-zinc-500"
                          }`}
                        >
                          {qcs.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {qcs.status === "Pending" && (
                            <>
                              <Button
                                size="sm"
                                className="h-6 gap-1 px-2 text-[10px] bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => handleApprove(qcs.id)}
                              >
                                <CheckCircle className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 gap-1 px-2 text-[10px]"
                                onClick={() => handleSendBack(qcs.id)}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Send Back
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              setChatRFQId(
                                chatRFQId === qcs.rfqId ? null : qcs.rfqId
                              )
                            }
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All RFQs overview */}
      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" />
            RFQ Pipeline Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {state.rfqs.length === 0 ? (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                No RFQs in the pipeline.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    ID
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Project
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Budget
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.rfqs.map((rfq) => (
                  <TableRow key={rfq.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-mono">
                      {rfq.id}
                    </TableCell>
                    <TableCell className="text-xs">{rfq.project}</TableCell>
                    <TableCell className="text-xs">
                      {rfq.budget.toLocaleString("de-DE")} EUR
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={rfq.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {chatRFQId && <ChatPanel rfqId={chatRFQId} />}
    </div>
  );
}
