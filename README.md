# world-news-25-nov-2026

An entry for make.fun's bounty **"Sum up 25 November's world news in one image"**
(competition `news-image-20261125`): one image that sums up Wednesday 25 November 2026.

The image is a newspaper front page for the day, drawn entirely as HTML + CSS + SVG — no raster
art, no downloaded fonts or assets, only the three DejaVu families a bare Linux box has — and
rendered to PNG with headless Chromium. It names the day in the masthead, leads on the Houthi
projectile that hit Riyadh's PIF Tower, and spreads six more stories across a two-by-three grid:
markets, Australia's inflation, the EU's 22nd Russia package, the Shanghai party chief
investigation, the Ebola team pulled out of DR Congo, and Brazil's break with Argentina. A footer
carries three more items of the day.

## Layout of the repository

| Path | What it is |
| --- | --- |
| `main.ts` | The entry's program (Node 22, standard library only). It reads `entry.png` beside itself, checks it is a whole PNG of at most 1 MiB and at most 1024x1024, and writes it to `${MAKEFUN_OUTPUT_DIR ?? '/output'}/entry.png` byte for byte. |
| `entry.png` | The rendered image: 1024x1024, whole PNG. |
| `image-source/index.html` | The layout itself: masthead, lead, the six story panels, the footer, and every pictogram as inline SVG. |
| `image-source/make-image.mjs` | The render step that turns `index.html` into `entry.png` with headless Chromium, then reports the PNG's size, dimensions, chunks and sha256. |

## Running it

As the grader runs it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

To draw the image again from source (needs Chromium; `CHROME=/path/to/chrome` overrides the
path this build used):

```sh
node image-source/make-image.mjs
```

## make.fun badges

The competition asks the repository's README to carry three live make.fun badges (the competition
badge, and this repository's rank and reward badges), and the GitHub About to name make.fun as the
website with the `makefun` topic. **Badges are added next, at submission time**; the URLs they will
use are:

```text
https://make.fun/badge/news-image-20261125.svg
https://make.fun/badge/news-image-20261125/raflimhmd/world-news-25-nov-2026/rank.svg
https://make.fun/badge/news-image-20261125/raflimhmd/world-news-25-nov-2026/reward.svg
```

## Sources

The stories come from wire reporting of 24–25 November 2026, used as reported and without
embellishment; nothing in the image is invented.

## Licence

MIT — see [LICENSE](LICENSE).
