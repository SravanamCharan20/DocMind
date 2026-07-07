import json
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from app.retrieval import hybrid_search, build_bm25_index
from app.rerank import rerank_chunks
from app.generate import generate_answer
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, AnswerRelevancy

load_dotenv()

evaluator_llm = LangchainLLMWrapper(
    ChatGroq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
)
evaluator_embeddings = LangchainEmbeddingsWrapper(
    HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
)



build_bm25_index()  # this script runs standalone, outside FastAPI, so nothing has indexed BM25 yet

with open("eval/test_questions.json") as f:
    questions = json.load(f)

data = {"question": [], "answer": [], "contexts": []}

for q in questions:
    hybrid_results = hybrid_search(q)
    reranked_results = rerank_chunks(q, hybrid_results)
    answer = generate_answer(q, reranked_results)

    data["question"].append(q)
    data["answer"].append(answer)
    data["contexts"].append([c["text"] for c in reranked_results])

    print(f"Processed: {q}")

dataset = Dataset.from_dict(data)
answer_relevancy_metric = AnswerRelevancy(strictness=1)


result = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy_metric],
    llm=evaluator_llm,
    embeddings=evaluator_embeddings,
)
print(result)

df = result.to_pandas()
df.to_csv("eval/eval_results.csv", index=False)
print("\nSaved detailed results to eval/eval_results.csv")