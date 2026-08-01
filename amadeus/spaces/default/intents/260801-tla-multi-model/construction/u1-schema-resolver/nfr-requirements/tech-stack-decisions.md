# Tech Stack Decisions — u1-schema-resolver

## 上流境界

`business-logic-model.md` の §4(下流引き渡し: 新規外部依存なし、純粋モジュール)、`business-rules.md` の BR-R8 / BR-S8、`requirements.md` の NFR-4(新規外部依存なし)/ Constraints(生成物は package.ts 再生成)を正本とする。

## 決定: 新規技術選択は発生しない

本 Unit は既存 TypeScript / Bun スタック内のモジュール変更(新規1ファイル + 既存3ファイルの optional 拡張)であり、言語・フレームワーク・データベース・インフラの新規選択は**一切発生しない**。各面の現行継続と根拠:

- **言語 / ランタイム**: TypeScript + Bun(リポジトリ既定、変更なし)。`bun run typecheck`(tsc `--noEmit`)/ `bun run lint`(Biome)がそのまま検証手段。
- **新規モジュール `tla-module-deps.ts`**: `node:` import さえ持たない純粋モジュールとして実装する(BR-R8)。fs アクセスは注入シーム `readModule` に限定し、外部ライブラリを追加しない(NFR-4)。パースは正規表現と行走査のみで、TLA+ パーサ等の依存導入は行わない(行ベース抽出規則で十分 — business-logic-model §2.1)。
- **スキーマ検証**: 既存の `exactObject` / `invalid(...)` / `parseAssetIdentity` 系の手続きを再利用し、検証ライブラリ(zod 等)の導入は行わない(BR-S8 — 既存エラー経路の不変が後方互換要件)。
- **テスト**: Bun test。スキーマ表テスト拡張(dual-copy `describe.each` 維持)と新規 t402 を追加。fast-check 等の新規テスト基盤は導入しない。
- **生成ツリー**: `dist/` 等は `bun scripts/package.ts` 再生成で追随し、手編集しない(Constraints)。

## 却下した代替

- TLA+ の構文解析ライブラリ導入: 行頭キーワード縛り + コメント除去の規則で偽陽性を構造的に排除でき(BR-R1/R2)、NFR-4 に反するため却下。
- 既存スキーマ検証のライブラリ化: エラーコード・detail メッセージの不変(NFR-1)と両立せず、却下。

## Acceptance

`bun.lock` / `package.json` に差分がないこと、`tla-module-deps.ts` の import が型 import のみであること、`bun run typecheck` / `lint` が green であることをもって合否とする。
