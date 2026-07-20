# Tech Stack Decisions — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、technology-stack.md(brownfield 条件付き consumes — codekb) — 全行 technology-stack.md の既存スタック(Bun/TypeScript/ESM、bun:test+自作 runner)の継承であり、新規導入ゼロの根拠を requirements.md の修正面宣言と business-rules.md の変更範囲から確認。

## 決定

| 項目 | 決定 | 根拠 |
| --- | --- | --- |
| 言語/ランタイム | TypeScript/Bun(既存 scripts/ 層の継承 — 新規依存ゼロ) | technology-stack.md(cloud SDK/daemon 非追加方針の継承) |
| テスト | bun:test+tests/run-tests.sh(unit = parse 純関数 / integration = CLI 疎通 — NFR-2 の層区分) | requirements.md NFR-2(fs-tests-integration-first) |
| 配布 | 非対象 — scripts/ は dist 非投影(business-rules.md BR-7 の SKILL 3面は .claude/.agents/contrib で dist/ 外) | business-rules.md BR-7、RE 実測 |
| 新規ツール・ジョブ | なし(reuse: 既存 CI 5ゲート — 既存で代替できない新規機構ゼロ) | technology-stack.md、inception ガードレール(reuse inventory) |
