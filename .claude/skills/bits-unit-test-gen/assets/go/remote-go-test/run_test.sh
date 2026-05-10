#!/usr/bin/env bash

set -ex

# ==============================================================================
# Module: Argument Parsing
# ==============================================================================

if [ "$#" -lt 4 ]; then
    echo "Usage: $0 <utree_path> <pipeline_file> <job_id> <result_dir> [target_type] [target_path] [pattern]"
    echo "  utree_path:    Absolute path to the utree CLI binary"
    echo "  pipeline_file: Path to the pipeline configuration file (relative to PROJECT_ROOT or absolute)"
    echo "  job_id:        Job identifier in pipeline_file"
    echo "  result_dir:    Absolute path to the result output directory"
    echo "  target_type:   pipeline | directory | package | file (inferred from user request)"
    echo "  target_path:   Path to the target (relative to PROJECT_ROOT or absolute; defaults to repo root). When `target_type` is `pipeline`, this equals `repo_path`; for `directory` or `package`, it is the folder path; for `file`, it is the specific test file path."
    echo "  func:          Func name pattern (e.g. \"TestFuncA|TestFuncB\", empty for all)"
    exit 1
fi

UTREE_PATH="$1"
PIPELINE_FILE="$2"
JOB_ID="$3"
RESULT_DIR="$4"
TARGET_TYPE="${5:-pipeline}"
TARGET_PATH="${6:-}"
FUNC="${7:-}"

# Validate utree_path exists and is executable
if [ ! -x "$UTREE_PATH" ]; then
    cat <<EOF
{
  "status": "error",
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0
  },
  "error_message": "utree not found or not executable at: $UTREE_PATH"
}
EOF
    exit 1
fi

# Make pipeline_file absolute if it is not
if [[ "$PIPELINE_FILE" != /* ]]; then
    if [ -n "$PROJECT_ROOT" ]; then
        PIPELINE_FILE="$PROJECT_ROOT/$PIPELINE_FILE"
    else
        echo "Error: pipeline_file is relative but PROJECT_ROOT is not set"
        exit 1
    fi
fi

if [ -z "$TARGET_PATH" ]; then
    TARGET_PATH="${PROJECT_ROOT:-$(pwd)}"
fi

# Make target_path absolute if it is not
if [[ "$TARGET_PATH" != /* ]]; then
    if [ -n "$PROJECT_ROOT" ]; then
        TARGET_PATH="$PROJECT_ROOT/$TARGET_PATH"
    else
        echo "Error: target_path is relative but PROJECT_ROOT is not set"
        exit 1
    fi
fi

if [ "$TARGET_TYPE" = "file" ]; then
    if [[ "$TARGET_PATH" != *_test.go ]]; then
        TARGET_PATH="${TARGET_PATH%.go}_test.go"
    fi
fi

# ==============================================================================
# Module: Test Execution
# ==============================================================================
# Validate result_dir is an absolute path
if [[ "$RESULT_DIR" != /* ]]; then
    echo "Error: result_dir must be an absolute path ($RESULT_DIR)"
    exit 1
fi
mkdir -p "$RESULT_DIR"

# Execute utree remote-test, passing all remaining arguments
cd "${PROJECT_ROOT:-$(pwd)}"
"$UTREE_PATH" remote-test \
    --pipeline_file="$PIPELINE_FILE" \
    --job_id="$JOB_ID" \
    --result_dir="$RESULT_DIR" \
    --target_type="$TARGET_TYPE" \
    --target_path="$TARGET_PATH" \
    --func="$FUNC" \
    --agent \
    > "$RESULT_DIR/remote_run_output.log" 2>&1

# ==============================================================================
# Module: Output Results
# ==============================================================================
REPORT_FILE="${RESULT_DIR}/agent_report.json"
if [ -f "$REPORT_FILE" ]; then
    cat "$REPORT_FILE"
else
    # Report file not generated due to an exception
    cat <<EOF
{
  "status": "error",
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0
  },
  "error_message": "agent_report.json file not generated"
}
EOF
fi