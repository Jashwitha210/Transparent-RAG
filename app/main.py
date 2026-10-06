from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.rag.indexer import DocumentIndexer
from app.services.document_processor import (
    SUPPORTED_EXTENSIONS,
    extract_document,
)
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService


# =========================================================
# PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="Transparent-RAG API",
    description=(
        "Dynamic and transparent Retrieval-Augmented "
        "Generation API"
    ),
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# RAG SERVICES
# =========================================================

indexer = DocumentIndexer()

llm_service = LLMService()

rag_service = RAGService(
    indexer=indexer,
    llm_service=llm_service,
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Transparent-RAG API is running",
        "status": "healthy",
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
    }


# =========================================================
# UPLOAD DOCUMENT
# =========================================================

@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided.",
        )

    extension = Path(
        file.filename
    ).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{extension}'. "
                f"Supported file types: "
                f"{', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )

    document_id = str(uuid4())

    safe_filename = (
        f"{document_id}{extension}"
    )

    file_path = UPLOAD_DIR / safe_filename

    contents = await file.read()

    file_path.write_bytes(contents)

    try:
        # ---------------------------------------------
        # Extract document text
        # ---------------------------------------------

        pages = extract_document(
            str(file_path)
        )

        # ---------------------------------------------
        # Create chunks + embeddings + FAISS index
        # ---------------------------------------------

        indexing_result = indexer.index_document(
            document_id=document_id,
            filename=file.filename,
            pages=pages,
        )

    except Exception as exc:
        file_path.unlink(
            missing_ok=True
        )

        raise HTTPException(
            status_code=422,
            detail=(
                f"Could not process document: {exc}"
            ),
        ) from exc

    return {
        "message": (
            "Document uploaded and indexed successfully."
        ),
        "document_id": document_id,
        "filename": file.filename,
        "file_type": extension,
        "pages": len(pages),
        "chunks": indexing_result["chunks"],
    }


# =========================================================
# LIST DOCUMENTS
# =========================================================

@app.get("/documents")
def list_documents():
    documents = indexer.list_documents()

    return {
        "documents": documents,
        "count": len(documents),
    }


# =========================================================
# GET SINGLE DOCUMENT
# =========================================================

@app.get("/documents/{document_id}")
def get_document(
    document_id: str,
):
    for document in indexer.list_documents():

        if document["document_id"] == document_id:
            return document

    raise HTTPException(
        status_code=404,
        detail="Document not found.",
    )


# =========================================================
# SEMANTIC SEARCH
# =========================================================

@app.get("/search")
def search_documents(
    q: str,
    top_k: int = 5,
):
    if not q.strip():
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty.",
        )

    if top_k < 1 or top_k > 20:
        raise HTTPException(
            status_code=400,
            detail="top_k must be between 1 and 20.",
        )

    results = indexer.search(
        query=q,
        top_k=top_k,
    )

    return {
        "query": q,
        "results": results,
    }


# =========================================================
# RAG QUESTION ANSWERING
# =========================================================

@app.get("/query")
def query_documents(
    q: str,
    top_k: int = 5,
):
    if not q.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty.",
        )

    if top_k < 1 or top_k > 20:
        raise HTTPException(
            status_code=400,
            detail="top_k must be between 1 and 20.",
        )

    try:
        result = rag_service.answer(
            question=q,
            top_k=top_k,
        )

        return {
            "query": q,
            **result,
        }

    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc