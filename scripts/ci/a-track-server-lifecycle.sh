# A-track browser QA server lifecycle helpers.
# This file is sourced from bash steps in .github/workflows/a-track-p0-validation.yml.

atrack_port_3000_is_open() {
  (echo > /dev/tcp/127.0.0.1/3000) >/dev/null 2>&1
}

atrack_assert_port_3000_free() {
  if atrack_port_3000_is_open; then
    echo "FAIL-CLOSED: port 3000 is already occupied before A-track server launch" >&2
    return 1
  fi
}

atrack_start_server_group() {
  local log_file="$1"
  local pid_file="$2"
  local ready_url="$3"
  local server_pid

  atrack_assert_port_3000_free || return 1
  if ! command -v setsid >/dev/null 2>&1; then
    echo "FAIL-CLOSED: setsid is required for A-track server process-group ownership" >&2
    return 1
  fi

  setsid npm start >"$log_file" 2>&1 &
  server_pid=$!
  printf '%s\n' "$server_pid" >"$pid_file"

  for attempt in {1..60}; do
    if ! kill -0 "$server_pid" 2>/dev/null; then
      cat "$log_file"
      echo "FAIL-CLOSED: intended A-track server process exited before readiness" >&2
      return 1
    fi

    if curl --fail --silent --show-error "$ready_url" >/dev/null; then
      if ! kill -0 "$server_pid" 2>/dev/null; then
        cat "$log_file"
        echo "FAIL-CLOSED: readiness was served after intended A-track server exited" >&2
        return 1
      fi
      return 0
    fi

    sleep 1
  done

  cat "$log_file"
  echo "FAIL-CLOSED: intended A-track server did not become ready" >&2
  return 1
}

atrack_stop_server_group() {
  local pid_file="$1"
  local server_pid

  if [ ! -f "$pid_file" ]; then
    return 0
  fi

  server_pid="$(cat "$pid_file")"
  kill -- -"$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
  rm -f "$pid_file"

  for attempt in {1..20}; do
    if ! atrack_port_3000_is_open; then
      return 0
    fi
    sleep 0.1
  done

  echo "FAIL-CLOSED: port 3000 is still occupied after A-track server cleanup" >&2
  return 1
}
