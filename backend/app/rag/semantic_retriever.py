import json
import numpy as np

from app.database.database import get_connection
from app.rag.embeddings import generate_embedding


def cosine_similarity(vector_a, vector_b):
    """Calculate cosine similarity between two vectors."""

    a = np.array(vector_a)
    b = np.array(vector_b)

    denominator = np.linalg.norm(a) * np.linalg.norm(b)

    if denominator == 0:
        return 0.0

    return float(np.dot(a, b) / denominator)


def semantic_search(
    query: str,
    top_k: int = 5,
) -> list[dict]:
    """Search document chunks using embedding similarity."""

    query_embedding = generate_embedding(query)

    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                chunks.id,
                chunks.document_id,
                chunks.chunk_number,
                chunks.text,
                chunks.page,
                chunks.source_type,
                chunks.start_char,
                chunks.end_char,
                chunks.embedding,
                documents.filename
            FROM chunks
            JOIN documents
                ON chunks.document_id = documents.id
            WHERE chunks.embedding IS NOT NULL
            """
        ).fetchall()

    finally:
        connection.close()

    results = []

    for row in rows:

        try:
            chunk_embedding = json.loads(row["embedding"])
        except (json.JSONDecodeError, TypeError):
            continue

        score = cosine_similarity(
            query_embedding,
            chunk_embedding,
        )

        results.append(
            {
                "chunk_id": row["id"],
                "document_id": row["document_id"],
                "document_name": row["filename"],
                "chunk_number": row["chunk_number"],
                "text": row["text"],
                "page": row["page"],
                "source_type": row["source_type"],
                "start_char": row["start_char"],
                "end_char": row["end_char"],
                "score": score,
            }
        )

    results.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return results[:top_k]