"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchLinkBySlug, updateLastUsed } from "@/lib/supabase-links";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

// Map stored role values to display-friendly labels
const roleLabels: Record<string, string> = {
  engineer: "Engineer",
  procurement: "Procurement",
  supplier_a: "Supplier A",
  supplier_b: "Supplier B",
  supplier_c: "Supplier C",
  supplier_d: "Supplier D",
  supplier_e: "Supplier E",
  hop: "Head of Procurement",
};

// Map user_id to user name (mirrors store.tsx defaultUsers)
const userNames: Record<string, string> = {
  "USR-001": "Max Mueller",
  "USR-002": "Anna Schmidt",
  "USR-003": "Steel Corp GmbH",
  "USR-004": "MetalWorks AG",
  "USR-005": "Dr. Klaus Weber",
  "USR-006": "Precision Parts Ltd",
  "USR-007": "AlloyTech Industries",
  "USR-008": "EuroForge SA",
};

type Status = "loading" | "success" | "error";

export default function LoginSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [status, setStatus] = useState<Status>("loading");
  const [userName, setUserName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!slug) {
      setStatus("error");
      setErrorMsg("No login link provided.");
      return;
    }

    async function authenticate() {
      try {
        const link = await fetchLinkBySlug(slug);

        if (!link) {
          setStatus("error");
          setErrorMsg(
            "This link is invalid or has expired. Please request a new link."
          );
          return;
        }

        // Check expiry
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
          setStatus("error");
          setErrorMsg(
            "This link has expired. Please ask the user to regenerate their link."
          );
          return;
        }

        // Persist authentication to localStorage so the main app picks it up
        if (typeof window !== "undefined") {
          localStorage.setItem("procure-auth-token", link.token);
          localStorage.setItem("procure-auth-user-id", link.user_id);
          localStorage.setItem("procure-auth-role", link.role ?? "");
          localStorage.setItem("procure-auth-slug", slug);
        }

        // Track last used
        await updateLastUsed(slug);

        const name = userNames[link.user_id] ?? link.user_id;
        const rl = roleLabels[link.role ?? ""] ?? link.role ?? "Unknown";
        setUserName(name);
        setRoleLabel(rl);
        setStatus("success");

        // Redirect to the main app after a brief confirmation
        setTimeout(() => {
          router.push("/");
        }, 1800);
      } catch (err) {
        console.error("[Login] Authentication error:", err);
        setStatus("error");
        setErrorMsg(
          "An unexpected error occurred. Please try again or contact support."
        );
      }
    }

    authenticate();
  }, [slug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-center">
        {/* Logo / brand */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-foreground">ProCure v2.0</h1>
          <p className="text-xs text-muted-foreground">thyssenkrupp Sourcing Platform</p>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#00A0E3]" />
            <p className="text-sm text-muted-foreground">Verifying your link…</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
            <div>
              <p className="text-base font-semibold text-foreground">
                Welcome, {userName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Logged in as {roleLabel}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Redirecting to your dashboard…
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="h-10 w-10 text-red-500" />
            <div>
              <p className="text-base font-semibold text-foreground">
                Link Invalid
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="mt-2 rounded-md bg-[#00A0E3] px-4 py-1.5 text-xs text-white hover:bg-[#0090d0] transition-colors"
            >
              Go to App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
