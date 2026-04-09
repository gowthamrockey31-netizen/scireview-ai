# 🔬 SciReview AI — Scientific Peer Review Engine

AI-powered scientific manuscript peer review system with real-time **Google Gemini AI** analysis, PDF/DOCX upload, and a rigorous 3-layer evaluation pipeline.

![SciReview AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Status](https://img.shields.io/badge/status-Live-brightgreen)

## ✨ Features

- 🤖 **Real-Time AI Analysis** — Powered by Google Gemini 2.0 Flash (free tier)
- 📄 **Multi-Format Upload** — PDF, DOCX, TXT, MD, TEX with drag & drop
- 🛡️ **Double-Blind Mode** — Strips author metadata for zero-bias review
- 📊 **Statistical Validation** — P-hacking scan, effect size checks, power analysis
- 📝 **Hallucination-Proofed** — Every criticism requires a direct quote from the paper
- 🎯 **8 Journal Domains** — Clinical, AI/ML, Physics, Biology, Chemistry, Engineering & more

## 🏗️ 3-Layer Architecture

| Layer | Component | Function |
|-------|-----------|----------|
| Layer 1 | **OCR Parser** | PDF.js extracts text from PDFs including tables and formulas |
| Layer 2 | **Blind Scrutiny** | Strips all metadata, processes as "Anonymous Submission #001" |
| Layer 3 | **Citation Enforcement** | Every flaw must include a direct quote from the manuscript |

## 🚀 Quick Start

1. Visit the [live site](https://YOUR_USERNAME.github.io/scireview-ai/)
2. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
3. Upload a PDF or paste manuscript text
4. Click **"Begin AI Analysis"**

## 🔧 Local Setup

Just open `index.html` in any browser — no build tools or server needed.

## 📋 Review Output Format

```
📋 Executive Summary → Contribution & novelty
💪 Major Strengths → What authors did well
🚨 Major Revisions (Hallucination-Proofed) →
   Issue → Direct Quote → Constructive Fix
📎 Minor Revisions → Language, citations
⚖️ Final Decision → Accept / Revision / Reject
```

## 🔒 Privacy

- API key stored **locally** in your browser (localStorage)
- No backend server — runs entirely client-side
- Manuscript text sent only to Google's Gemini API

## 📄 License

MIT License — free for personal and commercial use.
