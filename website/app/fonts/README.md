# Self-hosted web fonts

These files exist so that `next build` needs no outbound network access. Before this, `app/fonts.ts`
used `next/font/google`, which downloads the font binaries from `fonts.gstatic.com` at build time; a
merge-blocking CI context failed when that request could not be made. The typography did not change —
only where the bytes come from.

The subset is `latin`, matching the `subsets: ["latin"]` the previous configuration requested. Source
Serif 4 and Public Sans are variable fonts covering the whole 400–700 range in a single file, so one
file replaces four identical copies.

| File | Family | Weights | Licence |
|---|---|---|---|
| `source-serif-4-variable.woff2` | Source Serif 4 | 400–700 variable | SIL Open Font License 1.1 |
| `public-sans-variable.woff2` | Public Sans | 400–700 variable | SIL Open Font License 1.1 |
| `ibm-plex-mono-400/500/600.woff2` | IBM Plex Mono | 400, 500, 600 | SIL Open Font License 1.1 |
| `spectral-500/600/700.woff2` | Spectral | 500, 600, 700 | SIL Open Font License 1.1 |

All four families are published under the **SIL Open Font License 1.1**, which permits bundling and
web use, including in a redistributed work, and requires that the licence travel with the font files.
It does not require attribution in the rendered page. Upstream projects and licence text:

- Source Serif 4 — <https://github.com/adobe-fonts/source-serif>
- Public Sans — <https://github.com/uswds/public-sans>
- IBM Plex Mono — <https://github.com/IBM/plex>
- Spectral — <https://github.com/productiontype/spectral>

Obtained once from the Google Fonts `css2` endpoint and committed. They are static assets, not
generated artifacts: nothing regenerates them, and updating a family means deliberately replacing its
file and recording the change here.
