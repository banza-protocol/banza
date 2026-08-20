import { it } from "vitest";
import { bilingualPairs, parityOf } from "./structuralParity";

// A reporting-only pass. It never fails; `structuralParity.test.ts` is the gate. This exists so the exact
// structural differences are readable in one place while the remaining pages are consolidated, instead of
// being reconstructed from an assertion diff each time.
it("reports the structural differences between editions", () => {
  const divergent = bilingualPairs().map(parityOf).filter((v) => v.differences.length > 0);
  const lines = divergent.flatMap((v) => [`── ${v.id}  ${v.pt} ↔ ${v.en}`, ...v.differences.map((d) => `   ${d}`)]);
  console.log(["", `structurally divergent: ${divergent.length}`, ...lines].join("\n"));
});
