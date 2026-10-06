from pathlib import Path

import fitz
from docx import Document


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def extract_pdf(file_path: str) -> list[dict]:
    """Extract text from every PDF page while preserving page numbers."""
    pages = []

    document = fitz.open(file_path)

    try:
        for page_number, page in enumerate(document, start=1):
            text = page.get_text("text").strip()

            if text:
                pages.append(
                    {
                        "page": page_number,
                        "text": text,
                    }
                )
    finally:
        document.close()

    return pages


def extract_docx(file_path: str) -> list[dict]:
    """Extract paragraphs from a DOCX document."""
    document = Document(file_path)

    text_parts = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()

        if text:
            text_parts.append(text)

    text = "\n".join(text_parts)

    return [{"page": None, "text": text}] if text else []


def extract_txt(file_path: str) -> list[dict]:
    """Extract text from a TXT document."""
    text = Path(file_path).read_text(
        encoding="utf-8",
        errors="replace",
    ).strip()

    return [{"page": None, "text": text}] if text else []


def extract_document(file_path: str) -> list[dict]:
    """Automatically select the correct extractor based on file extension."""
    extension = Path(file_path).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {extension}. "
            f"Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    if extension == ".pdf":
        return extract_pdf(file_path)

    if extension == ".docx":
        return extract_docx(file_path)

    return extract_txt(file_path)