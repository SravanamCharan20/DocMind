import json
import sys
import time
import requests
import statistics

# Same reasoning as run_eval.py: /query is now space-scoped, so this needs a
# real space_id (copy one from the frontend URL: /spaces/<space_id>).
# Optionally pass a base URL as a second argument to hit a deployed instance
# instead of localhost, e.g.:
#   python -m eval.latency_test <space_id> https://your-space.hf.space
if len(sys.argv) < 2:
    print("Usage: python -m eval.latency_test <space_id> [base_url]")
    sys.exit(1)

SPACE_ID = sys.argv[1]
BASE_URL = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8000"

with open("eval/test_questions.json") as f:
    questions = json.load(f)

latencies = []
failures = 0

for q in questions:
    start = time.time()
    try:
        response = requests.get(
            f"{BASE_URL}/query", params={"q": q, "space_id": SPACE_ID}, timeout=30
        )
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