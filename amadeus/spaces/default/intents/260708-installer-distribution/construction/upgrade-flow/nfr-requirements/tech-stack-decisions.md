# Tech Stack Decisions — upgrade-flow

> ステージ: nfr-requirements (3.2) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: U1/U2 の tech-stack-decisions(全面継承 — 新規技術なし)、`../functional-design/business-logic-model.md`

## 新規技術の不採用宣言

U3 は U1(fetch/tar/crypto)・U2(parseArgs/readline/fs)のスタックを**そのまま再利用し、新規の技術・API・依存を導入しない**(意図ベースの重複排除と依存ゼロ規約の帰結)。

| U3 固有の実装点 | 使用技術 | 根拠 |
|-----------------|----------|------|
| 対象側 md5 照合 | `node:crypto`(U1 と同一) | FR-008 |
| 退避 rename | `node:fs/promises` rename(U2 と同一。同一ボリューム内で原子的) | REL-U01 の順序保証 |
| fs スナップショット比較(テスト) | 既存 tests/harness のフィクスチャ流儀 | REL-U02 検証。新規ツール不要 |

- Node フロアは U1 tech-stack-decisions の権威記述(≥18.3)に従う
