"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Award, Check } from "lucide-react";
import type { QuotationLineItem } from "@/lib/types";

interface PriceComparisonProps {
  rfqId: string;
}

interface PositionAward {
  positionId: string;
  supplierId: string;
}

export function PriceComparison({ rfqId }: PriceComparisonProps) {
  const { state, updateQuotation } = useStore();
  const [positionAwards, setPositionAwards] = useState<PositionAward[]>([]);

  const rfq = state.rfqs.find((r) => r.id === rfqId);
  const quotations = state.quotations.filter((q) => q.rfqId === rfqId);
  const suppliers = quotations.map((q) => ({
    supplier: state.suppliers.find((s) => s.id === q.supplierId),
    quotation: q,
  }));

  if (!rfq || quotations.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center">
          <BarChart3 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            No quotations received yet for comparison.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Collect all unique positions from all quotations
  const allPositions: { id: string; name: string; description: string }[] = [];
  quotations.forEach((q) => {
    q.lineItems?.forEach((item) => {
      if (!allPositions.find((p) => p.name === item.itemName)) {
        allPositions.push({
          id: item.id,
          name: item.itemName,
          description: item.description,
        });
      }
    });
  });

  // Get price for a position from a supplier
  function getPriceForPosition(supplierId: string, positionName: string): QuotationLineItem | undefined {
    const quotation = quotations.find((q) => q.supplierId === supplierId);
    return quotation?.lineItems?.find((li) => li.itemName === positionName);
  }

  // Find lowest price for a position
  function getLowestPriceForPosition(positionName: string): { supplierId: string; price: number } | null {
    let lowest: { supplierId: string; price: number } | null = null;
    quotations.forEach((q) => {
      const item = q.lineItems?.find((li) => li.itemName === positionName);
      if (item && (!lowest || item.totalPrice < lowest.price)) {
        lowest = { supplierId: q.supplierId, price: item.totalPrice };
      }
    });
    return lowest;
  }

  // Handle position award
  function handleAwardPosition(positionName: string, supplierId: string) {
    setPositionAwards((prev) => {
      const existing = prev.findIndex((p) => p.positionId === positionName);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { positionId: positionName, supplierId };
        return updated;
      }
      return [...prev, { positionId: positionName, supplierId }];
    });
  }

  // Get awarded supplier for a position
  function getAwardedSupplier(positionName: string): string | null {
    return positionAwards.find((p) => p.positionId === positionName)?.supplierId || null;
  }

  return (
    <Card className="border-border">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold">
          <BarChart3 className="h-3.5 w-3.5" />
          Price Comparison — {rfqId}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {allPositions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No line items in quotations to compare.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase h-8 w-48">
                    Item Position
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8 w-20">
                    Qty
                  </TableHead>
                  {suppliers.map((s) => (
                    <TableHead
                      key={s.supplier?.id}
                      className="text-[10px] font-semibold uppercase h-8 text-center"
                    >
                      {s.supplier?.name || "Unknown"}
                    </TableHead>
                  ))}
                  <TableHead className="text-[10px] font-semibold uppercase h-8 text-center bg-emerald-50">
                    Lowest Price
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase h-8 text-center">
                    Award To
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPositions.map((position) => {
                  const lowest = getLowestPriceForPosition(position.name);
                  const awardedTo = getAwardedSupplier(position.name);

                  return (
                    <TableRow key={position.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs">
                        <div>
                          <p className="font-medium">{position.name}</p>
                          {position.description && (
                            <p className="text-[10px] text-muted-foreground">
                              {position.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {(() => {
                          const item = quotations[0]?.lineItems?.find(
                            (li) => li.itemName === position.name
                          );
                          return item?.quantity || "—";
                        })()}
                      </TableCell>
                      {suppliers.map((s) => {
                        const item = getPriceForPosition(
                          s.supplier?.id || "",
                          position.name
                        );
                        const isLowest =
                          lowest?.supplierId === s.supplier?.id;
                        const isAwarded = awardedTo === s.supplier?.id;

                        return (
                          <TableCell
                            key={s.supplier?.id}
                            className={`text-xs text-center ${
                              isLowest
                                ? "bg-emerald-50 font-medium text-emerald-700"
                                : ""
                            } ${isAwarded ? "ring-2 ring-[#00A0E3] ring-inset" : ""}`}
                          >
                            {item ? (
                              <div className="flex items-center justify-center gap-1">
                                {item.totalPrice.toLocaleString("de-DE")} EUR
                                {isLowest && (
                                  <Badge className="bg-emerald-600 text-white text-[8px] border-0 px-1">
                                    Lowest
                                  </Badge>
                                )}
                                {isAwarded && (
                                  <Check className="h-3 w-3 text-[#00A0E3]" />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-xs text-center bg-emerald-50 font-bold text-emerald-700">
                        {lowest
                          ? `${lowest.price.toLocaleString("de-DE")} EUR`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Select
                          value={awardedTo || ""}
                          onValueChange={(v) =>
                            handleAwardPosition(position.name, v)
                          }
                        >
                          <SelectTrigger className="h-7 text-[10px] w-32">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s) => (
                              <SelectItem
                                key={s.supplier?.id}
                                value={s.supplier?.id || ""}
                                className="text-xs"
                              >
                                {s.supplier?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Summary */}
            <div className="mt-4 flex items-center justify-between rounded border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Total Suppliers: </span>
                  <span className="font-medium">{suppliers.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Positions: </span>
                  <span className="font-medium">{allPositions.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Awarded: </span>
                  <span className="font-medium">
                    {positionAwards.length} / {allPositions.length}
                  </span>
                </div>
              </div>
              {positionAwards.length > 0 && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#00A0E3]" />
                  <span className="text-xs font-medium">
                    Split Award Active
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
