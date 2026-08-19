// /banzai layout — M2.19G.4 (ADR-036). Mounts the single, always-mounted BanzAI workspace ONCE around
// every navigable-context segment (global → operator → implementation). Because a Next.js layout persists
// across navigations within its subtree, the in-memory session (conversation, validation selection +
// receipts, onboarding candidature) survives moving between contexts — the mechanism behind(d):
// "all segments share the same always-mounted session via app/banzai/layout.tsx". The segment pages under
// this layout are thin binders that publish their server-resolved context to the workspace.
//
// /banzai remains the SINGLE human-operator interface (ADR-036, ADR-035): one shell, one session. The
// contexts are addressable route segments — NOT a second application, and NOT the three architectural
// layers or the L0–L4 certification profiles.

import { BanzaiWorkspaceProvider } from "@/components/banzai/BanzaiWorkspaceProvider";
import { BanzaiRuntimeStrip } from "@/components/reference/BanzaiRuntimeStrip";

// ADR-036 — the app /banzai surface derives its runtime/provider state from the runtime SSOT
// (GET /banzai/runtime), exactly as /referencia/banzai does. This server layout renders the same
// <BanzaiRuntimeStrip> server component (ISR fetch, fail-safe) and passes it as a node into the
// always-mounted client shell, so the shell shows route-derived runtime truth instead of static badges.
export default function BanzaiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="sr-only">BanzAI — interface primária humano-operador do protocolo BANZA</h1>
      <BanzaiWorkspaceProvider locale="pt" runtimeStrip={<BanzaiRuntimeStrip variant="agent" />}>
        {children}
      </BanzaiWorkspaceProvider>
    </>
  );
}
