from app.rag.chunker import chunk_pages
from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import VectorStore


class DocumentIndexer:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStore(dimension=384)
        self.documents = {}

    def index_document(
        self,
        document_id: str,
        filename: str,
        pages: list[dict],
    ) -> dict:

        chunks = chunk_pages(
            pages,
            source=filename,
            chunk_size=800,
            overlap=150,
        )

        if not chunks:
            raise ValueError("No text could be extracted from the document.")

        texts = [chunk.text for chunk in chunks]

        embeddings = self.embedding_service.embed_documents(texts)

        self.vector_store.add(chunks, embeddings)

        self.documents[document_id] = {
            "document_id": document_id,
            "filename": filename,
            "chunks": len(chunks),
        }

        return self.documents[document_id]

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        query_embedding = self.embedding_service.embed_query(query)

        return self.vector_store.search(
            query_embedding,
            top_k=top_k,
        )

    def list_documents(self) -> list[dict]:
        return list(self.documents.values())