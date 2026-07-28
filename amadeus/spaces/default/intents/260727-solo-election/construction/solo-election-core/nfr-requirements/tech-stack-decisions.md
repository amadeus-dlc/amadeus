# Tech Stack Decisions — solo-election-core (U1)

上流入力(consumes 全数): business-logic-model.md(tally 2体分岐・個数照合)、business-rules.md(BR-U1-1〜8 の検証列)、requirements.md(NFR-01〜03 の正本)、technology-stack.md(Bun/TS/ESM・テスト4層の実行環境)。

## 決定

| 項目 | 決定 | 根拠 |
|---|---|---|
| 実装言語・境界 | 既存 canonical(packages/framework/core/tools/)の TypeScript 純関数への内挿のみ。新規パッケージ・依存ゼロ | technology-stack.md(Bun/TS/ESM)、requirements.md FR-13 |
| テスト層 | tally 規則 = unit(t234 追加)、solo loop = integration(実 FS/CLI — cid:code-generation:fs-tests-integration-first)、実選挙実証 = 運用実測(スケルトンゲート) | business-rules.md 検証の層配置 |
| 形式検証 | TLA+/TLC(two-layer-verification-posture の既設ジョブ) — PBT 単独は不採用(cid:build-and-test:pbt-oracle-cancellation の既決) | business-logic-model.md TLA 節 |
| 配布 | dist 7面+self-install 5面の既存再生成経路(bun scripts/package.ts / promote:self) | requirements.md FR-13 |

## 不採用の選択肢

新規ベンチマークハーネス・PBT 導入・別パッケージ切り出しは不採用(比例選定と既決 cid の適用 — 上表の根拠列参照)。
