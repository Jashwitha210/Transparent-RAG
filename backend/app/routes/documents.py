from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.document_processor import extract_text, chunk_text

from app.database.repository import (
    get_all_documents,
    get_document_by_id,
    get_chunks_by_document_id,
)

from app.database.database import get_connection

from app.rag.indexer import index_document_chunks


router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"],
)


UPLOAD_DIR = Path("data/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".docx",
    ".pptx",
    ".xlsx",
    ".xls",
    ".csv",
    ".png",
    ".jpg",
    ".jpeg",
}


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ============================================================
# UPLOAD DOCUMENT
# ============================================================

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...)
):
    """Upload, process, store, and index a document."""

    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower()

    # --------------------------------------------------------
    # Validate extension
    # --------------------------------------------------------

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: {extension}. "
                "Supported formats: PDF, TXT, DOCX, PPTX, "
                "XLSX, XLS, CSV, PNG, JPG and JPEG."
            ),
        )

    document_id = str(uuid4())

    saved_path = UPLOAD_DIR / f"{document_id}{extension}"

    total_size = 0

    try:

        # ----------------------------------------------------
        # Save uploaded file
        # ----------------------------------------------------

        with saved_path.open("wb") as destination:

            while chunk := await file.read(1024 * 1024):

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File exceeds the 10 MB limit.",
                    )

                destination.write(chunk)

        if total_size == 0:
            saved_path.unlink(missing_ok=True)

            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        # ----------------------------------------------------
        # Extract text
        # ----------------------------------------------------

        pages = extract_text(str(saved_path))

        if not pages:
            raise HTTPException(
                status_code=422,
                detail=(
                    "The document was uploaded, "
                    "but no readable text was found."
                ),
            )

        # ----------------------------------------------------
        # Create chunks
        # ----------------------------------------------------

        chunks = chunk_text(pages)

        if not chunks:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No usable chunks could be created "
                    "from the document."
                ),
            )

        # ----------------------------------------------------
        # Store document and chunks
        # ----------------------------------------------------

        connection = get_connection()

        try:

            connection.execute(
                """
                INSERT INTO documents (
                    id,
                    filename,
                    file_type,
                    file_size,
                    status,
                    page_count,
                    chunk_count,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    document_id,
                    original_name,
                    extension,
                    total_size,
                    "processed",
                    len(pages),
                    len(chunks),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )

            for index, chunk in enumerate(chunks):

                connection.execute(
                    """
                    INSERT INTO chunks (
                        document_id,
                        chunk_number,
                        text,
                        page,
                        source_type,
                        start_char,
                        end_char
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        document_id,
                        index,
                        chunk["text"],
                        chunk.get("page"),
                        chunk.get("source_type"),
                        chunk.get("start_char"),
                        chunk.get("end_char"),
                    ),
                )

            connection.commit()

        except Exception:
            connection.rollback()
            raise

        finally:
            connection.close()

        # ----------------------------------------------------
        # Generate embeddings automatically
        # ----------------------------------------------------

        indexed_chunks = index_document_chunks(document_id)

        # ----------------------------------------------------
        # Return result
        # ----------------------------------------------------

        return {
            "message": (
                "Document uploaded, processed, stored, "
                "and indexed successfully."
            ),
            "document_id": document_id,
            "filename": original_name,
            "extension": extension,
            "size_bytes": total_size,
            "pages": len(pages),
            "chunks": len(chunks),
            "indexed_chunks": indexed_chunks,
            "status": "processed",
        }

    except HTTPException:

        saved_path.unlink(missing_ok=True)
        raise

    except Exception as exc:

        saved_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {exc}",
        )

    finally:

        await file.close()


# ============================================================
# LIST DOCUMENTS
# ============================================================

@router.get("")
def list_documents():
    """Return all stored documents."""

    rows = get_all_documents()

    return {
        "documents": [dict(row) for row in rows],
        "count": len(rows),
    }


# ============================================================
# GET DOCUMENT CHUNKS
# ============================================================

@router.get("/{document_id}/chunks")
def get_document_chunks(document_id: str):
    """Return all chunks belonging to a document."""

    rows = get_chunks_by_document_id(document_id)

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Document not found or contains no chunks.",
        )

    return {
        "document_id": document_id,
        "chunks": [dict(row) for row in rows],
        "count": len(rows),
    }


# ============================================================
# DELETE DOCUMENT
# ============================================================

@router.delete("/{document_id}")
def delete_document(document_id: str):
    """Delete a document and all its chunks."""

    connection = get_connection()

    try:

        document = connection.execute(
            "SELECT id FROM documents WHERE id = ?",
            (document_id,),
        ).fetchone()

        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found.",
            )

        connection.execute(
            "DELETE FROM chunks WHERE document_id = ?",
            (document_id,),
        )

        connection.execute(
            "DELETE FROM documents WHERE id = ?",
            (document_id,),
        )

        connection.commit()

        return {
            "message": "Document deleted successfully.",
            "document_id": document_id,
        }

    except HTTPException:
        raise

    except Exception:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to delete document.",
        )

    finally:
        connection.close()


# ============================================================
# GET SINGLE DOCUMENT
# ============================================================

@router.get("/{document_id}")
def get_document(document_id: str):
    """Return metadata for a single document."""

    row = get_document_by_id(document_id)

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    return dict(row)