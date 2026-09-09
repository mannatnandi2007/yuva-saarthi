# YUVAA Saarthi RAG Router
# Reference: PRD §4 (Tech Stack pgvector) & §6 (RAG ingestion + retrieval)
#
# BUG-002 FIX: /ingest now actually writes to the rag_documents table in Supabase.

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List
import logging

from app.supabase_client import supabase
from app.services.rag_service import retrieve_relevant_guidelines

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["rag"])


class DocumentIngestPayload(BaseModel):
    source: str
    title: str
    chunk_text: str
    embedding: List[float]  # 1536 float values for OpenAI text-embedding-3-small


class RetrievalQuery(BaseModel):
    query_text: str
    limit: int = 3


@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_document(payload: DocumentIngestPayload):
    """
    Ingest a document chunk with its vector embedding into rag_documents table.
    BUG-002 FIX: Previously returned a fake success without writing to DB.
    Now inserts into Supabase rag_documents table with pgvector embedding.
    """
    if len(payload.embedding) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Embedding vector cannot be empty. Provide a valid 1536-dim embedding."
        )

    try:
        result = supabase.table("rag_documents").insert({
            "source": payload.source,
            "title": payload.title,
            "chunk_text": payload.chunk_text,
            "embedding": payload.embedding,
        }).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to insert document chunk — no data returned from DB."
            )

        inserted_id = result.data[0].get("id", "unknown")
        logger.info(
            "[RAG INGEST] Stored chunk '%s' from '%s' (id=%s, dims=%d)",
            payload.title[:40], payload.source, inserted_id, len(payload.embedding)
        )
        return {
            "status": "success",
            "id": inserted_id,
            "message": f"Ingested chunk '{payload.title}' from source: {payload.source}",
            "embedding_dims": len(payload.embedding)
        }

    except HTTPException:
        raise
    except Exception as e:
        err_str = str(e)
        logger.error("[RAG INGEST] DB insert failed: %s", e)
        if "ConnectError" in type(e).__name__ or "getaddrinfo" in err_str:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database is unreachable. Please ensure Supabase is configured and accessible."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document: {err_str}"
        )


@router.post("/retrieve", status_code=status.HTTP_200_OK)
async def retrieve_documents(payload: RetrievalQuery):
    """
    Retrieve clinical and coping guidelines from WHO, NIMHANS, and ICMR.
    Attempts pgvector similarity search first; falls back to in-memory KB.
    """
    if not payload.query_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="query_text cannot be empty."
        )

    results = retrieve_relevant_guidelines(
        query_text=payload.query_text,
        limit=payload.limit
    )
    return {
        "query": payload.query_text,
        "count": len(results),
        "results": results
    }


@router.get("/files", status_code=status.HTTP_200_OK)
async def list_rag_files():
    """
    List all document files detected in the 'docs/rag_documents/' and 'docs/' folders,
    along with the total chunks extracted.
    """
    from app.services.folder_rag_service import scan_and_chunk_folder, RAG_DOCS_DIR
    chunks = scan_and_chunk_folder()
    files = {}
    for c in chunks:
        src = c["source"]
        files[src] = files.get(src, 0) + 1

    return {
        "rag_folder": RAG_DOCS_DIR,
        "total_files": len(files),
        "total_chunks": len(chunks),
        "files": [{"filename": k, "chunks_count": v} for k, v in files.items()]
    }


@router.post("/scan", status_code=status.HTTP_200_OK)
async def rescan_rag_files():
    """
    Re-scan the docs folder and refresh the chunk/embedding cache.
    Call this whenever you drop new .txt, .md, or .docx files into docs/rag_documents/.
    """
    from app.services.folder_rag_service import refresh_folder_rag, scan_and_chunk_folder
    refresh_folder_rag()
    chunks = scan_and_chunk_folder()
    return {
        "status": "success",
        "message": f"Successfully re-scanned folder. Total chunks indexed: {len(chunks)}",
        "total_chunks": len(chunks)
    }

