import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.services.pdf_text_service import PDFService
from ai.agents.resume_extractor import ResumeExtractor
from ai.agents.ollama_model import OllamaModel


def main():
    model = OllamaModel()
    resume_extractor = ResumeExtractor(model)
    pdf_service = PDFService()

    file_path = r"fff.pdf"  # Change this to your resume file

    text = pdf_service.extract_text(file_path)

    print("=" * 80)
    print("Extracted Text")
    print("=" * 80)
    print(text)
    print("=" * 80)
    print()
    print("LLMS RESPONSE")
    print(resume_extractor.extract(text))
    


if __name__ == "__main__":
    main()