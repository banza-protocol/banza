"use client";

// BanzaiRouteBinder — M2.19G.4 (ADR-070). The invisible bridge between a /banzai route segment and the
// single always-mounted workspace. Each segment page (global, operator, implementation) shape-validates
// its closed-slug ids SERVER-SIDE, resolves the state through the throw-free parseBanzaiState choke-point,
// and renders this binder with that state. On mount / when the resolved context changes, it publishes the
// state to <BanzaiWorkspaceProvider>, which the persistent <BanzaiAgent> shell reflects. Renders nothing.
//
// Effect deps are the PRIMITIVE context fields (not the object identity) so a same-context re-render never
// re-fires, but a real context/mode/seed change always does. No URL is ever read here — the ids arrive
// already validated.

import { useEffect, useLayoutEffect } from "react";
import { useBanzaiWorkspace } from "@/components/banzai/BanzaiWorkspaceProvider";
import type { BanzaiState } from "@/lib/banzaiState";

// Apply the route context BEFORE the browser paints on the client (so a deep link renders the correct
// context with no visible settle), while falling back to useEffect during SSR (where useLayoutEffect
// warns and cannot run). The binder itself renders null in both, so hydration never diverges.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function BanzaiRouteBinder({ state }: { state: BanzaiState }) {
  const { applyRouteState } = useBanzaiWorkspace();
  useIsomorphicLayoutEffect(() => {
    applyRouteState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applyRouteState,
    state.context,
    state.mode,
    state.initialOperatorId,
    state.initialImplementationId,
    state.view,
    state.workflow,
    state.step,
  ]);
  return null;
}
