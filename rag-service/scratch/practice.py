from sentence_transformers import CrossEncoder

model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

question = "What is NDCG used for?"
chunk = "Benchmark Section - Retrieval Precision@5 - Recall@10 - MRR - NDCG - Average latency"
chunk2 = "Sourdough bread requires a live starter culture fed daily with flour and water."


scores = model.predict([
    (question, chunk),
    (question, chunk2)
    ])
print(scores)