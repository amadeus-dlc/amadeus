# Build Instructions

## 入力成果物

この手順は、各 Unit の `code-generation-plan` と `code-summary` を入力として扱う。

対象 Unit は `U001-failure-evidence-foundation`、`U002-subagent-status-audit`、`U003-workflow-warning-traceability` である。

## 事前準備

依存は `bun.lock` と `package.json` に固定されている。

依存が未導入の場合は次を実行する。

```bash
bun install
```

OpenTelemetry の collector、dashboard、cloud infrastructure は build の前提にしない。

`AIDLC_TELEMETRY_TEST_FILE` は評価内で一時ファイルとして指定されるため、通常の build では設定不要である。

## Build Commands

TypeScript と契約の build readiness は次で確認する。

```bash
npm run typecheck
npm run lint:check
npm run contracts:check
npm run claude-wiring:check
```

差分の空白、改行、末尾空白は次で確認する。

```bash
npm run diff:check
```

## Build Verification

成功条件は、すべての command が exit code 0 で完了することである。

`npm run test:all` は `parity:check` を含むため、現在は parity hash 不一致で失敗する。

この失敗は build command の未実行ではなく、parity boundary の未解決状態として扱う。

## Troubleshooting

`typecheck` が失敗した場合は、`.agents/aidlc/tools` を import する評価スクリプトと `tsconfig.json` の整合を確認する。

`lint:check` が失敗した場合は、public type file と TypeScript complexity の出力を先に読む。

`contracts:check` が失敗した場合は、`amadeus-contracts` の生成物と参照元の差分を確認する。

`parity:check` が失敗した場合は、`dev-scripts/data/parity-map.json` を無断変更せず、対象ファイルと解決方針を成果物または PR に記録する。
