"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { RFQForm } from "./rfq-form";
import { ChatPanel } from "./chat-panel";
import { Plus, MessageSquare, Edit, FileText } from "lucide-react";
import { ActivityFeed } from "./activity-feed";

export function EngineerDashboard() {
  const { state, getCurrentUser } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [chatRFQId, setChatRFQId] = useState<string | null>(null);
  const user = getCurrentUser();

  const myRFQs = state.rfqs.filter((r) => r.createdBy === user.id);

  const totalBudget = myRFQs.reduce((s, r) => s + r.budget, 0);
  const drafts = myRFQs.filter((r) => r.status === "Draft").length;
  const submitted = myRFQs.filter((r) => r.status !== "Draft").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Engineer Dashboard
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Create and manage your RFQ requests
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#00A0E3] text-white text-xs hover:bg-[#0090cc]"
          onClick={() => {
            setEditId(null);
            setShowForm(true);
          }}
        >
          <Plus className="mr-1 h-3 w-3" />
          New RFQ
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Total RFQs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-foreground">{myRFQs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-foreground">{drafts}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Submitted
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-foreground">{submitted}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-foreground">
              {totalBudget.toLocaleString("de-DE")} EUR
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" />
            My RFQs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {myRFQs.length === 0 ? (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                No RFQs created yet. Click &quot;New RFQ&quot; to get started.
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
                    Component
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Qty
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8">
                    Budget
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
                {myRFQs.map((rfq) => (
                  <TableRow key={rfq.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-mono">
                      {rfq.id}
                    </TableCell>
                    <TableCell className="text-xs">{rfq.project}</TableCell>
                    <TableCell className="text-xs">{rfq.component}</TableCell>
                    <TableCell className="text-xs">
                      {rfq.quantity.toLocaleString("de-DE")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {rfq.budget.toLocaleString("de-DE")} EUR
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={rfq.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {rfq.status === "Draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setEditId(rfq.id);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            setChatRFQId(
                              chatRFQId === rfq.id ? null : rfq.id
                            )
                          }
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {chatRFQId && <ChatPanel rfqId={chatRFQId} />}

      <ActivityFeed />

      {showForm && (
        <RFQForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditId(null);
          }}
          editId={editId}
        />
      )}
    </div>
  );
}
