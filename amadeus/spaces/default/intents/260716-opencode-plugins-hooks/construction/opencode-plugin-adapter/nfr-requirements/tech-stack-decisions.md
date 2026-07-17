# Tech Stack Decisions — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../functional-design/business-logic-model.md`(実装構造)、`../functional-design/business-rules.md`(R-6/R-7)、`../../../inception/requirements-analysis/requirements.md`(AC-2a/C-5)、codekb `technology-stack.md`(既存スタックの brownfield 実測)。2026-07-17。

## 決定: 既存スタック踏襲・新規 runtime dependency ゼロ

| 面 | 選定 | 根拠 |
|---|---|---|
| 言語/モジュール | TypeScript(ESM) | opencode plugin は JS/TS module 形式(C-5)。リポジトリ既定(codekb technology-stack.md 実測: TypeScript ^6) |
| 実行 | opencode プロセス内(plugin)+ Bun spawn(core hooks 呼び出し) | 既存 core hooks は bun 直接実行の既定(project.md Tech Stack)。`env: process.env` 明示(bun-spawn-env-snapshot) |
| lint / 型検査 | Biome 2.4系(フォーマッタ無効)/ `tsc --noEmit` | 既存 CI 面の継承(project.md)。新設パッケージではないため配線追加不要 |
| テスト | 既存 bun ランナー4層(unit=純関数 / integration=実 FS・spawn) | ADR-4 既決(サイズ純度)。新規テスト機構ゼロ |
| ビルド/配布 | `bun scripts/package.ts` regen → `dist/opencode/.opencode/plugins/`(manifest harnessFiles) | AC-4a/ADR-1 既決。dist 手編集禁止(R-7) |
| 新規依存 | **runtime: ゼロ**(Forbidden「文書化なしの runtime dependency 追加禁止」遵守)。型参照のみ pre-approved 分岐: (a) `@opencode-ai/plugin` を devDependency 追加、または (b) 手書き最小 interface — 工程0 の in-tree 再実測(AC-1c)で必要十分な方を実装時判断。いずれも配布物へ runtime 依存を持ち込まない | NQ-5 回答(E-OC1 承認 2026-07-17T00:27:22Z) |

## 却下した代替

- **独自ランタイム層・イベントバス導入**: 1 イベント = 1 写像+1 spawn で足りる構造に常駐機構は複雑性のみ増(YAGNI、services.md)
- **core hooks の直接 import(in-process 呼び出し)**: core hooks 無改変(AC-2b)かつ既配布 `.opencode/hooks/*.ts` への subprocess spawn が cursor 同型(AC-2a)— in-process 化は同型契約と配布境界の両方を破る
