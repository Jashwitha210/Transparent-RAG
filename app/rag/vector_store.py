from pathlib import Path

import faiss
import numpy as np

from app.rag.chunker import Chunk


class VectorStore:
    """FAISS vector store with document metadata."""

    def __init__(self, dimension: int):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)
        self.chunks: list[Chunk] = []

    def add(self, chunks: list[Chunk], embeddings) -> None:
        if not chunks:
            return

        vectors = np.asarray(embeddings, dtype="float32")

        if vectors.ndim != 2:
            raise ValueError("Embeddings must be a 2D array.")

        if vectors.shape[1] != self.dimension:
            raise ValueError(
                f"Expected embedding dimension {self.dimension}, "
                f"got {vectors.shape[1]}."
            )

        self.index.add(vectors)
        self.chunks.extend(chunks)

    def search(
        self,
        query_embedding,
        top_k: int = 5,
    ) -> list[dict]:
        if self.index.ntotal == 0:
            return []

        query = np.asarray(
            [query_embedding],
            dtype="float32",
        )

        scores, indices = self.index.search(
            query,
            min(top_k, self.index.ntotal),
        )

        results = []

        for score, index in zip(scores[0], indices[0]):
            if index < 0:
                continue

            chunk = self.chunks[index]

            results.append(
                {
                    "score": float(score),
                    "text": chunk.text,
                    "source": chunk.source,
                    "page": chunk.page,
                    "chunk_index": chunk.chunk_index,
                }
            )

        return results