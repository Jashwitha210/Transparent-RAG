from app.rag.chunker import chunk_pages


def test_chunking():
    pages = [
        {
            "page": 1,
            "text": "A" * 2000,
        }
    ]

    chunks = chunk_pages(
        pages,
        source="test.pdf",
        chunk_size=500,
        overlap=100,
    )

    assert len(chunks) > 1
    assert all(chunk.source == "test.pdf" for chunk in chunks)
    assert all(chunk.page == 1 for chunk in chunks)