"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Database, FileText, BarChart3 } from "lucide-react";

export function AdminPage() {
  const { state } = useStore();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          System Administration
        </h2>
        <p className="text-[11px] text-muted-foreground">
          System overview and data statistics
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Users",
            value: state.users.length,
            icon: Users,
          },
          {
            label: "RFQs",
            value: state.rfqs.length,
            icon: FileText,
          },
          {
            label: "Quotations",
            value: state.quotations.length,
            icon: Database,
          },
          {
            label: "QCS",
            value: state.qcs.length,
            icon: BarChart3,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xl font-bold text-foreground">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <Users className="h-3.5 w-3.5" />
            System Users
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase h-8">
                  ID
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase h-8">
                  Name
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase h-8">
                  Role
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase h-8">
                  Email
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/50">
                  <TableCell className="text-xs font-mono">{u.id}</TableCell>
                  <TableCell className="text-xs">{u.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.email}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data store overview */}
      <Card className="border-border">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <Database className="h-3.5 w-3.5" />
            Data Store Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="rounded border border-border p-3">
              <p className="font-medium mb-1">RFQ Status Distribution</p>
              {[
                "Draft",
                "Submitted",
                "Under Review",
                "Sent to Supplier",
                "Quote Received",
                "In Negotiation",
                "Final Decision",
                "Closed",
              ].map((status) => {
                const count = state.rfqs.filter(
                  (r) => r.status === status
                ).length;
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between py-0.5"
                  >
                    <span className="text-muted-foreground">{status}</span>
                    <span className="font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="rounded border border-border p-3">
              <p className="font-medium mb-1">System Messages</p>
              <p className="text-muted-foreground">
                Total messages: {state.messages.length}
              </p>
              <p className="text-muted-foreground mt-1">
                RFQ-Supplier Assignments: {state.rfqSuppliers.length}
              </p>
              <p className="text-muted-foreground mt-1">
                Total Suppliers: {state.suppliers.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
