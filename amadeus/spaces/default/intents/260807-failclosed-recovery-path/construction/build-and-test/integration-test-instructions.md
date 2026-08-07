# Integration Test Instructions — 260807-failclosed-recovery-path

上流入力(consumes 全数): 各 unit の `code-generation-plan.md` と `code-summary.md`。統合面(engine ↔ state ↔ record の跨ぎ)は code-summary.md の AC 実測表から導出した。

## 統合検証面

1. **#2358 宣言機構の end-to-end**: `t480` integration(328行)— 実 record レイアウトで `declare-units-done` → `next` のゲート発行/refuse 分岐を検証。加えて本 intent 自身が実地統合テストになっている: 本セッションで宣言済み state + 全 unit 成果物から `run-stage gate:true` が発行された(audit 実測)。
2. **#2330 実 store 回復**: 実 worktree `260805-subagent-type-guard` の schema 1 store(pending 3 / receipts 3)へ着地済み `recover-schema-1` を適用し `recovered:true` / schema 2 正常化を jq 実測済み(code-generation diary 2026-08-07T08:45:00Z)。
3. **#2313 着地面**: main reconcile success(Bolt 2 着地時の実地対照)+ CI の no-silent-drop gate green。

## 実行方法

- `bun test tests/integration/t480-*` および `tests/no-silent-drop-gate.ts` 経由の CI 面。フルスイートの正規判定は各 PR のマージ時 CI(green 実績)を正とし、ローカルでは focused 再実行のみ行う(`cid:build-and-test:bt-20260730-1` — brownfield バグバッチの Comprehensive 執行形)。

## 外部依存

- GitHub(`gh`)は本 intent のテスト対象外(pr-convergence plugin の観測は code-generation 側で完了・Issue #2401 参照)。
