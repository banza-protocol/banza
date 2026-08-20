// /en/banzai layout — Block E2/Q6. The English edition of the single, always-mounted BanzAI workspace.
//
// This is NOT a second application. It mounts the SAME <BanzaiWorkspaceProvider> around the same segment
// tree as the Portuguese route; the only difference is the edition it declares. Everything below reads
// that declaration through the locale boundary established in Q3, which is why there is no English
// component tree to keep in step with the Portuguese one.

import { BanzaiWorkspaceProvider } from "@/components/banzai/BanzaiWorkspaceProvider";
import { BanzaiRuntimeStrip } from "@/components/reference/BanzaiRuntimeStrip";

export default function BanzaiEnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="sr-only">BanzAI — the BANZA protocol&rsquo;s primary human-operator interface</h1>
      <BanzaiWorkspaceProvider locale="en" runtimeStrip={<BanzaiRuntimeStrip variant="agent" />}>
        {children}
      </BanzaiWorkspaceProvider>
    </>
  );
}
