"use client";

import { StoreProvider } from "@/lib/store";
import { ProcureApp } from "@/components/procure-app";

export default function Home() {
  return (
    <StoreProvider>
      <ProcureApp />
    </StoreProvider>
  );
}
