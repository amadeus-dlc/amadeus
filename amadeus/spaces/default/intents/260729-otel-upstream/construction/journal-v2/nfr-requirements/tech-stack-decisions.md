# Tech Stack Decisions — U3: journal-v2

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

`technology-stack.md` の現行スタック（Bun `1.3.13`・TypeScript `6.0.3`・Biome・bun test・fast-check `^4.9.0`）に対する本 Unit の追加分。

## 決定

| 決定 | 内容 | 根拠 |
|---|---|---|
| 新規 runtime 依存 | 追加なし。codec・merge・converter・View は TypeScript 標準（`JSON.stringify`、Map、配列ソート）と既存の `node:crypto` 系決定的 ID 設計で完結する | technology-stack.md の現行断面。wire 不変条件は v1 codec 踏襲（BR-2）のため新規ライブラリ不要 |
| property test | 既存 devDependency の fast-check を使用（merge no-loss／exactly-once／順序不変・round-trip 恒等）。依存追加なし | 検証フロー（business-logic-model.md）、VER-3 のテスト先行 |
| 配置 | `packages/framework/core/tools/amadeus-journal.ts` の拡張（ADR-5）。codec 層は filesystem に触れない純粋関数として実装し、I/O は呼出し側に委ねる | business-logic-model.md、services.md の通信契約 |
| 配布（FR-DST-2） | `packages/framework/core/tools/` の変更に伴い、各 harness manifest のマッピングへ反映し `bun scripts/package.ts` で全生成面（dist 7 面＋self-install）を再生成、`package.ts --check`／`promote:self:check` の drift guard を通過する | FR-DST-2 |
| OTel 依存 | 本 Unit 自体は `@opentelemetry/*` を直接 import しない。OTel event name・typed attributes は v2 record のデータ形状として扱い、API 依存は U2（Provider 面）に閉じる | FR-EXP-1、U3 の境界（codec 層の非 I/O 化） |

## 既存スタックとの整合

- コメントは英語、コメント以外のドキュメント規約（本ファイル群は日本語）は AGENTS.md の言語ルールに従う
- エラーは判別可能な例外（`JournalCodecError`）で表現し、decode 失敗を沈黙させない（BR-1/BR-10）
- テスト先行: property test を先に失敗させてから codec／merge を実装する同一コミット red-green（team-practices ## Testing Posture、business-logic-model.md 検証フロー）
