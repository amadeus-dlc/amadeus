# Security Design — claude-print-live

## 上流契約

本設計は`business-logic-model.md:7-17`を入力とする。Claude print C5/C6は共通C2/C4/C8/C9、run-owned supervisor、bounded output collector、U02 contract kitを再利用する。

## Security Boundary

- `GITHUB_ACTIONS=true`と`AMADEUS_CLAUDE_PRINT_LIVE` gateを副作用前に評価する。
- `CredentialSourcePort`のopaque bindingだけをchild envへ射影し、source settings/auth pathを読まない（`business-logic-model.md:8-10`）。
- scratch `.claude/settings.json`と`--setting-sources project`、`--tools ""`、`--no-session-persistence`でuser/local settingsとtool executionを遮断する。
- argv/env/cwdはclosed `SpawnSpec`、processはsupervisor-owned group、stdout/stderrはraw-byte上限とincremental digestでboundedにする。
- JSON schema、exit 0、`is_error=false`、turn count、structured outputをcurrent-run anchorとし、prose-only successを拒否する（`business-logic-model.md:11-12`）。
- timeout、output overflow、schema mismatch、leak、cleanup failureはnon-green receiptとなり、credential/process残存0を必須にする。

## Threat Verification

ambient env、source settings、tool enable、session persistence、secret leak、stale JSON、output flood、leader/supervisor crashをmutant redにする。AWS/IAM、HTTP、database、persistent serviceは非適用。
