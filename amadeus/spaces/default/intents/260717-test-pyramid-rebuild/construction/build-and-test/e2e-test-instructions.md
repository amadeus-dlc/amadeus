上流入力(consumes 全数): U1-size-ledger/code-generation/code-generation-plan.md, U1-size-ledger/code-generation/code-summary.md, U2-layer-spec-gate/code-generation/code-generation-plan.md, U2-layer-spec-gate/code-generation/code-summary.md, U3-migration-coverage/code-generation/code-generation-plan.md, U3-migration-coverage/code-generation/code-summary.md

# End-to-End Test 手順

## 適用範囲

Comprehensive strategyとして既存のfull lifecycle、worktree、rendered terminal journeyを確認する。U1〜U3には新規E2E surfaceがないため、新規caseは作らない。

## フレームワークと設定

- Bun 1.3.13の既存E2E runnerとpreflightを使い、新規依存・test config・外部credentialは追加しない。
- `--e2e` tierだけをserial実行し、runnerが判定したsubstrate availabilityを尊重する。
- coverage目標は現行経路ではNOT EXECUTEDであり、E2E成功をline coverageの達成へ読み替えない。

## 実行コマンド

```bash
bun tests/run-tests.ts --e2e
```

## 合格条件

- exit 0、failed 0。
- substrate不足によるskipはfile数と理由を記録し、完全観測やPASSへ置き換えない。
- U2 historical baselineの33 skipは比較情報のみで、現在runの件数を事前入力しない。
- `coverage:ci` はe2eを実行しないため、e2e coverageはNOT EXECUTED。per-tier pathはPENDINGである。

## 環境とデータ

- Claude/AWS/tmux/TUI substrateのpreflight結果を保存する。
- live substrateが有効な場合は外部token・時間を消費しうるため、無制限retryをしない。
- testは一時worktree/fixtureを自身で片付け、versioned treeへ生成物を残さない。
