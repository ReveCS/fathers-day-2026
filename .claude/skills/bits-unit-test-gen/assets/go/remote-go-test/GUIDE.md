---
name: remote go test
description: Execute Go unit tests in a remote environment, perfectly compatible with local environment limitations, with results fully consistent with CI pipeline unit test behavior
allowed-tools:
  - Read
  - Write
  - Bash
version: 1.0.0
---

# Remote Go Test

Run Go unit tests in a remote CI environment via `run_test.sh`. Running `go test` locally is **forbidden**.

## Script

`${GUIDE_DIR}/run_test.sh` (located in the same directory as this GUIDE.md)

## Parameters

| # | Name            | Required | Description                                                                                                                                                                                                                                  |
|---|-----------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | `utree_path`    | Yes      | Fixed: `${SKILL_ROOT}/scripts/utree`                                                                                                                                                                                                         |
| 2 | `pipeline_file` | Yes      | Path to the pipeline configuration file (relative to PROJECT_ROOT or absolute, under `.codebase/pipelines/`)                                                                                                                                 |
| 3 | `job_id`        | Yes      | Job identifier in pipeline_file. ⚠️ MUST pass `""` (empty string) unless the user explicitly provides a job ID that exists in the pipeline YAML. Do NOT infer or fabricate.                                                                  |
| 4 | `result_dir`    | Yes      | Absolute path to the result output directory. You MUST create a temporary directory via `mktemp -d` before invoking the script and pass it as this parameter.                                                                                |
| 5 | `target_type`   | Yes      | `pipeline` \| `directory` \| `package` \| `file` (default: `pipeline`)                                                                                                                                                                       |
| 6 | `target_path`   | Yes      | Path to target (relative to PROJECT_ROOT or absolute; defaults to repo root). When `target_type` is `pipeline`, this equals `repo_path`; for `directory` or `package`, it is the folder path; for `file`, it is the specific test file path. |
| 7 | `func`          | No       | Func name pattern (e.g. `"TestFuncA\|TestFuncB"`, empty for all)                                                                                                                                                                             |

### Parameter Inference Rules

If parameters cannot be inferred from the user's request:

* **`pipeline_file`** — Read yaml files under `.codebase/pipelines/` and select by priority:
    1. AGENTS.md or CLAUDE.md specifies the CI file for remote unit test execution
    2. Filename or comments indicate it is for bits-ut remote testing
    3. `go test` command in the CI file contains the user's test target
    4. `trigger.change.paths` covers the test target path
    5. If still unclear, ask the user
* **`job_id`** — ⚠️ **HARD CONSTRAINT**: ALWAYS pass empty string `""`. Do NOT guess, infer, or fabricate a job ID (e.g.
  do NOT use "unit_test" or any other invented value). Only pass a non-empty value if the user explicitly provides one
  that exists in the pipeline YAML file.
* **`target_type` / `target_path`** — Ask the user for the specific test target

## Invocation Steps

You MUST follow these steps **in exact order across separate responses**. Do NOT combine Step 1 and Step 2 into the same
response.

---

**Step 1: Create temp directory + Send progress message to the user**

In this response, you must do ONLY the following — do NOT call the test script yet:

1. Create a temporary directory:

```bash
RESULT_DIR=$(mktemp -d)
```

2. Output the following message to the user (replace `<PIPELINE_FILE>` and `<RESULT_DIR>` with actual values):

"*The unit test execution script has been launched in the background. The remote CI file used is `<PIPELINE_FILE>` (
configurable in AGENTS.md). If the execution log is not updating in real-time, you can
check `<RESULT_DIR>/remote_run_output.log` for live progress at any time.*"

> ⚠️ **HARD CONSTRAINT**: This response MUST NOT contain any call to `run_test.sh`. The script execution belongs to Step
> 2 below, which happens in the NEXT response.

---

**Step 2: Execute the test script (NEXT response)**

In your next response (after Step 1 has been sent to the user), execute:

```bash
AGENT_SOURCE=<agent_name> MODEL_SOURCE=<model_name> PROJECT_ROOT=${PROJECT_ROOT} ${GUIDE_DIR}/run_test.sh "${SKILL_ROOT}/scripts/utree" "<pipeline_file>" "<job_id>" "$RESULT_DIR" "<target_type>" "<target_path>" "<func>"
```

> ⚠️ **HARD CONSTRAINT — Environment Variables**:
> - `AGENT_SOURCE` MUST be set to one of: `trae`, `traecli`, `codex`, `claude code`, `aime`, `coze`, `unknown`. Do NOT
    omit or leave empty.
> - `MODEL_SOURCE` MUST be set to the actual model name (e.g. `gpt-4o`, `claude-sonnet-4-20250514`). Do NOT omit or
    leave empty.
> - `PROJECT_ROOT` MUST use the environment variable of the same name (`${PROJECT_ROOT}`). Do NOT omit or hardcode a
    path.
> - If either variable is missing, the script execution will be recorded without proper attribution.

> After the script finishes, you MUST read and analyze the output before considering this skill invocation complete.

---

## Return Results

The script outputs a JSON string to stdout:

```json
{
  "status": "success",
  "summary": {
    "total": 10,
    "passed": 9,
    "failed": 1,
    "skipped": 0
  },
  "exceptions": [
    {
      "message": "...",
      "faq": "...",
      "suggestion": "..."
    }
  ],
  "failed_detail_file": "/path/to/failed_detail.md"
}
```

| Field                | Description                                                              |
|----------------------|--------------------------------------------------------------------------|
| `status`             | `"success"` (completed, may have failures) or `"failure"` (system error) |
| `summary`            | Execution counts: total, passed, failed, skipped                         |
| `exceptions`         | Present on `"failure"` — error details and suggestions                   |
| `failed_detail_file` | Path to Markdown file with failure logs (when `failed > 0`)              |

## Handling Strategy

1. **Parse** the JSON output from `run_test.sh`.
2. **Read failures**: If `summary.failed > 0`, read the file at `failed_detail_file`.
