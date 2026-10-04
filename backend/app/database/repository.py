from app.database.database import get_connection


def get_all_documents():
    connection = get_connection()

    try:
        return connection.execute(
            """
            SELECT
                id,
                filename,
                file_type,
                file_size,
                status,
                page_count,
                chunk_count,
                created_at
            FROM documents
            ORDER BY created_at DESC
            """
        ).fetchall()

    finally:
        connection.close()


def get_document_by_id(document_id: str):
    connection = get_connection()

    try:
        return connection.execute(
            """
            SELECT
                id,
                filename,
                file_type,
                file_size,
                status,
                page_count,
                chunk_count,
                created_at
            FROM documents
            WHERE id = ?
            """,
            (document_id,),
        ).fetchone()

    finally:
        connection.close()


def get_chunks_by_document_id(document_id: str):
    connection = get_connection()

    try:
        return connection.execute(
            """
            SELECT
                id,
                document_id,
                chunk_number,
                text,
                page,
                source_type,
                start_char,
                end_char
            FROM chunks
            WHERE document_id = ?
            ORDER BY chunk_number ASC
            """,
            (document_id,),
        ).fetchall()

    finally:
        connection.close()