# BANZA — SVG Visual System

> The canonical visual grammar for every official BANZA protocol diagram. A conceptually correct but
> visually misaligned SVG must be harmonized to this grammar before it is considered final.

**SVGs do BANZA são artefactos oficiais de documentação do protocolo, não imagens decorativas.**

> **Um SVG oficial do BANZA deve ser legível, verificável e alinhado com o modelo activo do protocolo.
> Se um diagrama precisa de texto excessivo para ser entendido, o problema deve ser resolvido na
> arquitectura da informação, não comprimindo texto dentro do SVG.**

---

## 1. Canonical header

Every official SVG opens with a consistent top band:

- Wine/red background — gradient `#6E0F1A → #8E1326` (define once in `<defs>`), with a `#8E1326`
  accent strip along the bottom edge of the band; top corners rounded (`rx≈14`) where applicable.
- **Technical eyebrow** (monospace, `font-size≈10–11`, `letter-spacing≈2`, `fill=#FECACA`):
  `SVG-P-0XX · PROTOCOLO FINANCEIRO ABERTO`
- **Main title** — bold white (`font-weight 800`, `font-size≈19–22`), left-aligned.
- Optional short auxiliary phrase on the right (`fill≈#F6D9DD`), e.g.
  `BANZA define · BanzAI guia · motores verificam · evidência prova`.
- Consistent internal padding (`x≈28–32`); header height consistent per diagram family
  (`≈66` for standard, `≈72` for large multi-zone diagrams).

## 2. Canonical footer

Every SVG ends with a discreet technical footer (centred, `font-size≈9`, `fill≈#9CA3AF`):

`SVG-P-0XX · Nome do diagrama · BANZA_REFERENCIA.md §X · vY.Z · YYYY-MM-DD`

Include: SVG id, diagram name, documentary reference, chapter/section (if applicable), version, date.

## 3. Palette (semantic)

| Colour | Hex (base) | Meaning |
|---|---|---|
| Wine/red | `#8E1326` / `#6E0F1A` | protocol, core, boundary, institutional alerts |
| Gold | `#B98A3E` / `#9A6B1E` | governance, evolution, ADR/RFC |
| Slate/blue | `#2E4054` / `#33465B` | BanzAI, trust, explanation, metadata |
| Green | `#2E6A4E` / `#1D4A34` | operators, positive conformance, federation |
| Teal | `#0F766E` / `#115E59` | federation / peer interoperability |
| Warm neutrals | `#F8F4EC` / `#EFE9DD` / `#FBFBFA` | background, cards, separators |
| Grey/slate-light | `#6B7280` / `#9CA3AF` | outside the protocol, context, notes |

## 4. Typography

- Title: `19–22` · Subtitle: `12.5–13` · Section labels (eyebrow): `9–11` mono, letter-spacing.
- Body: `10.5–12` · Chips: `10.5–11.5` · Footer: `9`.
- **Minimum public font-size: `8px`** (nothing smaller on a public surface).
- Monospace only for ids, code, routes, machine values — never for body prose.

## 5. Layout

- Preferred `viewBox` widths: `900` / `1000` / `1040` (multi-zone). Height as content requires.
- External margins `≈24`; card padding `≈16–20`; block gap `≈12–16`; corner radius `9–16`;
  border width `1–2`. Arrows: thin (`1.6–2`), gold `#B98A3E`, with a small triangular marker.
- Minimum distance between text and any box edge: `≈12`. Grid-aligned rows.

## 6. Visual semantics (active model)

- **BANZA define** as regras (contracts, schemas, invariants, public rules).
- **BanzAI guia** (agente do protocolo): simula, verifica, explica, guia — não decide, não aprova,
  não certifica, não inventa regras.
- **Motores Rust/WASM verificam**; **a evidência prova**.
- **Operador publica** (implementa, auto-publica manifesto + evidência) — participação é demonstrada.
- **Pares interoperam localmente** — sem permissão central.
- **Governança evolui** o protocolo por RFC/ADR/spec/release.
- **Reguladores / entidades competentes ficam fora do protocolo.**

## 7. Visual prohibitions

Never: overlapping text; clipped text; illegible vertical labels; text below the minimum size;
excessive paragraphs inside the SVG; arrows crossing text; elements outside the viewBox; raster
images; base64 data URIs; external links (`http(s)://`, external `xlink:href`); ad-hoc styles outside
the BANZA family. Never the retired model — `BANZA CA`, `certificado de operador`, `operador
certificado`, `production certificate` as an active promise, `BanzAI Workbench`, `chat`/`assistant`
as identity, `Protocol Evidence Assistant`/`Protocol Knowledge System`, `sistema adjacente`,
`BanzAI não faz parte do protocolo`, `BanzAI cria/decide/aprova/certifica/licencia`.

## 8. Enforcement

`make svg-visual-system-check` verifies the canonical header/footer/`<title>`/`<desc>`/`viewBox`, the
absence of raster/base64/external links, the minimum font-size, and the absence of retired
terminology. The `reference-svg-check`, `svg-visual-quality-check`, `banzai-protocol-agent-check` and
`public-surface-clean-check` guards cover the reference embedding, geometry, agent framing and public
copy respectively. Exemplar of the canonical grammar: `banza-protocol-architecture-v1.svg` (SVG-P-071)
and `banzai-native-protocol-agent.svg` (SVG-P-072).
