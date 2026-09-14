# Open-source AI components used by Reels Maker

This file documents the open-source AI and media components exposed by the in-app AI menus. The detailed machine-readable list is in `ai-open-source-catalog-v19.json`.

## Runs now inside Reels Maker

- **Transformers.js** — https://github.com/huggingface/transformers.js — Apache-2.0. On-device image captioning and object detection.
- **WebLLM** — https://github.com/mlc-ai/web-llm — Apache-2.0. Optional local LLM in the browser through WebGPU; models download only after the user starts the tool.
- **MediaPipe** — https://github.com/google-ai-edge/mediapipe — Apache-2.0. Face, pose and hand landmark tools in the browser.
- **Tesseract.js** — https://github.com/naptha/tesseract.js — Apache-2.0. Arabic + English OCR in the browser.
- **UpscalerJS** — https://github.com/thekevinscott/UpscalerJS — MIT. Browser-side image upscaling/enhancement.
- **IMG.LY background-removal-js** — https://github.com/imgly/background-removal-js — AGPL-3.0. Browser-side background removal; preserve license/source obligations.
- **Whisper / Whisper Large V3 Turbo** — https://github.com/openai/whisper — MIT upstream. Speech-to-text through the existing Workers AI binding.
- **FLUX route** — story and standalone image generation use the existing Workers AI image pipeline, with reference-aware generation where the provider supports it and fallbacks already defined in the worker chain.
- **Qwen / Llama / GLM / ResNet / embedding models** — text, vision, classification and semantic helper routes already exposed by the Workers AI backend.

## Separate menu sections in v19

The old single “AI Toolbox” menu entry is replaced by direct entries for Writer AI, Local AI, Text Similarity, Image Generator, Image Understanding, OCR, Background Removal, Local Image Captioning, Object Detection, Image Upscaling, Face Landmarks, Pose Landmarks, Hand Landmarks, Speech-to-Text, Open Voice AI, Audio/Music AI, Video Generation AI, Avatar/Lip-sync AI, and the Open Source Library.

## GPU/backend connectors researched and listed in the site

These projects are useful but are not falsely presented as running inside Cloudflare Workers. They need a GPU/local/Docker backend before generation buttons can be truly active.

- **StoryDiffusion** — https://github.com/HVision-NKU/StoryDiffusion — Apache-2.0 — consistent long-range story characters.
- **Qwen-Image** — https://github.com/QwenLM/Qwen-Image — check current model card/license before production.
- **ComfyUI** — https://github.com/comfy-org/ComfyUI — GPL-3.0 — workflow/API host for many image/video models.
- **Wan2.2** — https://github.com/Wan-Video/Wan2.2 — Apache-2.0 — text/image-to-video.
- **LTX-Video** — https://github.com/Lightricks/LTX-Video — Apache-2.0 — open video generation family.
- **CogVideoX** — https://github.com/zai-org/CogVideo — custom model license; commercial use follows its current registration/license terms.
- **MuseTalk** — https://github.com/TMElyralab/MuseTalk — MIT code; dependency licenses still apply — lip sync.
- **LivePortrait** — https://github.com/KlingAIResearch/LivePortrait — MIT code, but the default InsightFace detection models have non-commercial restrictions; replace them before unrestricted commercial use.
- **Chatterbox** — https://github.com/resemble-ai/chatterbox — MIT — multilingual TTS/voice cloning, including Arabic.
- **VoiceStudio** — https://github.com/debpalash/VoiceStudio — AGPL-3.0 — multi-engine TTS and OpenAI-compatible API.
- **Demucs** — https://github.com/facebookresearch/demucs — MIT — stem/source separation; upstream repository is archived but usable.
- **AudioCraft / MusicGen** — https://github.com/facebookresearch/audiocraft — MIT code; released MusicGen weights are CC-BY-NC-4.0, so do not treat those weights as unrestricted commercial assets.
- **SAM 2** — https://github.com/facebookresearch/sam2 — Apache-2.0 — image/video segmentation.
- **GroundingDINO** — https://github.com/IDEA-Research/GroundingDINO — Apache-2.0 — open-set object detection.
- **llama.cpp** — https://github.com/ggml-org/llama.cpp — MIT — future GGUF local backend option.
- **ONNX Runtime Web** — https://github.com/microsoft/onnxruntime — MIT — browser inference runtime.
- **ffmpeg.wasm** — https://github.com/ffmpegwasm/ffmpeg.wasm — MIT — browser-side audio/video conversion utility.

## Loading, privacy and licenses

Heavy browser models are lazy-loaded only when the related tool is started. Local tools keep the selected file/text in the browser after model assets are downloaded; Workers AI tools send only the input required by the selected operation. “Open source” does not automatically mean every model weight has the same license as its code, so keep checking the exact upstream model card before commercial deployment.
