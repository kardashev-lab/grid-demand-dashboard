#!/usr/bin/env bash
# delete the aggregator pod and time how long until /api/health is back
set -euo pipefail

NAMESPACE="${NAMESPACE:-grid-demand}"
LOG_DIR="${LOG_DIR:-experiments}"

mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/chaos-$(date +%Y%m%d-%H%M%S).log"

cleanup() {
  if [[ -n "${PF_PID:-}" ]] && kill -0 "$PF_PID" 2>/dev/null; then
    kill "$PF_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo ">>> port-forwarding aggregator" | tee -a "$LOG"
kubectl -n "$NAMESPACE" port-forward svc/aggregator 3000:3000 >/dev/null 2>&1 &
PF_PID=$!
for _ in {1..20}; do
  if curl -sf http://127.0.0.1:3000/api/health >/dev/null; then break; fi
  sleep 0.5
done

echo ">>> baseline /api/demand" | tee -a "$LOG"
curl -s http://127.0.0.1:3000/api/demand | tee -a "$LOG"; echo | tee -a "$LOG"

echo ">>> deleting aggregator pod(s)" | tee -a "$LOG"
kubectl -n "$NAMESPACE" delete pod -l app=aggregator --wait=false | tee -a "$LOG"

# port-forward dies with the old pod, restart it
kill "$PF_PID" 2>/dev/null || true
sleep 1
kubectl -n "$NAMESPACE" port-forward svc/aggregator 3000:3000 >/dev/null 2>&1 &
PF_PID=$!

start_ns=$(date +%s%N)
deadline=$(( $(date +%s) + 90 ))
recovered_ms=""
while [[ $(date +%s) -lt $deadline ]]; do
  if curl -sf -m 1 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    end_ns=$(date +%s%N)
    recovered_ms=$(( (end_ns - start_ns) / 1000000 ))
    break
  fi
  sleep 0.2
done

if [[ -z "$recovered_ms" ]]; then
  echo ">>> FAILED: aggregator did not recover within 90s" | tee -a "$LOG"
  kubectl -n "$NAMESPACE" get pods -l app=aggregator | tee -a "$LOG"
  exit 1
fi

echo ">>> recovered in ${recovered_ms} ms" | tee -a "$LOG"

echo ">>> /api/demand after recovery (consumer group should have replayed)" | tee -a "$LOG"
curl -s http://127.0.0.1:3000/api/demand | tee -a "$LOG"; echo | tee -a "$LOG"

kubectl -n "$NAMESPACE" get pods -l app=aggregator | tee -a "$LOG"
echo ">>> log: $LOG"
