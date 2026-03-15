"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, RefreshCw, Link2, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  fetchUserLink,
  createUserLink,
  regenerateLink,
  type UserLink,
} from "@/lib/supabase-links";
import { buildLoginUrl } from "@/lib/link-utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function UserLinkDisplay() {
  const { currentRole, getCurrentUser } = useStore();
  const user = getCurrentUser();

  const [link, setLink] = useState<UserLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const loginUrl = link ? buildLoginUrl(link.slug) : "";

  // Load or create the link whenever the user/role changes
  const loadLink = useCallback(async () => {
    setLoading(true);
    try {
      let userLink = await fetchUserLink(user.id);
      if (!userLink) {
        userLink = await createUserLink(user.id, currentRole, user.name);
      }
      setLink(userLink);
    } catch (err) {
      console.error("[UserLinkDisplay] Failed to load link:", err);
    } finally {
      setLoading(false);
    }
  }, [user.id, currentRole, user.name]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  const handleCopy = useCallback(() => {
    if (!loginUrl) return;
    navigator.clipboard.writeText(loginUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error("[UserLinkDisplay] Failed to copy:", err);
    });
  }, [loginUrl]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const newLink = await regenerateLink(user.id, currentRole, user.name);
      setLink(newLink);
    } catch (err) {
      console.error("[UserLinkDisplay] Failed to regenerate link:", err);
    } finally {
      setRegenerating(false);
    }
  }, [user.id, currentRole, user.name]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="Your unique login link"
        >
          <Link2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">My Link</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Your Login Link
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Share this link to auto-authenticate as {user.name}
            </p>
          </div>

          {loading ? (
            <div className="h-8 rounded-md bg-muted animate-pulse" />
          ) : link ? (
            <>
              {/* Link display */}
              <div className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
                <p className="text-[10px] font-mono text-muted-foreground break-all leading-relaxed">
                  {loginUrl}
                </p>
              </div>

              {/* Slug badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Slug:</span>
                <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-foreground">
                  {link.slug}
                </code>
              </div>

              {/* Expiry */}
              {link.expires_at && (
                <p className="text-[10px] text-muted-foreground">
                  Expires:{" "}
                  {new Date(link.expires_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 flex-1 gap-1.5 text-[11px]"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Link
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-[11px]"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  title="Create a new link (old link will stop working)"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`}
                  />
                  {regenerating ? "…" : "Regenerate"}
                </Button>
              </div>

              <p className="text-[9px] text-muted-foreground leading-relaxed">
                ⚠️ Regenerating creates a new link — the old one will immediately
                stop working.
              </p>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground">
                No link found. Click below to generate one.
              </p>
              <Button size="sm" className="h-7 w-full text-[11px]" onClick={loadLink}>
                Generate Link
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
