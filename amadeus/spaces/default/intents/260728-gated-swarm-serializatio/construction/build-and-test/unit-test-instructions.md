# Unit Test Instructions — 260728-gated-swarm-serializatio

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 対象テストは code-summary.md「テスト」節の実 diff(t211/t33 拡張、t116/t120 seed 追加)から転記。

## 対象と実行

- `bun test tests/unit/t211-swarm-batch-progress.test.ts` — gated fan-out / バッチ末尾ゲート / 承認後前進 / 台帳 fail-closed / 本ゲート単一 / ladder 再発火 / デッドロック回帰(d/e/f/g/h/j/k/l)+ autonomous 回帰(a/b/c 無改変)
- `bun test tests/unit/t33.test.ts` — approve-batch CLI 契約(GATE_APPROVED / state 記録 / 追記 / 冪等)+ set-autonomy 既存契約
- `bun test tests/unit/t186-foreach-per-unit-iteration.test.ts` — 無改変回帰(6/6b/12/13)
- `bun test tests/unit/t116-directive-path-resolution.test.ts` — ローカル seed 追加後の回帰

## 判定

全 pass(fail 0)。落ちる実証の再現手順は code-summary.md「テスト」節(pre-fix 面切替、checkout 限定)を参照。
