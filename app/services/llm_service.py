import os

from dotenv import load_dotenv

load_dotenv()


class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")

    def generate(self, prompt: str) -> str:
        if not self.api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not configured."
            )

        from openai import OpenAI

        client = OpenAI(api_key=self.api_key)

        response = client.responses.create(
            model=os.getenv(
                "OPENAI_MODEL",
                "gpt-4.1-mini",
            ),
            input=prompt,
        )

        return response.output_text