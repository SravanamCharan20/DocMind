import os
from dotenv import load_dotenv
from groq import Groq, RateLimitError
from langfuse import observe

# Load environment variables
load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


@observe()
def generate_answer(question: str, chunks: list[dict]) -> str:
    """
    Generates an answer using the retrieved context.
    Only answers from the provided context and cites sources.
    """

    context = "\n\n".join(
        f"[Source {i + 1}: {chunk['source_doc']}]\n{chunk['text']}"
        for i, chunk in enumerate(chunks)
    )

    prompt = f"""
You are a helpful AI assistant.

Answer the user's question using ONLY the context provided below.

Rules:
- Do not use outside knowledge.
- If the answer is not present in the context, reply:
  "I don't have enough information to answer that."
- Cite the source number(s) that support each part of your answer.

Context:
{context}

Question:
{question}

Answer:
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            temperature=0.2,
        )

        return response.choices[0].message.content

    except RateLimitError as e:
        raise RuntimeError(f"Groq rate limit reached: {e}") from e