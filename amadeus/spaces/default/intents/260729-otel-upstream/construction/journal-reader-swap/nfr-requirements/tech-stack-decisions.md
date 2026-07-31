# Tech Stack Decisions — U6: journal-reader-swap

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun 1.3.13・TypeScript 6.0.3・Biome・bun test 4 層）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| 新規依存 | **追加なし**（ランタイム・開発とも）。差替えは既存の共通 reader（U3 の Journal Module）Interface への call site 張替えで完結し、`package.json` / `bun.lock` を変更しない | BR-1、BR-17。reader・codec 自体は U3 側が所有 |
| 変更面 | 正本 `packages/framework/core/` の tool 実装のみ。`amadeus-lib.ts` には追加しない | BR-17 |
| 配布（FR-DST-2 義務） | 差替え対象 tool は `core/tools/` 配下であり、変更後は各 harness manifest マッピングの整合を確認し `bun scripts/package.ts` で全 7 harness dist ＋ self-install 面を再生成、`bun scripts/package.ts --check` ／ `bun run promote:self:check` の drift guard を通過する。distribution tests（BR-21）を Unit 完了条件に含める | FR-DST-2、VER-6、BR-17/BR-21 |
| 検証技術 | fixture（v1-only／v2-only／mixed）＋ゴールデン出力比較は既存の bun test 層と `performance.now()` 実測で実装。新規テスト基盤は導入しない | technology-stack.md 既存スタック、t258 実測先例 |

## 既存スタックとの整合

- コメントは英語、1ファイル1責務、ドメイン境界＝判別ユニオン Result／CLI 境界＝emitError（BR-14、team-practices ## Code Style）
- テスト先行順序（#1678）に従い、fixture・ゴールデンを実装に先行させて red-green（business-logic-model.md 検証フロー 1）
- 差替え対象 7 tool（doctor／recovery／presence／grant／merge／runtime graph／learnings）以外の `core/` 面には触れない（BR-10）
