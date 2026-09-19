"""
app/services/extraction.py
--------------------------
Pure file-parsing logic.  No DB, no FastAPI imports — only stdlib + PyMuPDF
+ python-docx.  Keeps the extraction layer independently testable.
"""
from __future__ import annotations

import io
import re


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_whitespace(text: str) -> str:
    """Collapse 3+ consecutive newlines into 2 and strip leading/trailing ws.

    This keeps intentional paragraph breaks (≤2 newlines) intact while
    removing the huge blank-line noise that PyMuPDF and python-docx often
    emit between sections.
    """
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Public extraction functions
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF's bytes using PyMuPDF.

    Returns concatenated text from all pages, whitespace-normalized
    (collapse 3+ consecutive newlines into 2, strip leading/trailing
    whitespace).  Returns empty string if no extractable text layer exists
    (e.g. a scanned PDF) — do NOT raise for that case; it is expected and
    handled by the caller via extraction_status.

    Args:
        file_bytes: Raw bytes of the PDF file.

    Returns:
        Normalized plain-text content, or "" when no text layer is found.
    """
    import fitz  # PyMuPDF — imported here to keep the module importable even
                 # if fitz is not installed in test environments that only test docx.

    # fitz.open() accepts a stream argument when we pass memoryview / bytes
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages: list[str] = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()

    raw = "\n".join(pages)
    return _normalize_whitespace(raw)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract all paragraph text from a DOCX's bytes using python-docx.

    Same whitespace normalization as :func:`extract_text_from_pdf`.

    Args:
        file_bytes: Raw bytes of the DOCX file.

    Returns:
        Normalized plain-text content joined from all paragraphs.
    """
    from docx import Document  # python-docx

    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [para.text for para in doc.paragraphs]
    raw = "\n".join(paragraphs)
    return _normalize_whitespace(raw)


def extract_text(filename: str, file_bytes: bytes) -> str:
    """Dispatch to the correct extractor based on the filename's extension.

    Supported extensions (case-insensitive): .pdf, .docx.
    For any other extension a :class:`ValueError` is raised — the caller
    (router) converts this to an HTTP 400 response.  No Candidate row is
    created in that case.

    Args:
        filename:   Original filename as uploaded by the client.
        file_bytes: Raw bytes of the uploaded file.

    Returns:
        Extracted and normalized text (may be "" for files with no text layer).

    Raises:
        ValueError: If the file extension is not .pdf or .docx.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext == "docx":
        return extract_text_from_docx(file_bytes)
    else:
        # Assumption: we surface the extension (or "none") so the error message
        # is immediately actionable from the client side.
        label = f".{ext}" if ext else "(no extension)"
        raise ValueError(
            f"Unsupported file type '{label}'. Only .pdf and .docx are accepted."
        )
