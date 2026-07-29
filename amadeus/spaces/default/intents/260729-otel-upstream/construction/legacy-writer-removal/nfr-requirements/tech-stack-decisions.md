# Tech Stack Decisions — U8: legacy-writer-removal

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun `1.3.13`・TypeScript `^6.0.3`・Biome・`bun test`＋自作 4 層ランナー・GitHub Actions）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| 新規依存 | なし。ゲート判定器・評価器・retention 判定器はすべて TypeScript＋Bun test の既存スタックで実装する | 判定器は純粋な静的検査・fixture 検査であり、外部ライブラリを要さない（technology-stack.md 冒頭断面どおり現行 `@opentelemetry` 依存も本 Unit では追加しない） |
| ゲート評価の実装形態 | 六 checker を独立した Bun test／CI 検査として実装し、評価器が `ConditionResult` を集約して機械可読 JSON（`GateEvaluationReport`）を CI artifact として出力する | FR-MIG-4、BR-2、BR-16 |
| report フォーマット | JSON（schema 検証付き）。CI artifact として永続化し、削除 commit から参照可能にする | BR-16、security-requirements.md |
| CI 配線 | ゲート評価は `--ci` 層（smoke+unit+integration）と既存 CI workflow（`.github/workflows/ci.yml`）に統合し、e2e 層・live model・ネットワークに依存しない | FR-MIG-4 の CI 機械検証要求、performance-requirements.md のオフライン制約 |
| 配布（FR-DST-2） | 本 Unit は `packages/framework/core/` 配下の旧 writer・`migration-adapter.ts` 互換層・v1 reader を**削除**する。削除に伴い各 harness の manifest マッピングから当該エントリを除去し、`bun scripts/package.ts` で全生成面（dist 7 harness＋self-install 面）を再生成、`package.ts --check`／`promote:self:check` の drift guards を通過する。ゲート条件 (f) はこの検証そのものである | FR-DST-2、VER-6、BR-11 |

## 既存スタックとの整合

- 判定器は判定ロジック本体より先に失敗するテストを書き、同一コミットで red-green とする（BR-15、team-practices ## Testing Posture）
- コメントは英語、1 ファイル 1 責務、判別ユニオン（`ConditionResult { condition, verdict, evidence, detail }`）で結果を表現する（team-practices ## Code Style）
- rollback は git revert＋変換前 backup のみで、復旧用の新規ツール・新規 storage は導入しない（BR-3）
