from app.document_processor import chunk_text

sample_pages = [
    {
        "page": 1,
        "text": (
            "Transparent RAG explains how retrieved evidence supports "
            "an answer. " * 150
        ),
    }
]

chunks = chunk_text(sample_pages)

print("Total chunks:", len(chunks))
print("First chunk ID:", chunks[0]["chunk_id"])
print("Source page:", chunks[0]["page"])
print("First chunk preview:", chunks[0]["text"][:150])
print("Chunking test passed.")
