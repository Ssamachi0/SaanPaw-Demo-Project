# Image Recognition Spike

A timeboxed experiment that answers one question before any backend code is written:

> Does a pre-trained image embedding separate photos of the **same** animal from
> photos of **different** animals well enough to drive SaanPaw's matching — and
> what should `IR_MATCH_THRESHOLD` actually be?

**Nothing is trained here.** The spike loads an ImageNet-pretrained MobileNet v2,
takes the penultimate layer as a 1280-dimension feature vector, and measures how
well cosine similarity ranks same-animal pairs above different-animal pairs.
This is the same pipeline [`backend/src/services/imageRecognition.service.ts`](../../backend/src/services/imageRecognition.service.ts)
is built around — the spike just fills in the `EmbeddingProvider` that currently
throws.

## Setup

```bash
cd spike/image-recognition
npm install
```

`sharp` ships prebuilt Windows binaries, so there is no native build step. The
MobileNet weights (~17 MB) download on first run and need an internet connection.

## Smoke-test first

Before collecting photos, confirm the pipeline runs:

```bash
npm run demo-images
npm run spike -- --images ./demo-images --out ./results-demo
```

This generates synthetic coloured shapes. A good score here means **the code
works**, not that the approach works — shapes are far easier to separate than two
brown aspins.

## The real run

### Collecting photos

This is the part that takes actual effort, and it is the part that matters.

```
images/
  bruno/         bruno-1.jpg  bruno-2.jpg  bruno-3.jpg
  muning/        muning-1.jpg muning-2.jpg
  tiger/         ...
  _negatives/    any-dog.jpg  other-cat.jpg  ...
```

- **One folder per individual animal.** Every photo inside is the *same* animal.
- **A folder starting with `_`** is treated as "one distinct individual per
  file". Use it for negatives from a public dataset without pretending those
  photos are of the same animal.

You need **3–4 photos each of ~5 animals you can access** — friends' or family's
pets. Vary the angle, distance, and lighting, and take some on different days.
This is the one thing you cannot download: public datasets give you thousands of
dog photos but almost never several photos of the *same* dog, which is exactly
what a same-animal pair requires.

For negatives, the free **Oxford-IIIT Pet** dataset works well — grab ~30 images,
drop them in `_negatives/`.

Aim for realism, not quality. Blurry, badly lit, awkward-angle phone photos are
what people will actually upload. If the spike only works on clean photos, you
have learned something important.

### Run it

```bash
npm run spike -- --images ./images --out ./results
```

## Reading the results

| Metric | What it means |
|---|---|
| **ROC AUC** | Probability a random same-animal pair scores above a random different-animal pair. 0.5 = no signal, 1.0 = perfect. The single number to quote in the paper. |
| **Cohen's d** | How far apart the two distributions sit. >0.8 is a large effect. |
| **Top-1 retrieval** | How often the nearest neighbour is genuinely the same animal. This is the metric that matches the product: does the right candidate rank first? |
| **Top-3 retrieval** | Same, for the top 3 — closer to what the UI shows. |
| **Threshold sweep** | Precision/recall at each cutoff, so `IR_MATCH_THRESHOLD` comes from data instead of a guess. |

**Precision matters more than recall here.** A false match sends someone across
the city for the wrong dog and erodes trust in the app. A missed match is
recoverable — the report still appears in search, on the map, and in alerts.

### Verdicts

- **GO** (AUC ≥ 0.90, top-1 ≥ 0.70) — image similarity ranks well on its own.
  Use the recommended threshold; keep attributes and distance as tie-breakers.
- **MARGINAL** (AUC ≥ 0.75) — real signal, not decisive alone. Ship it as *one*
  input to the combined score alongside coat colour, size, markings, and
  distance. This is already how the SaanPaw UI presents matches, so nothing in
  the front-end changes.
- **NO-GO** — the distributions overlap too much to rank on the photo alone.
  Weight attributes and distance heavily, present image similarity as a weak
  hint, and say so plainly in the paper. Try a stronger embedding (CLIP) before
  concluding.

A MARGINAL or NO-GO result is **not a failed capstone**. It is a measured
finding about a hard problem, and reporting it honestly with the numbers behind
it is better work than claiming an accuracy you cannot reproduce.

## Output files

Written to `--out` (default `./results`):

| File | Use |
|---|---|
| `summary.json` | Every metric, the recommended threshold, and the verdict. |
| `pairs.csv` | Every pair with its similarity and whether it was the same animal. Chart the two distributions from this for Chapter 4. |
| `threshold-sweep.csv` | Precision/recall/F1 at each threshold. Makes a good precision-recall curve. |

## A caveat worth internalising

ImageNet embeddings are trained to answer *"what kind of thing is this?"*, not
*"which individual is this?"*. They are strong at breed, coat colour, and build,
and much weaker at telling two similar-looking animals of the same breed apart.

Expect the honest result to be that image similarity **narrows** dozens of
records to a handful, and a human confirms. That is a genuinely useful system,
and it is what the SaanPaw UI already presents — a confidence score, the reasons
behind it, and a prompt to contact the shelter to verify.
