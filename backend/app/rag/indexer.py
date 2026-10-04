import json

from app.database.database import get_connection
from app.rag.embeddings import generate_embeddings


def index_document_chunks(document_id: str) -> int:
    """Generate and store embeddings for all chunks of a document."""

    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT id, text
            FROM chunks
            WHERE document_id = ?
            ORDER BY chunk_number ASC
            """,
            (document_id,),
        ).fetchall()

        if not rows:
            return 0

        texts = [row["text"] for row in rows]

        embeddings = generate_embeddings(texts)

        for row, embedding in zip(rows, embeddings):
            connection.execute(
                """
                UPDATE chunks
                SET embedding = ?
                WHERE id = ?
                """,
                (
                    json.dumps(embedding),
                    row["id"],
                ),
            )

        connection.commit()

        return len(embeddings)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()