from dataclasses import dataclass


@dataclass
class Chunk:
    text: str
    source: str
    page: int | None
    chunk_index: int


def chunk_pages(
    pages: list[dict],
    source: str,
    chunk_size: int = 800,
    overlap: int = 150,
) -> list[Chunk]:

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be >= 0 and smaller than chunk_size."
        )

    chunks = []
    chunk_index = 0

    for page in pages:
        text = page.get("text", "").strip()

        if not text:
            continue

        page_number = page.get("page")
        start = 0

        while start < len(text):
            end = min(start + chunk_size, len(text))

            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append(
                    Chunk(
                        text=chunk_text,
                        source=source,
                        page=page_number,
                        chunk_index=chunk_index,
                    )
                )

                chunk_index += 1

            if end >= len(text):
                break

            start = end - overlap

    return chunks