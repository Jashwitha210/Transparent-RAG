import re
import math
from collections import Counter

from app.database.database import get_connection


def tokenize(text: str) -> list[str]:
    """Convert text into normalized searchable terms."""

    return re.findall(r"\b[a-zA-Z0-9]+\b", text.lower())


def calculate_score(query_tokens: list[str], chunk_text: str) -> float:
    """Calculate a simple TF-IDF-style relevance score."""

    chunk_tokens = tokenize(chunk_text)

    if not chunk_tokens:
        return 0.0

    query_counter = Counter(query_tokens)
    chunk_counter = Counter(chunk_tokens)

    score = 0.0

    for term, query_frequency in query_counter.items():

        if term not in chunk_counter:
            continue

        term_frequency = chunk_counter[term] / len(chunk_tokens)

        score += term_frequency * query_frequency

    return score


def search_chunks(
    query: str,
    top_k: int = 5,
) -> list[dict]:
    """
    Search all stored document chunks and return
    the most relevant chunks.
    """

    query_tokens = tokenize(query)

    if not query_tokens:
        return []

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
                documents.filename
            FROM chunks
            JOIN documents
                ON chunks.document_id = documents.id
            """
        ).fetchall()

    finally:
        connection.close()

    results = []

    for row in rows:

        score = calculate_score(
            query_tokens,
            row["text"],
        )

        if score <= 0:
            continue

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