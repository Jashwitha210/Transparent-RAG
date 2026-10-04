from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.rag.semantic_retriever import semantic_search


router = APIRouter(
    prefix="/api/query",
    tags=["Query"],
)


class QueryRequest(BaseModel):
    question: str
    top_k: int = 5


@router.post("")
def query_documents(request: QueryRequest):
    """Search documents using semantic similarity."""

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    if request.top_k < 1 or request.top_k > 20:
        raise HTTPException(
            status_code=400,
            detail="top_k must be between 1 and 20.",
        )

    results = semantic_search(
        question,
        request.top_k,
    )

    return {
        "question": question,
        "results": results,
        "count": len(results),
    }