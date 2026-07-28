import json
import requests
from typing import Optional, Dict, List


class OllamaModel:
    def __init__(
        self,
        model: str = "llama3.2:latest",
        base_url: str = "http://localhost:11434",
        temperature: float = 0.2,
        max_tokens: int = 1500,
    ):
        self.base_url = base_url
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    def test_connection(self) -> bool:
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )
            return response.status_code == 200
        except:
            return False

    def generate(self, prompt: str) -> str:

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
            },
        }

        response = requests.post(
            f"{self.base_url}/api/generate",
            json=payload,
            timeout=300,
        )

        response.raise_for_status()

        return response.json()["response"]