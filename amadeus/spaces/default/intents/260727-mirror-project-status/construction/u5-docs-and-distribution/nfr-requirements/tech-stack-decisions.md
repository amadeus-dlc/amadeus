# Tech Stack Decisions — u5-docs-and-distribution

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 決定一覧

| 決定 | 根拠 |
|---|---|
| 新規依存・新ツールゼロ — 配布同期は既存 `bun scripts/package.ts`+`bun run promote:self`、検査は既存 drift guard を再利用 | technology-stack 実測: 本 intent 区間で依存宣言の変更 0 行・配布経路不変。business-rules BR-U5-3 |
| docs は既存4文書体系への追記(en/ja 対訳ペア×2)— 新文書・新ドキュメント基盤を作らない | business-rules BR-U5-1+business-logic-model のドキュメント更新フロー(requirements FR-10b 受入条件15 は既存 docs contract で検査) |
| 契約の追記は既存台帳(USER_CONTRACT・TOPICS)への closed な追記 — 新しい契約表現形式を発明しない | business-rules BR-U5-2(requirements FR-12b の閉じた台帳規約) |
| 検収は既存4層テストランナー+coverage ゲートの1回実行 — 新しい検収基盤・レポート形式を作らない | requirements FR-12a(technology-stack: tests/run-tests.sh の4層不変)+business-rules BR-U5-8(実測転記) |
| リリース操作は対象外 — release.yml の workflow_dispatch 境界を維持 | business-rules BR-U5-7(project.md のリリース一本化 Mandated) |

## 却下した代替案

- **配布同期の自動化 workflow(GitHub Actions での自動 regen+commit)**: 却下 — requirements FR-1b(GitHub Actions を導入しない)と受入条件14 に抵触。dist 再生成はローカル実行+既存 CI の drift guard 検査という現行様式(technology-stack)で完結する。
- **docs の自動生成(契約からのテンプレート生成)**: 却下 — 既存4文書は手書き(en/ja 対訳)であり、生成基盤の新設は business-logic-model の「新規ロジックなし」原則と reuse inventory(requirements FR-12b の既存台帳同期)を超える構造追加になる。parity テストが既に docs⇔契約の一致を機械保証している。
