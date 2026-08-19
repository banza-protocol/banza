"use client";

// BanzaiWorkspaceProvider — M2.19G.4 (ADR-036). The single, always-mounted BanzAI workspace.
//
// Mounted ONCE by app/(pt)/banzai/layout.tsx so the same in-memory session (conversation, validation
// selection + receipts, onboarding candidature) survives navigation between the navigable CONTEXTS
// (global → operator → implementation), which are real route segments under /banzai. The segment pages
// are thin server components that shape-validate their closed-slug ids and render a <BanzaiRouteBinder>;
// the binder pushes the server-resolved BanzaiState here, and the persistent <BanzaiAgent> shell reflects
// it without ever remounting. This is the mechanism behind(d): "all segments share the same
// always-mounted session via app/(pt)/banzai/layout.tsx".
//
// Contexts are a NAVIGATION concept only — never the three architectural layers (ADR-004..063) and never
// the L0–L4 certification profiles (ADR-032..066). Nothing here fetches a caller-supplied URL: the route
// state arrives already parsed by the closed, throw-free parseBanzaiState choke-point.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { parseBanzaiState, type BanzaiState } from "@/lib/banzaiState";
import { BanzaiAgent } from "@/components/banzai/BanzaiAgent";
import type { Locale } from "@/lib/i18n";

interface WorkspaceApi {
  /** Push the server-resolved route state for the current segment. Called by <BanzaiRouteBinder>. */
  applyRouteState: (state: BanzaiState, locale: Locale) => void;
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null);

// ── BLOCK E2/Q3 — THE LOCALE BOUNDARY ─────────────────────────────────────────────────────────────
//
// The workspace is mounted once per route group and never remounts across segment navigation, so the
// reader's language cannot be re-derived further down: there is no pathname to read (segments publish
// already-parsed state, never a URL), no browser preference to consult, and no global to mutate. It is a
// ROUTE FACT, and it enters exactly here — from the layout that mounts the workspace, and again from each
// segment binder, both of which live at the route boundary and know their own edition.
//
// The context deliberately holds NO default. `useBanzaiLocale` throws outside a provider rather than
// answering "pt", because a nested owner that silently gets Portuguese is precisely the defect this whole
// block exists to prevent: the route would be correct, the registry correct, the build green, and the
// reader served the wrong language.
const LocaleContext = createContext<Locale | null>(null);

/** The reader's language, from the route boundary above. Throws if no boundary declared one. */
export function useBanzaiLocale(): Locale {
  const locale = useContext(LocaleContext);
  if (!locale) {
    throw new Error("useBanzaiLocale must be used within <BanzaiWorkspaceProvider> — no locale default exists");
  }
  return locale;
}

/**
 * The locale boundary itself, split out so the provider below and any test harness use the SAME code
 * path rather than a stand-in. Nothing else in the tree may create a LocaleContext value.
 */
export function BanzaiLocaleBoundary({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** The route binder (rendered by each segment page) uses this to publish its context. Throws if used
 *  outside the provider so a mis-wired route surfaces loudly in tests rather than silently no-op'ing. */
export function useBanzaiWorkspace(): WorkspaceApi {
  const api = useContext(WorkspaceContext);
  if (!api) throw new Error("useBanzaiWorkspace must be used within <BanzaiWorkspaceProvider>");
  return api;
}

/** The default, global-context state used until the first segment binder applies its own. Global + ask;
 *  no operator/implementation seed. Computed from the empty query through the same closed parser. */
const GLOBAL_DEFAULT: BanzaiState = parseBanzaiState({});

export function BanzaiWorkspaceProvider({
  children,
  locale,
  runtimeStrip,
}: {
  children: React.ReactNode;
  /** The edition this workspace is being served in, declared by the layout that mounts it. Required:
   *  the workspace has no way to guess, and guessing is the failure mode. */
  locale: Locale;
  /** ADR-036 — the runtime-truth strip (a server component rendered by app/(pt)/banzai/layout.tsx,
   *  reading GET /banzai/runtime and failing safe). Passed through as an inert node so the client shell
   *  can place it in the sidebar without importing a server component. */
  runtimeStrip?: React.ReactNode;
}) {
  const [routeState, setRouteState] = useState<BanzaiState>(GLOBAL_DEFAULT);
  // The layout's declaration is the initial truth; a segment binder republishes its own so navigating
  // into a segment of a different edition moves the whole workspace with it.
  const [routeLocale, setRouteLocale] = useState<Locale>(locale);

  const applyRouteState = useCallback((state: BanzaiState, segmentLocale: Locale) => {
    setRouteState(state);
    setRouteLocale(segmentLocale);
  }, []);

  const api = useMemo<WorkspaceApi>(() => ({ applyRouteState }), [applyRouteState]);

  return (
    <WorkspaceContext.Provider value={api}>
      <BanzaiLocaleBoundary locale={routeLocale}>
        {/* The single, always-mounted shell. It reflects the current route context without remounting. */}
        <BanzaiAgent routeState={routeState} runtimeStrip={runtimeStrip} />
        {/* The segment pages render here as invisible binders that publish their context above. */}
        {children}
      </BanzaiLocaleBoundary>
    </WorkspaceContext.Provider>
  );
}
