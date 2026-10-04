from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.documents import router as documents_router
from app.routes.query import router as query_router
from app.database.init_db import initialize_database


# Initialize database when the application starts
initialize_database()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Transparent RAG API",
    description="Explainable Multi-Agent RAG System",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

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


# ============================================================
# ROUTES
# ============================================================

app.include_router(documents_router)
app.include_router(query_router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Transparent RAG backend is running",
        "project": "Transparent RAG",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():
    return {
        "status": "healthy"
    }


# ============================================================
# DATABASE STATUS
# ============================================================

@app.get("/api/database/status")
def database_status():

    from app.database.database import get_connection

    connection = get_connection()

    try:

        document_count = connection.execute(
            "SELECT COUNT(*) FROM documents"
        ).fetchone()[0]

        chunk_count = connection.execute(
            "SELECT COUNT(*) FROM chunks"
        ).fetchone()[0]

        embedded_count = connection.execute(
            """
            SELECT COUNT(*)
            FROM chunks
            WHERE embedding IS NOT NULL
            """
        ).fetchone()[0]

        return {
            "database": "connected",
            "documents": document_count,
            "chunks": chunk_count,
            "embedded_chunks": embedded_count,
        }

    finally:
        connection.close()