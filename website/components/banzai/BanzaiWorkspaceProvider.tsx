"use client";

// BanzaiWorkspaceProvider — M2.19G.4 (ADR-042). The single, always-mounted BanzAI workspace.
//
// Mounted ONCE by app/banzai/layout.tsx so the same in-memory session (conversation, validation
// selection + receipts, onboarding candidature) survives navigation between the navigable CONTEXTS
// (global → operator → implementation), which are real route segments under /banzai. The segment pages
// are thin server components that shape-validate their closed-slug ids and render a <BanzaiRouteBinder>;
// the binder pushes the server-resolved BanzaiState here, and the persistent <BanzaiAgent> shell reflects
// it without ever remounting. This is the mechanism behind D-070-02(d): "all segments share the same
// always-mounted session via app/banzai/layout.tsx".
//
// Contexts are a NAVIGATION concept only — never the three architectural layers (ADR-003..063) and never
// the L0–L4 certification profiles (ADR-034..066). Nothing here fetches a caller-supplied URL: the route
// state arrives already parsed by the closed, throw-free parseBanzaiState choke-point.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { parseBanzaiState, type BanzaiState } from "@/lib/banzaiState";
import { BanzaiAgent } from "@/components/banzai/BanzaiAgent";

interface WorkspaceApi {
  /** Push the server-resolved route state for the current segment. Called by <BanzaiRouteBinder>. */
  applyRouteState: (state: BanzaiState) => void;
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null);

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
  runtimeStrip,
}: {
  children: React.ReactNode;
  /** ADR-042 D-076-10 — the runtime-truth strip (a server component rendered by app/banzai/layout.tsx,
   *  reading GET /banzai/runtime and failing safe). Passed through as an inert node so the client shell
   *  can place it in the sidebar without importing a server component. */
  runtimeStrip?: React.ReactNode;
}) {
  const [routeState, setRouteState] = useState<BanzaiState>(GLOBAL_DEFAULT);

  const applyRouteState = useCallback((state: BanzaiState) => {
    setRouteState(state);
  }, []);

  const api = useMemo<WorkspaceApi>(() => ({ applyRouteState }), [applyRouteState]);

  return (
    <WorkspaceContext.Provider value={api}>
      {/* The single, always-mounted shell. It reflects the current route context without remounting. */}
      <BanzaiAgent routeState={routeState} runtimeStrip={runtimeStrip} />
      {/* The segment pages render here as invisible binders that publish their context above. */}
      {children}
    </WorkspaceContext.Provider>
  );
}
