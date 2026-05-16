#!/usr/bin/env bash
# hammer /api/demand and capture latency + HPA scaling metrics
# usage: ./scripts/load-test.sh
#        DURATION=120 CONCURRENCY=80 ./scripts/load-test.sh
set -euo pipefail

NAMESPACE="${NAMESPACE:-grid-demand}"
DURATION="${DURATION:-60}"
CONCURRENCY="${CONCURRENCY:-50}"
SAMPLE_INTERVAL="${SAMPLE_INTERVAL:-5}"
TARGET="${TARGET:-}"
LOG_DIR="${LOG_DIR:-experiments}"

mkdir -p "$LOG_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
LOG="$LOG_DIR/load-test-$STAMP.log"
LATENCY_CSV="$LOG_DIR/load-test-$STAMP-latency.csv"
SAMPLE_CSV="$LOG_DIR/load-test-$STAMP-samples.csv"

cleanup() {
  for pid in "${SAMPLER_PID:-}" "${PF_PID:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT

# port-forward unless TARGET is set
if [[ -z "$TARGET" ]]; then
  echo ">>> port-forwarding aggregator (3000)" | tee -a "$LOG"
  kubectl -n "$NAMESPACE" port-forward svc/aggregator 3000:3000 >/dev/null 2>&1 &
  PF_PID=$!
  for _ in {1..20}; do
    if curl -sf http://127.0.0.1:3000/api/health >/dev/null; then break; fi
    sleep 0.5
  done
  TARGET="http://127.0.0.1:3000"
fi

echo ">>> initial state" | tee -a "$LOG"
kubectl -n "$NAMESPACE" get deploy aggregator -o wide | tee -a "$LOG"
kubectl -n "$NAMESPACE" get hpa aggregator | tee -a "$LOG" || true

# background sampler grabs replicas + cpu every SAMPLE_INTERVAL seconds
echo "ts,replicas,cpu_pct,cpu_total_m,mem_total_mi" > "$SAMPLE_CSV"
(
  while true; do
    ts=$(date +%s)
    replicas=$(kubectl -n "$NAMESPACE" get deploy aggregator -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    cpu_pct=$(kubectl -n "$NAMESPACE" get hpa aggregator -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}' 2>/dev/null || echo "")
    top_out=$(kubectl -n "$NAMESPACE" top pods -l app=aggregator --no-headers 2>/dev/null || true)
    cpu_total=$(echo "$top_out" | awk '{gsub("m","",$2); s+=$2} END {print s+0}')
    mem_total=$(echo "$top_out" | awk '{gsub("Mi","",$3); s+=$3} END {print s+0}')
    echo "$ts,${replicas:-0},${cpu_pct:-},$cpu_total,$mem_total" >> "$SAMPLE_CSV"
    sleep "$SAMPLE_INTERVAL"
  done
) &
SAMPLER_PID=$!

# load generation
echo "latency_ms,http_code" > "$LATENCY_CSV"
echo ">>> hammering $TARGET/api/demand for ${DURATION}s @ concurrency ${CONCURRENCY}" | tee -a "$LOG"
LOAD_START=$(date +%s)
end=$(( LOAD_START + DURATION ))

worker() {
  local out="$1"
  while [[ $(date +%s) -lt $end ]]; do
    local line
    line=$(curl -s -o /dev/null -w "%{time_total} %{http_code}" "$TARGET/api/demand" 2>/dev/null || echo "0 000")
    local secs="${line% *}"
    local code="${line##* }"
    local ms
    ms=$(awk -v s="$secs" 'BEGIN{printf "%d", s*1000}')
    echo "$ms,$code" >> "$out"
  done
}

for i in $(seq 1 "$CONCURRENCY"); do
  worker "$LATENCY_CSV" &
done
wait
LOAD_END=$(date +%s)

# let sampler grab one more reading then stop it
sleep "$SAMPLE_INTERVAL"
kill "$SAMPLER_PID" 2>/dev/null || true
wait "$SAMPLER_PID" 2>/dev/null || true

# summary
total_requests=$(($(wc -l < "$LATENCY_CSV") - 1))
elapsed=$(( LOAD_END - LOAD_START ))
throughput=$(awk -v r="$total_requests" -v s="$elapsed" 'BEGIN{ if (s>0) printf "%.1f", r/s; else print "0" }')

read -r p50 p95 p99 pavg pmax errors <<<"$(
  awk -F, 'NR>1 {
    n++; lat[n]=$1; sum+=$1; if ($1>max) max=$1;
    if ($2 !~ /^2/) errs++;
  }
  END {
    if (n==0) { print "0 0 0 0 0 0"; exit }
    asort(lat);
    p50 = lat[int(n*0.50)+0];
    p95 = lat[int(n*0.95)+0];
    p99 = lat[int(n*0.99)+0];
    avg = sum/n;
    printf "%d %d %d %.1f %d %d\n", p50, p95, p99, avg, max, (errs+0);
  }' "$LATENCY_CSV"
)"

# scale-up time = first sample where replicas > 1 after load started
scale_up_raw=$(awk -F, -v start="$LOAD_START" '
  NR>1 && $2+0 > 1 { print $1 - start; exit }
' "$SAMPLE_CSV")
if [[ -n "$scale_up_raw" ]]; then
  scale_up_line="${scale_up_raw}s after load start"
else
  scale_up_line="no scale-up observed within the run"
fi

peak=$(awk -F, 'NR>1 {if ($2+0 > m) m=$2+0} END {print m+0}' "$SAMPLE_CSV")
peak_cpu=$(awk -F, 'NR>1 {if ($3+0 > m) m=$3+0} END {print m+0}' "$SAMPLE_CSV")

{
  echo
  echo "================ load test summary ================"
  echo "duration:           ${elapsed}s   concurrency: $CONCURRENCY"
  echo "requests:           $total_requests   throughput: ${throughput} req/s   non-2xx: $errors"
  echo "latency (ms):       p50=$p50  p95=$p95  p99=$p99  avg=$pavg  max=$pmax"
  echo "replicas peak:      $peak   (HPA min=1, max=5)"
  echo "scale-up time:      $scale_up_line"
  echo "peak hpa cpu util:  ${peak_cpu}%"
  echo "latency csv:        $LATENCY_CSV"
  echo "samples csv:        $SAMPLE_CSV"
  echo "==================================================="
} | tee -a "$LOG"

echo ">>> log: $LOG"
