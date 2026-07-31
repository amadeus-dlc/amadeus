# Scalability Design — U1 perf-tier-and-migration

上流入力(consumes 全数): business-logic-model.md(U1 FD)。nfr-requirements 5成果物は本 scope(self-feature)で同ステージ SKIP のため設計上不存在(engine の consumes_absent expected:true)— fallback として requirements.md の NFR 節と #1830/#1835 実測を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## スケール軸

- perf tier のファイル数増加: levelFiles の readdir 走査は既存 e2e と同型で線形 — business-logic-model.md ロジック1 の設計で追加ファイルは自動編入(台帳管理不要)
- perf テスト自体の増加は perf.yml 実行時間にのみ影響(U2 の timeout 25min が上限、超過時は loud fail が増設の合図)

## 非採用

分散実行・シャーディングは導入しない — 現行 perf 層の実測合計(CI 最悪 ~9分)に対し過剰(cid:nfr-design:c1)。
