# Open-source AI components used by Reels Maker

This file documents the open-source AI and media components exposed by the in-app **AI Toolbox**. Keep this file with the project when redistributing the application.

## Browser-side tools

- **Transformers.js** — https://github.com/huggingface/transformers.js — Apache-2.0. Used for optional on-device image captioning. Models are downloaded lazily only when the user opens that tool; each model can have its own upstream model license.
- **Tesseract.js** — https://github.com/naptha/tesseract.js — Apache-2.0. Used for Arabic + English OCR in the browser.
- **IMG.LY background-removal-js** — https://github.com/imgly/background-removal-js — AGPL-3.0. Used for optional in-browser background removal. The project source is public; preserve the upstream copyright/license notices and review AGPL obligations before changing distribution terms.

## Cloudflare-hosted open/open-weight models used by the toolbox

- **Whisper / Whisper Large V3 Turbo** — speech-to-text. Reels Maker calls the model through the existing Workers AI binding; audio is used for transcription and the returned transcript is shown in the toolbox.
- **FLUX** — image generation. The current story/image pipeline prefers the reference-capable FLUX route configured in `worker-mobile-v16-ai.js`, then falls back to FLUX.1 Schnell and SDXL Lightning.
- **ResNet-50** — quick image classification.
- **Qwen** — vision/text and embeddings where available through Workers AI.
- **Llama / GLM** — text helpers and fallback generation models where available through Workers AI.

Cloudflare hosting does not replace the upstream model license. Check the current model card/license before commercial redistribution or changing providers.

## GPU-only projects researched for future connectors

These are useful but are **not falsely presented as locally running inside Cloudflare Workers**, because they need a Python/GPU backend. Adapter environment variables can be connected later without redesigning the UI:

- StoryDiffusion — consistent story characters / sequential storytelling.
- Qwen-Image — high-quality image generation/editing.
- Wan — text/image-to-video generation.
- LTX-Video — image/text-to-video workflows.
- CogVideoX — open video-generation pipeline.
- VoiceStudio — self-hosted voice cloning/design and OpenAI-compatible speech API.

## Privacy / loading behavior

Browser tools are lazy-loaded to keep the mobile app light. OCR, background removal, and local Transformers.js inference run in the browser after the required model assets are downloaded. Server-backed Workers AI tools send only the input needed for that selected operation.
