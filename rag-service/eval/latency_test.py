import json
import time
import requests
import statistics


with open("eval/test_questions.json") as f:
    questions = json.load(f)

latencies = []
failures = 0

for q in questions:
    start = time.time()
    try:
        response = requests.get("http://127.0.0.1:8000/query", params={"q": q}, timeout=30)
        elapsed = time.time() - start
        if response.status_code == 200:
            latencies.append(elapsed)
            print(f"{elapsed:.2f}s - {q}")
        else:
            failures += 1
            print(f"FAILED ({response.status_code}) - {q}")
    except Exception as e:
        failures += 1
        print(f"FAILED (exception: {e}) - {q}")


total = len(latencies) + failures
failure_rate = failures / total * 100

if latencies:
    p50 = statistics.median(latencies)
    p95 = statistics.quantiles(latencies, n=100)[94]  # 95th percentile
else:
    p50 = p95 = None

print("\n--- Latency Report ---")
print(f"Total requests: {total}")
print(f"Successful: {len(latencies)}")
print(f"Failed: {failures} ({failure_rate:.1f}%)")
if p50 is not None:
    print(f"P50 (median) latency: {p50:.2f}s")
    print(f"P95 latency: {p95:.2f}s")