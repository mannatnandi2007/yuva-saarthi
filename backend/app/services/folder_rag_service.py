# YUVAA Saarthi - Folder-Based RAG Document Ingestion & MiniLM Retriever
#
# Pipeline:
# PDF / TXT / MD / DOCX
#        ↓
# Text extraction
#        ↓
# Chunking
#        ↓
# all-MiniLM-L6-v2
#        ↓
# 384-dimensional embeddings
#        ↓
# Supabase rag_documents table
#
# Also provides in-memory MiniLM retrieval for fast local search.

import os
import re
import glob
import logging
from typing import List, Dict, Any, Optional

import numpy as np

from app.supabase_client import supabase

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. Paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../")
)

RAG_DOCS_DIR = os.path.join(PROJECT_ROOT, "docs", "rag_documents")
DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")


# ---------------------------------------------------------------------------
# 2. MiniLM configuration
# ---------------------------------------------------------------------------

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

_MINILM_MODEL = None
_MODEL_TRIED = False


# ---------------------------------------------------------------------------
# 3. In-memory retrieval cache
# ---------------------------------------------------------------------------

_CHUNK_CACHE: List[Dict[str, Any]] = []
_EMBEDDINGS_CACHE = None


# ---------------------------------------------------------------------------
# 4. File Readers & Text Extraction
# ---------------------------------------------------------------------------

def extract_text_from_file(file_path: str) -> str:
    """
    Extract text from:
        .pdf
        .txt
        .md
        .docx
    """

    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    # -------------------------------------------------------
    # TXT / Markdown
    # -------------------------------------------------------

    if ext in (".txt", ".md"):
        try:
            with open(
                file_path,
                "r",
                encoding="utf-8",
                errors="ignore"
            ) as f:
                text = f.read()

        except Exception as e:
            logger.warning(
                "Could not read text file %s: %s",
                file_path,
                e
            )

    # -------------------------------------------------------
    # DOCX
    # -------------------------------------------------------

    elif ext == ".docx":
        try:
            import docx

            doc = docx.Document(file_path)

            paragraphs = [
                p.text.strip()
                for p in doc.paragraphs
                if p.text.strip()
            ]

            text = "\n".join(paragraphs)

        except Exception as e:
            logger.warning(
                "Could not read Word document %s: %s",
                file_path,
                e
            )

    # -------------------------------------------------------
    # PDF
    # -------------------------------------------------------

    elif ext == ".pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(file_path)

            pages = []

            for page_number, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()

                    if page_text:
                        pages.append(page_text)

                except Exception as page_error:
                    logger.warning(
                        "Could not extract page %d from %s: %s",
                        page_number + 1,
                        file_path,
                        page_error
                    )

            text = "\n".join(pages)

        except ImportError:
            logger.error(
                "pypdf is not installed. Run: pip install pypdf"
            )

        except Exception as e:
            logger.warning(
                "Could not read PDF %s: %s",
                file_path,
                e
            )

    return text.strip()


# ---------------------------------------------------------------------------
# 5. Text Chunker
# ---------------------------------------------------------------------------

def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 100
) -> List[str]:
    """
    Split text into overlapping chunks.

    chunk_size:
        Approximate maximum number of characters per chunk.

    chunk_overlap:
        Number of characters carried from the previous chunk.
    """

    if not text:
        return []

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        return []

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:

        end = min(start + chunk_size, text_length)

        # Try to end at a sentence boundary
        if end < text_length:
            sentence_breaks = [
                text.rfind(".", start, end),
                text.rfind("?", start, end),
                text.rfind("!", start, end),
            ]

            best_break = max(sentence_breaks)

            if best_break > start + int(chunk_size * 0.5):
                end = best_break + 1

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        # Move backwards to create overlap
        start = max(0, end - chunk_overlap)

    return chunks


# ---------------------------------------------------------------------------
# 6. Folder Scanner
# ---------------------------------------------------------------------------

def scan_and_chunk_folder(
    target_dir: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Scan docs/rag_documents/ and docs/ for supported documents.

    Supported:
        PDF
        TXT
        MD
        DOCX
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

    supported_patterns = (
        "*.pdf",
        "*.txt",
        "*.md",
        "*.docx"
    )

    ignored_files = {
        "testcases.docx",
        "readme.md",
        "prompt.txt",
    }

    for directory in search_dirs:

        for pattern in supported_patterns:

            for file_path in glob.glob(
                os.path.join(directory, pattern)
            ):

                fname = os.path.basename(file_path)

                # Avoid duplicates
                if fname in seen_files:
                    continue

                # Ignore irrelevant project files
                if fname.lower() in ignored_files:
                    continue

                seen_files.add(fname)

                logger.info(
                    "[FOLDER RAG] Reading: %s",
                    fname
                )

                raw_text = extract_text_from_file(file_path)

                if not raw_text:
                    logger.warning(
                        "[FOLDER RAG] No text extracted from %s",
                        fname
                    )
                    continue

                text_chunks = chunk_text(
                    raw_text,
                    chunk_size=500,
                    chunk_overlap=100
                )

                logger.info(
                    "[FOLDER RAG] %s -> %d chunks",
                    fname,
                    len(text_chunks)
                )

                for idx, chunk_str in enumerate(text_chunks):

                    all_chunks.append({
                        "source": fname,
                        "title": f"{fname} (Section {idx + 1})",
                        "chunk_text": chunk_str,
                    })

    logger.info(
        "[FOLDER RAG] Scanned %d files, generated %d chunks.",
        len(seen_files),
        len(all_chunks)
    )

    return all_chunks


# ---------------------------------------------------------------------------
# 7. MiniLM Model Loader
# ---------------------------------------------------------------------------

def _get_minilm_model():
    """
    Lazy-load all-MiniLM-L6-v2.

    Output dimension:
        384
    """

    global _MINILM_MODEL
    global _MODEL_TRIED

    if _MINILM_MODEL is not None:
        return _MINILM_MODEL

    if _MODEL_TRIED:
        return None

    _MODEL_TRIED = True

    try:
        from sentence_transformers import SentenceTransformer

        logger.info(
            "[MINILM] Loading %s...",
            MODEL_NAME
        )

        _MINILM_MODEL = SentenceTransformer(MODEL_NAME)

        logger.info(
            "[MINILM] Model loaded successfully."
        )

        return _MINILM_MODEL

    except Exception as e:

        logger.error(
            "[MINILM] Could not load model: %s",
            e
        )

        return None


# ---------------------------------------------------------------------------
# 8. Generate Embeddings
# ---------------------------------------------------------------------------

def generate_embeddings(
    chunks: List[Dict[str, Any]]
) -> Optional[np.ndarray]:
    """
    Generate normalized 384-dimensional MiniLM embeddings.
    """

    if not chunks:
        return None

    model = _get_minilm_model()

    if model is None:
        return None

    texts = [
        chunk["chunk_text"]
        for chunk in chunks
    ]

    logger.info(
        "[MINILM] Generating embeddings for %d chunks...",
        len(texts)
    )

    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True
    )

    if embeddings.shape[1] != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSION}-dimensional embeddings, "
            f"but MiniLM returned {embeddings.shape[1]}"
        )

    logger.info(
        "[MINILM] Generated embeddings with shape: %s",
        embeddings.shape
    )

    return embeddings


# ---------------------------------------------------------------------------
# 9. Insert Documents into Supabase
# ---------------------------------------------------------------------------

def insert_chunks_into_supabase(
    chunks: List[Dict[str, Any]],
    embeddings: np.ndarray,
    batch_size: int = 50
) -> int:
    """
    Insert document chunks and their embeddings into Supabase.

    Table:
        rag_documents

    Columns:
        source
        title
        chunk_text
        embedding
    """

    if not chunks:
        return 0

    if len(chunks) != len(embeddings):
        raise ValueError(
            "Number of chunks and embeddings must match."
        )

    # -------------------------------------------------------
    # Delete previous versions of these sources
    # -------------------------------------------------------
    #
    # This makes ingestion repeatable.
    # Running ingestion twice will not create duplicate
    # copies of the same documents.
    # -------------------------------------------------------

    sources = sorted(
        set(chunk["source"] for chunk in chunks)
    )

    for source in sources:

        try:
            supabase.table("rag_documents") \
                .delete() \
                .eq("source", source) \
                .execute()

            logger.info(
                "[SUPABASE] Removed previous chunks for %s",
                source
            )

        except Exception as e:

            logger.warning(
                "[SUPABASE] Could not remove old chunks for %s: %s",
                source,
                e
            )

    # -------------------------------------------------------
    # Insert new chunks
    # -------------------------------------------------------

    total_inserted = 0

    for start in range(
        0,
        len(chunks),
        batch_size
    ):

        batch_chunks = chunks[
            start:start + batch_size
        ]

        batch_embeddings = embeddings[
            start:start + batch_size
        ]

        rows = []

        for chunk, embedding in zip(
            batch_chunks,
            batch_embeddings
        ):

            rows.append({
                "source": chunk["source"],
                "title": chunk["title"],
                "chunk_text": chunk["chunk_text"],

                # Convert numpy array to normal Python list
                # so Supabase/PostgREST can serialize it.
                "embedding": embedding.tolist(),
            })

        try:

            response = (
                supabase
                .table("rag_documents")
                .insert(rows)
                .execute()
            )

            inserted_count = len(
                response.data or rows
            )

            total_inserted += inserted_count

            logger.info(
                "[SUPABASE] Inserted batch: %d rows",
                inserted_count
            )

        except Exception as e:

            logger.error(
                "[SUPABASE] Insert failed: %s",
                e
            )

            raise

    logger.info(
        "[SUPABASE] Total inserted: %d rows",
        total_inserted
    )

    return total_inserted


# ---------------------------------------------------------------------------
# 10. Main Ingestion Function
# ---------------------------------------------------------------------------

def ingest_documents(
    target_dir: Optional[str] = None
) -> int:
    """
    Complete ingestion pipeline:

        files
          ↓
        text extraction
          ↓
        chunks
          ↓
        MiniLM embeddings
          ↓
        Supabase

    Returns:
        Number of rows inserted.
    """

    logger.info(
        "=================================================="
    )

    logger.info(
        "[RAG INGESTION] Starting document ingestion..."
    )

    logger.info(
        "[RAG INGESTION] Source directory: %s",
        target_dir or RAG_DOCS_DIR
    )

    # Step 1: Scan and chunk
    chunks = scan_and_chunk_folder(
        target_dir=target_dir
    )

    if not chunks:
        logger.warning(
            "[RAG INGESTION] No document chunks found."
        )
        return 0

    # Step 2: Generate embeddings
    embeddings = generate_embeddings(chunks)

    if embeddings is None:
        raise RuntimeError(
            "MiniLM model could not be loaded. "
            "Install sentence-transformers and try again."
        )

    # Step 3: Insert into Supabase
    inserted = insert_chunks_into_supabase(
        chunks,
        embeddings
    )

    # Step 4: Refresh local cache
    refresh_folder_rag()

    logger.info(
        "[RAG INGESTION] Completed successfully."
    )

    logger.info(
        "[RAG INGESTION] %d rows inserted into rag_documents.",
        inserted
    )

    logger.info(
        "=================================================="
    )

    return inserted


# ---------------------------------------------------------------------------
# 11. Local Folder Retrieval
# ---------------------------------------------------------------------------

def search_folder_rag(
    query_text: str,
    limit: int = 2
) -> List[Dict[str, Any]]:
    """
    Search document chunks using MiniLM cosine similarity.

    This is the existing fast in-memory retrieval path.
    """

    global _CHUNK_CACHE
    global _EMBEDDINGS_CACHE

    # Load chunks
    if not _CHUNK_CACHE:

        _CHUNK_CACHE = scan_and_chunk_folder()

    if not _CHUNK_CACHE:
        return []

    model = _get_minilm_model()

    # -------------------------------------------------------
    # MiniLM semantic search
    # -------------------------------------------------------

    if model is not None:

        try:

            # Generate chunk embeddings once
            if _EMBEDDINGS_CACHE is None:

                texts = [
                    chunk["chunk_text"]
                    for chunk in _CHUNK_CACHE
                ]

                _EMBEDDINGS_CACHE = model.encode(
                    texts,
                    convert_to_numpy=True,
                    normalize_embeddings=True
                )

            # Generate query embedding
            query_embedding = model.encode(
                [query_text],
                convert_to_numpy=True,
                normalize_embeddings=True
            )[0]

            # Normalized vectors:
            # cosine similarity = dot product
            scores = np.dot(
                _EMBEDDINGS_CACHE,
                query_embedding
            )

            top_indices = np.argsort(
                scores
            )[::-1][:limit]

            results = []

            for idx in top_indices:

                chunk = dict(
                    _CHUNK_CACHE[idx]
                )

                chunk["score"] = float(
                    scores[idx]
                )

                results.append(chunk)

            return results

        except Exception as e:

            logger.warning(
                "[MINILM RAG] Search failed: %s",
                e
            )

    # -------------------------------------------------------
    # Keyword fallback
    # -------------------------------------------------------

    query_tokens = set(
        re.findall(
            r"\b\w+\b",
            query_text.lower()
        )
    )

    scored_chunks = []

    for chunk in _CHUNK_CACHE:

        chunk_tokens = set(
            re.findall(
                r"\b\w+\b",
                chunk["chunk_text"].lower()
            )
        )

        overlap = (
            query_tokens &
            chunk_tokens
        )

        if overlap:

            score = len(overlap) / (
                len(query_tokens) + 1e-5
            )

            scored_chunks.append(
                (score, chunk)
            )

    scored_chunks.sort(
        key=lambda x: x[0],
        reverse=True
    )

    return [
        item[1]
        for item in scored_chunks[:limit]
    ]
def search_supabase_rag(
    query_text: str,
    limit: int = 2
) -> List[Dict[str, Any]]:
    """
    Search Supabase rag_documents using pgvector similarity.
    """

    if not query_text:
        return []

    model = _get_minilm_model()

    if model is None:
        logger.warning("[SUPABASE RAG] MiniLM model unavailable.")
        return []

    try:
        query_embedding = model.encode(
            [query_text],
            convert_to_numpy=True,
            normalize_embeddings=True
        )[0]

        response = supabase.rpc(
            "match_rag_documents",
            {
                "query_embedding": query_embedding.tolist(),
                "match_count": limit
            }
        ).execute()

        results = response.data or []

        logger.info(
            "[SUPABASE RAG] Retrieved %d chunks for query: '%s...'",
            len(results),
            query_text[:30]
        )

        return results

    except Exception as e:
        logger.error(
            "[SUPABASE RAG] Vector search failed: %s",
            e
        )
        return []

# ---------------------------------------------------------------------------
# 12. Refresh Local Cache
# ---------------------------------------------------------------------------

def refresh_folder_rag():
    """
    Clear local chunk and embedding caches.

    The next search will scan the folder again.
    """

    global _CHUNK_CACHE
    global _EMBEDDINGS_CACHE

    _CHUNK_CACHE = []
    _EMBEDDINGS_CACHE = None

    logger.info(
        "[FOLDER RAG] Cache invalidated."
    )


# ---------------------------------------------------------------------------
# 13. Command-Line Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s"
    )

    try:

        inserted = ingest_documents()

        print(
            f"\nRAG ingestion completed."
            f"\nRows inserted into Supabase: {inserted}"
        )

    except Exception as e:

        logger.exception(
            "[RAG INGESTION] Failed."
        )

        print(
            f"\nRAG ingestion failed: {e}"
        )
