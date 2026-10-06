from app.rag.indexer import DocumentIndexer


def test_document_indexing():
    indexer = DocumentIndexer()

    pages = [
        {
            "page": 1,
            "text": (
                "Artificial intelligence allows computers to perform "
                "tasks that normally require human intelligence."
            ),
        }
    ]

    result = indexer.index_document(
        document_id="test-document",
        filename="test.txt",
        pages=pages,
    )

    assert result["document_id"] == "test-document"
    assert result["filename"] == "test.txt"
    assert result["chunks"] > 0

    results = indexer.search(
        "What is artificial intelligence?",
        top_k=1,
    )

    assert len(results) == 1
    assert results[0]["source"] == "test.txt"