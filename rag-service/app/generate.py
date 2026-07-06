import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_answer(question: str, chunks: list[dict]) -> str:
    context = "\n\n".join(
        f"[Source {i+1}: {c['source_doc']}]\n{c['text']}" for i, c in enumerate(chunks)
    )

    prompt = f"""You are a helpful assistant answering questions using ONLY the context below.
If the answer is not contained in the context, say "I don't have enough information to answer that."
Cite which source number supports each part of your answer.

Context:
{context}

Question: {question}

Answer:"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return response.choices[0].message.content