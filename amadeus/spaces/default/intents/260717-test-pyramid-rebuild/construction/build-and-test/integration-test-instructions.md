上流入力(consumes 全数): U1-size-ledger/code-generation/code-generation-plan.md, U1-size-ledger/code-generation/code-summary.md, U2-layer-spec-gate/code-generation/code-generation-plan.md, U2-layer-spec-gate/code-generation/code-summary.md, U3-migration-coverage/code-generation/code-generation-plan.md, U3-migration-coverage/code-generation/code-summary.md

# Integration Test 手順

## 適用範囲

- 実FS、subprocess、複数component間契約、CLI round-tripはintegration層で検証する。
- U1/U3のcollector境界は `t221-metrics-snapshot.integration.test.ts`、現在のresume round-tripは `t118.test.ts` が正本である。
- U3の`migrationQueue` 95件は`open-review`中の非actionable可視化であり、このstageで実移設しない。

## フレームワークと設定

- Bun 1.3.13の既存integration runnerを使い、新規依存・test config・service fixtureは追加しない。
- targeted runは `--filter '^t118\.test\.ts$'`、full tierは `--integration` を使い、いずれもserialで実行する。
- exact-ref collector testはU1のrepo外exportに閉じ、current worktreeの同名fileを証拠へ代用しない。

## 実行コマンド

まず変更境界をtargetedに実行し、その後にtier全体をserialで実行する。

```bash
bun tests/run-tests.ts --integration --filter '^t118\.test\.ts$'
bun tests/run-tests.ts --integration
```

exact measurement refのcollector境界は、unit 4件と同じexport内で次を実行する。

```bash
bun test tests/integration/t221-metrics-snapshot.integration.test.ts
```

## 合格条件と既知baseline

- targeted `t118` は全case成功し、resume回答がstate/auditを変更せず、次の`next`が同じstageを返す。
- tier全体はexit 0、failed 0を合格条件とする。
- U2 historical baselineでは `t-team-up-codex-resume.test.ts` と `t-team-up-msg-backend.test.ts` が計5 assertion失敗し、24 filesがsubstrate理由でskipした。これは本runをPASSへ縮退させる免責ではなく、比較用の既知baselineに限る。
- integration単独LCOV pathはPENDING。combined coverageの実測と混同しない。

## 環境と副作用

- unfiltered integrationはClaude/AWS preflightを含み、認証済み環境では外部substrateやtokenを使う可能性がある。
- skipは理由とfile数を保存し、assertion-level skipをrunnerが公開しない場合はN/Aとする。
- retryやoutlier除外は行わず、赤は当該runのログで再帰属する。
