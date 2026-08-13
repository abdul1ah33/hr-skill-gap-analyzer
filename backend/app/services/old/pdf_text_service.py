from pathlib import Path

import fitz  # PyMuPDF
from docx import Document


class PDFService:
    """
    Service responsible for extracting text from PDF and DOCX files.
    """

    SUPPORTED_EXTENSIONS = {".pdf", ".docx"}

    def extract_text(self, file_path: str | Path) -> str:
        """
        Extract text from a PDF or DOCX file.

        Args:
            file_path: Path to the document.

        Returns:
            The extracted text.

        Raises:
            FileNotFoundError
            ValueError
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        extension = path.suffix.lower()

        if extension == ".pdf":
            return self._extract_pdf(path)

        if extension == ".docx":
            return self._extract_docx(path)

        raise ValueError(
            f"Unsupported file type '{extension}'. "
            f"Supported types: {', '.join(self.SUPPORTED_EXTENSIONS)}"
        )

    def _extract_pdf(self, path: Path) -> str:
        text = []

        with fitz.open(path) as document:
            for page in document:
                text.append(page.get_text())

        return "\n".join(text).strip()

    def _extract_docx(self, path) -> str:
        document = Document(path)

        text = [
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return "\n".join(text).strip()