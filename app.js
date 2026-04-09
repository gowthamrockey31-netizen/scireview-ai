// ============================================
// SciReview AI — Real-Time Gemini-Powered Engine
// ============================================

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// --- Navigation ---
function navigateTo(section) {
    $$('.section').forEach(s => s.classList.remove('active'));
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    $(`#section-${section}`).classList.add('active');
    $(`[data-section="${section}"]`).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
$$('.nav-btn').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.section)));
$('#btn-start-review').addEventListener('click', () => navigateTo('review'));
$('#btn-learn-more').addEventListener('click', () => $('#pipeline-section').scrollIntoView({ behavior: 'smooth' }));

// --- Toast ---
function showToast(type, title, msg) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">${icons[type]}</span><div class="toast-message"><strong>${title}</strong>${msg}</div>`;
    $('#toast-container').appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 4000);
}

// --- API Key ---
const apiKeyInput = $('#api-key-input');
apiKeyInput.value = localStorage.getItem('gemini_api_key') || '';

$('#btn-save-key').addEventListener('click', () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
    showToast('success', 'Key Saved', 'API key stored locally in your browser.');
});
$('#btn-toggle-key').addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
});

// --- Textarea ---
const textarea = $('#manuscript-input');
textarea.addEventListener('input', () => {
    $('#char-count').textContent = `${textarea.value.length.toLocaleString()} characters`;
});
$('#btn-clear').addEventListener('click', () => { textarea.value = ''; textarea.dispatchEvent(new Event('input')); });

// --- File Upload (Drag & Drop + Click) ---
const uploadZone = $('#upload-zone');
const fileInput = $('#file-input');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

$('#btn-remove-file').addEventListener('click', () => {
    $('#uploaded-file').classList.add('hidden');
    uploadZone.classList.remove('hidden');
    fileInput.value = '';
});

async function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const maxSize = 1000 * 1024 * 1024 * 1024; // 1000GB
    if (file.size > maxSize) { showToast('error', 'File Too Large', 'Maximum file size is 1000GB.'); return; }

    $('#file-name').textContent = file.name;
    $('#file-size').textContent = formatBytes(file.size);
    $('#uploaded-file').classList.remove('hidden');

    showToast('info', 'Processing', `Extracting text from "${file.name}"...`);

    try {
        let text = '';
        if (ext === 'pdf') {
            text = await extractPDFText(file);
        } else if (['txt', 'md', 'tex'].includes(ext)) {
            text = await file.text();
        } else if (['doc', 'docx'].includes(ext)) {
            text = await extractDocxText(file);
        } else {
            text = await file.text();
        }

        if (text.trim().length > 0) {
            textarea.value = text;
            textarea.dispatchEvent(new Event('input'));
            showToast('success', 'Text Extracted', `${text.length.toLocaleString()} characters extracted from "${file.name}".`);
        } else {
            showToast('warning', 'No Text Found', 'Could not extract text. Try pasting the content manually.');
        }
    } catch (err) {
        console.error(err);
        showToast('error', 'Extraction Failed', err.message || 'Could not read the file.');
    }
}

// --- PDF Text Extraction using PDF.js ---
async function extractPDFText(file) {
    const pdfjsLib = await loadPDFJS();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }
    return fullText.trim();
}

function loadPDFJS() {
    return new Promise((resolve, reject) => {
        if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        script.onerror = () => reject(new Error('Failed to load PDF.js'));
        document.head.appendChild(script);
    });
}

// --- DOCX Text Extraction (basic) ---
async function extractDocxText(file) {
    // DOCX is a zip file. We parse the XML inside.
    const JSZip = await loadJSZip();
    const zip = await JSZip.loadAsync(file);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) throw new Error('Invalid DOCX file');
    const xmlStr = await xmlFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, 'application/xml');
    const texts = doc.getElementsByTagName('w:t');
    let result = '';
    for (const t of texts) result += t.textContent;
    return result;
}

function loadJSZip() {
    return new Promise((resolve, reject) => {
        if (window.JSZip) { resolve(window.JSZip); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error('Failed to load JSZip'));
        document.head.appendChild(script);
    });
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// --- Sample Manuscript ---
$('#btn-sample').addEventListener('click', () => {
    textarea.value = SAMPLE_MANUSCRIPT;
    textarea.dispatchEvent(new Event('input'));
    showToast('info', 'Sample Loaded', 'A sample clinical manuscript has been loaded.');
});

// --- Gemini AI Integration ---

async function callGeminiAI(prompt, apiKey, modelName, retries = 3) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${url}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                const errMsg = err.error?.message || `API Error: ${response.status}`;
                
                // If it's a 503 High Demand error, or 429 rate limit, retry
                if ((response.status === 503 || response.status === 429) && i < retries - 1) {
                    $('#stream-model').textContent = `Retrying in 3s... (High demand)`;
                    await new Promise(r => setTimeout(r, 3000 * (i + 1))); // exponential backoff
                    continue; // try again
                }
                throw new Error(errMsg);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
        } catch (err) {
            // Throw error if we've exhausted retries, else swallow and loop
            if (i === retries - 1) throw err;
        }
    }
}

// --- Build Prompts ---
function getSystemContext(domain) {
    const domainDetails = {
        general: 'a general scientific journal with broad scope',
        clinical: 'a top-tier clinical/medical journal (e.g., NEJM, Lancet) with strict CONSORT/STROBE adherence',
        'ai-ml': 'a premier AI/ML venue (e.g., NeurIPS, ICML) focusing on novelty, reproducibility, and ablation studies',
        physics: 'a high-impact physics journal (e.g., Physical Review Letters) emphasizing mathematical rigor',
        biology: 'a leading biology journal (e.g., Nature, Cell) emphasizing experimental design and controls',
        chemistry: 'a top chemistry journal (e.g., JACS) focusing on characterization and mechanistic insight',
        engineering: 'a premier engineering journal (e.g., IEEE Transactions) emphasizing practical validation',
        'social-science': 'a top social science journal (e.g., PNAS) emphasizing study design and effect sizes'
    };
    return domainDetails[domain] || domainDetails.general;
}

function stripMetadata(text) {
    // Layer 2: Blind Scrutiny — strip author names, emails, affiliations
    let cleaned = text;
    // Remove email addresses
    cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]');
    // Remove common affiliation patterns
    cleaned = cleaned.replace(/(?:University|Institute|College|Department|School|Laboratory|Centre|Center)\s+of\s+[A-Z][^\n,;]*/gi, '[INSTITUTION_REDACTED]');
    // Remove "Author:" or "Authors:" lines
    cleaned = cleaned.replace(/^(?:Authors?|Corresponding\s+Author|Affiliation|Contact)\s*:.*$/gim, '[METADATA_REDACTED]');
    return cleaned;
}

function buildScrutinizerPrompt(text, domain, opts) {
    const manuscript = opts.blind ? stripMetadata(text) : text;
    return `SYSTEM ROLE: You are "The Scrutinizer" — a Senior Academic Reviewer conducting Layer 1 analysis for ${getSystemContext(domain)}.

ANONYMIZATION PROTOCOL: This manuscript is designated as "Anonymous Submission #001". You must strictly ignore all author names, institutional affiliations, and biographical data. Your analysis must be grounded exclusively in the data and logic presented.

TASK: Perform a bias-free methodological audit. Extract and critically analyze the Methods and Results sections.

MANDATORY ANALYSIS STEPS:
1. **Research Design Extraction**: List every mathematical assumption, data collection step, and experimental procedure found.
2. **Hypothesis-Design Alignment**: Evaluate if the research design directly tests the stated hypothesis. Flag misalignments.
3. **Bias Detection**: Systematically check for:
   - Selection bias (non-random sampling, exclusion criteria issues)
   - Confirmation bias (cherry-picked results)
   - Survivorship bias (dropout/attrition not accounted for)
   - Measurement bias (unreliable instruments, subjective scoring)
4. **Sample Size Assessment**: Is the sample sufficient for the conclusions drawn? Is a power analysis provided?
5. **Reproducibility Check**: Are the methods described clearly enough for another scientist to replicate step-by-step?
6. **OCR-Parsed Data Scrutiny**: Pay special attention to any tables, figures, or formulas. Flag any discrepancies where text descriptions of results contradict data found in tables.

CITATION ENFORCEMENT RULE: For every flaw identified, you MUST use this format:
[Flaw Description] -- Evidence: "Direct quote from the paper"

If you cannot find a direct quote to support a criticism, state: "No supporting text found — this is an inference."

Format your response with clear headers (##) and bullet points.

MANUSCRIPT (Anonymous Submission #001):
${manuscript.substring(0, 15000)}`;
}

function buildStatisticianPrompt(text, scrutinizerResult, domain, opts) {
    const manuscript = opts.blind ? stripMetadata(text) : text;
    return `SYSTEM ROLE: You are "The Statistician" — a Senior Biostatistician conducting Layer 2 high-precision data validation for ${getSystemContext(domain)}.

ANONYMIZATION: This is "Anonymous Submission #001". Ignore all author metadata.

PREVIOUS ANALYSIS (from The Scrutinizer):
${scrutinizerResult.substring(0, 4000)}

TASK: Perform a High-Precision Data & Statistics Check.

MANDATORY ANALYSIS STEPS:
1. **Statistical Test Appropriateness**: Verify if each statistical test (P-values, T-tests, ANOVA, chi-square, regression, etc.) matches the data type and study design (parametric vs non-parametric, paired vs independent).
2. **Control Group Validation**: Identify missing control groups or baseline comparisons.
3. **P-Hacking Scan**: Look for indicators of p-hacking:
   - Multiple comparisons without correction (Bonferroni, FDR, Holm)
   - Selective reporting of only significant results
   - Unusual p-value distributions (e.g., p = 0.049)
   - Post-hoc hypothesis generation disguised as a priori
4. **Effect Size & CI Reporting**: Are effect sizes (Cohen's d, η², odds ratios) and confidence intervals reported alongside p-values?
5. **Error Bar & SD Realism**: Are the standard deviations realistic for the data range? Do error bars overlap in ways that contradict significance claims?
6. **Statistical Power**: Is sample size justified with a power analysis? Is it sufficient for the claimed effect size?
7. **Table-Text Discrepancy Check**: Cross-reference ALL numerical claims in the text against any data tables. Flag contradictions.

CITATION ENFORCEMENT: Every observation must include a direct quote:
[Finding] -- Evidence: "Direct quote from paper"

Rate overall statistical rigor: **Excellent / Good / Adequate / Weak / Insufficient**

MANUSCRIPT (Anonymous Submission #001):
${manuscript.substring(0, 15000)}`;
}

function buildEditorPrompt(text, scrutinizerResult, statisticianResult, domain, opts) {
    const manuscript = opts.blind ? stripMetadata(text) : text;
    return `SYSTEM ROLE: You are "The Editor" — a Senior Peer Reviewer compiling the final Layer 3 review for ${getSystemContext(domain)}.

ANONYMIZATION: This is "Anonymous Submission #001". Conduct a fully double-blind review.

PREVIOUS ANALYSES:
--- Scrutinizer (Methodological Audit) ---
${scrutinizerResult.substring(0, 3500)}

--- Statistician (Data Validation) ---
${statisticianResult.substring(0, 3500)}

TASK: Compile a comprehensive, formal Peer Review Report using the analyses above.

VALIDATION RULE (Layer 3 — Citation Enforcement): You MUST NOT identify any "Missing Factor" or flaw without providing a "Direct Quote" from the manuscript showing where that factor should have been. If no quote exists, explicitly state this is an inference.

USE THIS EXACT OUTPUT FORMAT:

# Peer Review Report — Anonymous Submission #001

## Executive Summary
Overall contribution, novelty assessment, and significance to the field (2-3 paragraphs).

## Major Strengths
Highlight innovative aspects and what the authors did exceptionally well (numbered list).

## Major Revisions Required (Hallucination-Proofed)
For EACH critical issue, use this exact structure:

### Issue [Letter]: [Issue Title]
- **Problem**: Clear description of the flaw.
- **Direct Quote**: "[Exact quote from the manuscript]"
- **Constructive Fix**: Suggest exactly how to re-run the test, re-analyze the data, or re-word the claim.

## Minor Revisions
Language, citations, formatting, and presentation improvements (bulleted list).

## Methodological Assessment
Summary of research design quality, reproducibility score, and bias risk.

## Statistical Assessment
Summary of statistical rigor, data interpretation quality, and power adequacy.

## Final Decision
Choose ONE: **Accept** / **Minor Revision** / **Major Revision** / **Reject**
Provide a 3-4 sentence justification grounded in the evidence above.

---
CRITICAL RULES:
- Be constructive: for every problem, suggest a specific, actionable fix.
- Use professional academic language throughout.
- Every criticism MUST be backed by a direct quote from the manuscript.
- Do NOT hallucinate findings that aren't in the text.
${opts.detailed ? '- Include an APPENDIX with line-by-line detailed critique at the end.' : ''}

MANUSCRIPT (Anonymous Submission #001):
${manuscript.substring(0, 12000)}`;
}

// --- Main Analysis Pipeline ---
$('#btn-analyze').addEventListener('click', startAnalysis);

async function startAnalysis() {
    const text = textarea.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (text.length < 100) {
        showToast('warning', 'Need More Text', 'Please provide at least 100 characters of manuscript.');
        return;
    }
    if (!apiKey) {
        showToast('error', 'API Key Required', 'Enter your free Gemini API key to enable AI analysis.');
        return;
    }

    const domain = $('#journal-standards').value;
    const modelSelect = $('#model-select');
    const modelName = modelSelect ? modelSelect.value : 'gemini-2.5-flash';
    
    const opts = {
        blind: $('#opt-blind').checked,
        quotes: $('#opt-quotes').checked,
        detailed: $('#opt-detailed').checked
    };

    // Switch to report view
    navigateTo('report');
    $('#final-report').classList.add('hidden');
    $('#analysis-progress').style.display = '';
    $('#ai-stream-panel').style.display = '';
    $('#stream-model').textContent = modelSelect ? modelSelect.options[modelSelect.selectedIndex].text.split('(')[0] : 'Gemini 2.5 Flash';
    $('#stream-content').innerHTML = '<span style="color:var(--text-muted)">Initializing AI pipeline...</span>';
    resetProgress();
    updateStatus('Analyzing', true);

    try {
        // === BLOCK 1: Scrutinizer ===
        setStep(1, 'active', 'AI analyzing methodology...');
        updateProgress(5);
        addStreamBlock('scrutinizer', '🔍 The Scrutinizer', 'Analyzing methodology and research design...');

        const scrutinizerResult = await callGeminiAI(
            buildScrutinizerPrompt(text, domain, opts), apiKey, modelName
        );
        updateStreamBlock(0, scrutinizerResult);
        setStep(1, 'completed', 'Complete ✓');
        updateProgress(33);

        // === BLOCK 2: Statistician ===
        setStep(2, 'active', 'AI validating statistics...');
        addStreamBlock('statistician', '📊 The Statistician', 'Validating statistical methods...');

        const statisticianResult = await callGeminiAI(
            buildStatisticianPrompt(text, scrutinizerResult, domain, opts), apiKey, modelName
        );
        updateStreamBlock(1, statisticianResult);
        setStep(2, 'completed', 'Complete ✓');
        updateProgress(66);

        // === BLOCK 3: Editor ===
        setStep(3, 'active', 'AI compiling report...');
        addStreamBlock('editor', '📝 The Editor', 'Compiling peer review report...');

        const editorResult = await callGeminiAI(
            buildEditorPrompt(text, scrutinizerResult, statisticianResult, domain, opts), apiKey, modelName
        );
        updateStreamBlock(2, editorResult);
        setStep(3, 'completed', 'Complete ✓');
        updateProgress(100);

        // === Render Final Report ===
        updateStatus('Complete', false);
        showToast('success', 'Review Complete', 'Your AI peer review report is ready.');
        renderReport(editorResult, domain);

    } catch (err) {
        console.error(err);
        updateStatus('Error', false);
        showToast('error', 'Analysis Failed', err.message);
        $('.status-dot').style.background = 'var(--danger)';
    }
}

// --- Progress UI Helpers ---
function resetProgress() {
    [1, 2, 3].forEach(n => { $(`#step-${n}`).className = 'progress-step'; $(`#step-${n}-status`).textContent = 'Waiting...'; });
    updateProgress(0);
}
function setStep(n, state, text) {
    $(`#step-${n}`).className = `progress-step ${state}`;
    $(`#step-${n}-status`).textContent = text;
}
function updateProgress(pct) {
    $('#progress-bar-fill').style.width = pct + '%';
    $('#progress-percent').textContent = pct + '%';
}
function updateStatus(text, analyzing) {
    $('.status-text').textContent = text;
    $('.status-dot').style.background = analyzing ? 'var(--warning)' : 'var(--success)';
    $('.status-dot').style.boxShadow = analyzing ? '0 0 8px rgba(245,158,11,0.5)' : '0 0 8px rgba(34,197,94,0.5)';
}

// --- Stream Panel ---
function addStreamBlock(type, title, placeholder) {
    const block = document.createElement('div');
    block.className = 'stream-block';
    block.innerHTML = `<div class="stream-block-label ${type}">${title}</div><div class="stream-text">${placeholder}<span class="typing-cursor"></span></div>`;
    $('#stream-content').appendChild(block);
    scrollStreamToBottom();
}
function updateStreamBlock(index, text) {
    const blocks = $$('.stream-block');
    if (blocks[index]) {
        blocks[index].querySelector('.stream-text').innerHTML = escapeHtml(text).substring(0, 2000) + (text.length > 2000 ? '\n\n[... see full report below]' : '');
    }
    scrollStreamToBottom();
}
function scrollStreamToBottom() {
    const el = $('#stream-content');
    el.scrollTop = el.scrollHeight;
}

// --- Render Final Report ---
function renderReport(markdown, domain) {
    const domainLabels = {
        general: 'General', clinical: 'Clinical/Medical', 'ai-ml': 'AI/ML',
        physics: 'Physics', biology: 'Biology', chemistry: 'Chemistry',
        engineering: 'Engineering', 'social-science': 'Social Sciences'
    };

    $('#final-report').classList.remove('hidden');
    $('#report-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    $('#report-domain').textContent = domainLabels[domain] || 'General';
    $('#report-body').innerHTML = markdownToHtml(markdown);
}

// --- Markdown to HTML (lightweight) ---
function markdownToHtml(md) {
    let html = escapeHtml(md);
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    // Code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    // Unordered lists
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    // Cleanup
    html = html.replace(/<p><(h[1-3]|ul|ol|blockquote|hr)/g, '<$1');
    html = html.replace(/<\/(h[1-3]|ul|ol|blockquote)><\/p>/g, '</$1>');
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<hr><\/p>/g, '<hr>');
    return html;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Report Actions ---
$('#btn-new-review').addEventListener('click', () => navigateTo('review'));
$('#btn-copy-report').addEventListener('click', () => {
    const text = $('#report-body').innerText;
    navigator.clipboard.writeText(text).then(() => showToast('success', 'Copied', 'Report copied to clipboard.'));
});
$('#btn-export').addEventListener('click', () => {
    const text = $('#report-body').innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SciReview_Report_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    showToast('success', 'Exported', 'Report downloaded.');
});

// --- Sample Manuscript ---
const SAMPLE_MANUSCRIPT = `Title: The Effect of Mindfulness-Based Stress Reduction on Cortisol Levels in University Students During Examination Periods

Abstract:
This study investigates the impact of an 8-week Mindfulness-Based Stress Reduction (MBSR) program on salivary cortisol levels among university students (n=120) during final examination periods. Using a randomized controlled trial design, participants were assigned to either the MBSR intervention group (n=60) or a wait-list control group (n=60). Salivary cortisol samples were collected at baseline, mid-intervention (week 4), and post-intervention (week 8). The MBSR group showed significantly lower cortisol levels post-intervention compared to the control group (p < 0.01, Cohen's d = 0.74). These findings suggest that MBSR may serve as an effective intervention for managing examination-related stress in university populations.

Introduction:
Academic stress is a well-documented phenomenon affecting university students worldwide (Beiter et al., 2015). During examination periods, students frequently report elevated anxiety, sleep disturbances, and cognitive impairments. The hypothalamic-pituitary-adrenal (HPA) axis plays a central role in the physiological stress response, with cortisol serving as the primary biomarker for stress activation (Hellhammer et al., 2009).

Our hypothesis is that students participating in an 8-week MBSR program will demonstrate significantly reduced salivary cortisol levels compared to a wait-list control group.

Methods:
Participants: 120 undergraduate students (68 female, 52 male; mean age = 21.3 ± 2.1 years) were recruited from three universities. Inclusion criteria: enrolled full-time, no current psychiatric medication, no prior meditation experience.

Design: Randomized controlled trial with parallel groups. Randomization was performed using computer-generated random sequences (block size = 4). Allocation was concealed using sealed opaque envelopes.

Intervention: The MBSR group received 8 weekly 2.5-hour sessions following the standardized Kabat-Zinn protocol, including body scan meditation, sitting meditation, and gentle yoga.

Cortisol Collection: Salivary cortisol was collected using Salivette devices at three time points: baseline (week 0), mid-point (week 4), and endpoint (week 8). All samples were collected between 8:00-9:00 AM to control for circadian variation.

Statistical Analysis: A repeated-measures ANOVA (2 groups × 3 time points) was used. Post-hoc pairwise comparisons used Bonferroni correction. Effect sizes were calculated using Cohen's d. Power analysis indicated n=52 per group for 80% power to detect d=0.50.

Results:
Baseline cortisol levels did not differ significantly between groups (MBSR: M = 15.2 nmol/L, SD = 4.1; Control: M = 14.8 nmol/L, SD = 3.9; t(118) = 0.55, p = 0.58). The repeated-measures ANOVA revealed a significant Group × Time interaction (F(2, 236) = 8.94, p < 0.001, partial η² = 0.07). Post-hoc analyses showed that at week 8, the MBSR group had significantly lower cortisol (M = 10.3 nmol/L, SD = 3.2) compared to the control group (M = 14.1 nmol/L, SD = 4.0; p < 0.01, d = 0.74). Dropout rate was 8.3% (n=10).

Discussion:
Our findings support the hypothesis that MBSR effectively reduces cortisol levels during high-stress academic periods. The effect size (d = 0.74) is consistent with meta-analytic findings (Pascoe et al., 2017).

Limitations: Wait-list control cannot account for non-specific factors. Single morning cortisol measurement. Sample limited to undergraduates.

References:
Beiter, R., et al. (2015). Journal of Affective Disorders, 173, 90-96.
Hellhammer, D., et al. (2009). Psychoneuroendocrinology, 34(2), 163-171.
Kabat-Zinn, J. (1990). Full Catastrophe Living. Delacorte Press.
Pascoe, M., et al. (2017). Journal of Psychiatric Research, 95, 156-178.

Ethics: Approved by IRB (Protocol #2024-0892). All participants provided written informed consent.`;
