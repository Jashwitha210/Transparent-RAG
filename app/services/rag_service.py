from app.rag.prompt import build_rag_prompt
from app.rag.indexer import DocumentIndexer
from app.services.llm_service import LLMService


class RAGService:
    def __init__(
        self,
        indexer: DocumentIndexer,
        llm_service: LLMService,
    ):
        self.indexer = indexer
        self.llm_service = llm_service

    def answer(
        self,
        question: str,
        top_k: int = 5,
    ) -> dict:

        results = self.indexer.search(
            query=question,
            top_k=top_k,
        )

        if not results:
            return {
                "answer": (
                    "I couldn't find enough information "
                    "in the uploaded documents."
                ),
                "evidence": [],
            }

        prompt = build_rag_prompt(
            question=question,
            contexts=results,
        )

        answer = self.llm_service.generate(prompt)

        return {
            "answer": answer,
            "evidence": results,
        }