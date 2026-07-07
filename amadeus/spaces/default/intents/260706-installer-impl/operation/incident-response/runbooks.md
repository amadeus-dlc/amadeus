# Runbooks — @amadeus-dlc/setup

## Upstream Inputs

- `dashboards.md`: gate summary、GHA run ページ
- `alarms.md`: ALM-* alarm ID
- U7 `reliability-design.md`: failure classes
- U8 `deployment-architecture.md`: release states

## RB-001: PR CI Gate Failure

**Trigger**: ALM-CI-001 / ALM-CI-002  
**Severity**: P1

### Steps

1. GitHub PR checks で失敗 job を特定（`check` vs `installer-gates`）
2. 失敗時 artifact `.amadeus-ci/setup/` をダウンロード
3. `jq '.blockingFailures' gate-summary.json` で blocking gate を確認
4. 該当 gate script を local 再実行:
   ```bash
   bun packages/setup/src/maintainer/run-installer-gates.ts \
     --change-set .amadeus-ci/setup/change-set.json \
     --summary /tmp/gate-summary.json
   ```
5. 修正 PR を push → CI green 確認

### Exit criteria

PR checks 全 green。

## RB-002: Dependency Audit Failure

**Trigger**: ALM-SEC-001  
**Severity**: P1

### Steps

1. `dependency-audit.json` で advisoryId / package / severity 確認
2. 修正可能なら dependency update + lockfile
3. 例外が正当なら `vulnerability-allowlist.json` に entry 追加（owner + expiry + reason）
4. `bun packages/setup/src/maintainer/security-gate.ts audit ...` local 再実行

## RB-003: Secret Scan Failure

**Trigger**: ALM-SEC-002  
**Severity**: P0

### Steps

1. `secret-findings.json` で path / line / fingerprint 確認（値は見ない）
2. 該当 secret をソースから除去 + git history 対応
3. 漏洩した credential を rotation
4. 再 scan pass 確認

## RB-004: Bad npm Publish

**Trigger**: ALM-REL-003  
**Severity**: P0

### Steps

`rollback-runbook.md` Scenario 1 に従う:

1. dist-tag を last-good version に戻す
2. 問題 version を deprecate
3. 修正を patch version で publish

## RB-005: Release Preflight Failure

**Trigger**: ALM-REL-001  
**Severity**: P1

### Steps

1. `release-setup` workflow run の `release-preflight` job ログ確認
2. 失敗 gate を local 再現（`deployment-log.md` pre-checks）
3. `dry_run:true` で再 dispatch し green 確認

## RB-006: End-User Install Failure

**Trigger**: user report（no automated alarm）  
**Severity**: P2

### Steps

1. ユーザーから harness / error reason / `--yes`/`--force` 有無を収集
2. classified error の next action を確認（U5 reporter）
3. collision → `--force` または interactive resolve を案内
4. regression なら issue + unit test 追加
