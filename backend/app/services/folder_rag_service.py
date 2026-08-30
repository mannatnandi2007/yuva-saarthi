# YUVAA Saarthi — Folder-Based RAG Document Ingestion & MiniLM Retriever
# Automatically scans the 'docs/rag_documents/' folder (and 'docs/').
# Supports .txt, .md, and .docx files (e.g. docs/Research.docx).
# Uses 'all-MiniLM-L6-v2' sentence-transformers for embedding & cosine similarity search,
# with instant TF-IDF token overlap fallback if MiniLM is loading or offline.

import os
import re
import glob
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Base paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
RAG_DOCS_DIR = os.path.join(PROJECT_ROOT, "docs", "rag_documents")
DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")

# Global in-memory cache for chunks and embeddings to ensure sub-millisecond query speed
_CHUNK_CACHE: List[Dict[str, Any]] = []
_EMBEDDINGS_CACHE = None
_MINILM_MODEL = None
_MODEL_TRIED = False


# ---------------------------------------------------------------------------
# 1. File Readers & Text Extraction
# ---------------------------------------------------------------------------

def extract_text_from_file(file_path: str) -> str:
    """Extract plain text from .txt, .md, or .docx file."""
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    if ext in (".txt", ".md"):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            logger.warning("Could not read text file %s: %s", file_path, e)

    elif ext == ".docx":
        try:
            import docx
            doc = docx.Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            text = "\n".join(paragraphs)
        except Exception as e:
            logger.warning("Could not read Word document %s: %s", file_path, e)

    return text.strip()


# ---------------------------------------------------------------------------
# 2. Text Chunker
# ---------------------------------------------------------------------------

def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 100) -> List[str]:
    """
    Split text into overlapping chunks of approximately chunk_size characters,
    splitting cleanly on paragraph breaks or sentence boundaries.
    """
    if not text:
        return []

    # First split into paragraphs
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    current_chunk = ""

    for p in paragraphs:
        if len(current_chunk) + len(p) + 1 <= chunk_size:
            current_chunk = f"{current_chunk}\n{p}".strip() if current_chunk else p
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # If paragraph itself exceeds chunk_size, split by sentences
            if len(p) > chunk_size:
                sentences = re.split(r"(?<=[.?!])\s+", p)
                sub_chunk = ""
                for s in sentences:
                    if len(sub_chunk) + len(s) + 1 <= chunk_size:
                        sub_chunk = f"{sub_chunk} {s}".strip() if sub_chunk else s
                    else:
                        if sub_chunk:
                            chunks.append(sub_chunk)
                        sub_chunk = s
                if sub_chunk:
                    current_chunk = sub_chunk
            else:
                current_chunk = p

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


# ---------------------------------------------------------------------------
# 3. Folder Scanner & Indexer
# ---------------------------------------------------------------------------

def scan_and_chunk_folder(target_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Scan target folder (defaults to docs/rag_documents/ and docs/) for .txt, .md, and .docx files.
    Extracts text and chunks them.
    """
    search_dirs = []
    if target_dir and os.path.exists(target_dir):
        search_dirs.append(target_dir)
    else:
        if os.path.exists(RAG_DOCS_DIR):
            search_dirs.append(RAG_DOCS_DIR)
        if os.path.exists(DOCS_DIR):
            search_dirs.append(DOCS_DIR)

    all_chunks = []
    seen_files = set()

    for directory in search_dirs:
        for pattern in ("*.txt", "*.md", "*.docx"):
            for file_path in glob.glob(os.path.join(directory, pattern)):
                # Avoid duplicates and ignore test cases / readmes if needed
                fname = os.path.basename(file_path)
                if fname in seen_files or fname.lower() in ("testcases.docx", "readme.md", "prompt.txt"):
                    continue
                seen_files.add(fname)

                raw_text = extract_text_from_file(file_path)
                if not raw_text:
                    continue

                text_chunks = chunk_text(raw_text, chunk_size=500, chunk_overlap=100)
                for idx, chunk_str in enumerate(text_chunks):
                    all_chunks.append({
                        "id": f"{fname}-chunk-{idx + 1}",
                        "source": fname,
                        "title": f"{fname} (Section {idx + 1})",
                        "chunk_text": chunk_str,
                    })

    logger.info("[FOLDER RAG] Scanned %d files, generated %d chunks.", len(seen_files), len(all_chunks))
    return all_chunks


# ---------------------------------------------------------------------------
# 4. MiniLM Model Loader & Vector Search
# ---------------------------------------------------------------------------

def _get_minilm_model():
    """Lazy load all-MiniLM-L6-v2 sentence transformer model."""
    global _MINILM_MODEL, _MODEL_TRIED
    if _MINILM_MODEL is not None:
        return _MINILM_MODEL
    if _MODEL_TRIED:
        return None

    _MODEL_TRIED = True
    try:
        from sentence_transformers import SentenceTransformer
        logger.info("[MINILM] Loading all-MiniLM-L6-v2 sentence embedding model...")
        _MINILM_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("[MINILM] Model loaded successfully.")
        return _MINILM_MODEL
    except Exception as e:
        logger.warning("[MINILM] SentenceTransformer not available (%s). Using lexical similarity fallback.", e)
        return None


def search_folder_rag(query_text: str, limit: int = 2) -> List[Dict[str, Any]]:
    """
    Search the document chunks using all-MiniLM-L6-v2 semantic cosine similarity.
    Falls back gracefully to keyword overlap if MiniLM is not installed.
    """
    global _CHUNK_CACHE, _EMBEDDINGS_CACHE

    # Ensure chunks are loaded
    if not _CHUNK_CACHE:
        _CHUNK_CACHE = scan_and_chunk_folder()

    if not _CHUNK_CACHE:
        return []

    model = _get_minilm_model()

    # --- Path A: MiniLM Dense Vector Embeddings ---
    if model is not None:
        try:
            import numpy as np

            # Compute and cache chunk embeddings once
            if _EMBEDDINGS_CACHE is None:
                texts = [c["chunk_text"] for c in _CHUNK_CACHE]
                _EMBEDDINGS_CACHE = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

            # Embed query
            query_emb = model.encode([query_text], convert_to_numpy=True, normalize_embeddings=True)[0]

            # Cosine similarities (dot product since normalized)
            scores = np.dot(_EMBEDDINGS_CACHE, query_emb)
            top_indices = np.argsort(scores)[::-1][:limit]

            results = []
            for idx in top_indices:
                chunk = dict(_CHUNK_CACHE[idx])
                chunk["score"] = float(scores[idx])
                results.append(chunk)

            logger.debug("[MINILM RAG] Retrieved %d chunks with MiniLM vector similarity.", len(results))
            return results
        except Exception as e:
            logger.warning("[MINILM RAG] Dense search failed (%s), falling back to lexical.", e)

    # --- Path B: Fast Lexical / Token Overlap Fallback ---
    query_tokens = set(re.findall(r"\b\w+\b", query_text.lower()))
    scored_chunks = []

    for c in _CHUNK_CACHE:
        chunk_tokens = set(re.findall(r"\b\w+\b", c["chunk_text"].lower()))
        overlap = query_tokens & chunk_tokens
        if overlap:
            score = len(overlap) / (len(query_tokens) + 1e-5)
            scored_chunks.append((score, c))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored_chunks[:limit]]


def refresh_folder_rag():
    """Clear chunk and embedding caches to re-index any newly added files in the folder."""
    global _CHUNK_CACHE, _EMBEDDINGS_CACHE
    _CHUNK_CACHE = []
    _EMBEDDINGS_CACHE = None
    logger.info("[FOLDER RAG] Cache invalidated. Will re-scan on next query.")
