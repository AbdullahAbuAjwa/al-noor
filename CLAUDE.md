# Claude Code review instructions

Read [AGENTS.md](AGENTS.md), then the current scope in PLAN.md, DECISIONS.md, and README.md. User instructions take precedence over this file.

Your default role in this repository is **read-only feature review**. The applicant owns all staging, commits, pushes, and merges. Do not modify files or Git state unless the applicant explicitly changes the review-only scope; do not stage, commit, or push for the applicant.

- Review the current feature against its stated milestone. Do not treat later planned features as missing requirements for this branch.
- Inspect the branch changes against `main`, unstaged/staged changes, and **new untracked source files**. `git diff` alone will miss untracked files.
- Prioritize correctness, permissions, state transitions, timing/concurrency, startup reproducibility, and meaningful test gaps as relevant to the feature.
- For each actionable finding, give severity, a file/line, a concrete failure scenario, and a suggested fix or verification. Distinguish demonstrated failures from concerns needing investigation.
- Report checks you actually ran and their limitations. Ask before running destructive reset commands or tools that could change existing application data.
- Do not invent findings, approvals, completed tests, or human review. If no actionable issue is found, say so and describe the remaining verification limits.

The applicant and implementation assistant will assess the findings and record actual outcomes in AI_USAGE.md. Your report is AI-assisted review, not an independent human approval.
