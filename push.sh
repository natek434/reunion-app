#!/bin/bash

IMAGE="ghcr.io/natek434/reunion-app:latest"
MAX_RETRIES=5
DELAY=30
TIMEOUT=300  # seconds
LOGFILE="ghcr_push.log"

echo "Starting push for $IMAGE..."
echo "Log file: $LOGFILE"
echo "----------------------------------------" | tee -a "$LOGFILE"

for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i: Pushing..." | tee -a "$LOGFILE"

  # Start push and stream output to both terminal and log
  {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Attempt $i" 
    time docker push "$IMAGE"
  } 2>&1 | tee -a "$LOGFILE" &
  
  PUSH_PID=$!
  SECONDS_WAITED=0

  while kill -0 "$PUSH_PID" 2>/dev/null; do
    sleep 5
    SECONDS_WAITED=$((SECONDS_WAITED + 5))
    if [ "$SECONDS_WAITED" -ge "$TIMEOUT" ]; then
      echo "Push stalled after $TIMEOUT seconds. Killing process..." | tee -a "$LOGFILE"
      kill -9 "$PUSH_PID"
      break
    fi
  done

  wait "$PUSH_PID"
  EXIT_CODE=$?

  if [ "$EXIT_CODE" -eq 0 ]; then
    echo "✅ Push succeeded on attempt $i." | tee -a "$LOGFILE"
    exit 0
  else
    echo "❌ Push failed. Retrying in $DELAY seconds..." | tee -a "$LOGFILE"
    sleep "$DELAY"
  fi
done

echo "🚫 All $MAX_RETRIES attempts failed. Check $LOGFILE for details." | tee -a "$LOGFILE"
exit 1

