# YUVAA Saarthi RAG Router
# Reference: PRD §4 (Tech Stack pgvector) & §6 (RAG ingestion + retrieval) & Execution Plan Day 6

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/rag", tags=["rag"])

class DocumentIngestPayload(BaseModel):
    source: str
    title: str
    chunk_text: str
    embedding: List[float] # 1536 float values

class RetrievalQuery(BaseModel):
    query_text: str
    limit: int = 3

@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_document(payload: DocumentIngestPayload):
    """
    Ingest a document chunk with its vector embedding.
    TODO: Insert into 'rag_documents' table (PRD §6).
    """
    return {
        "status": "success",
        "message": f"Ingested chunk from source: {payload.source}"
    }

from app.services.rag_service import retrieve_relevant_guidelines

@router.post("/retrieve", status_code=status.HTTP_200_OK)
async def retrieve_documents(payload: RetrievalQuery):
    """
    Retrieve clinical and coping guidelines from WHO, NIMHANS, and ICMR.
    """
    results = retrieve_relevant_guidelines(
        query_text=payload.query_text,
        limit=payload.limit
    )
    return {
        "query": payload.query_text,
        "count": len(results),
        "results": results
    }

