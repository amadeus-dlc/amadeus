# Tech Stack Decisions — U1 tla-externalize

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 採用技術

| 領域 | 選択 | 根拠 |
|---|---|---|
| Runtime | Bun 1.3.13 | 既存 CLI・テスト基盤と一致し、新規 runtime を増やさない |
| Language | TypeScript ESM | `tla-arm.ts` と既存 Result 契約を維持する |
| File API | `node:fs` | バイト列を直接読み、暗黙の文字コード変換を避けられる |
| Integrity | 既存 `canonicalIdentity` + SHA-256 | モデル同値と実装対応登録簿を決定的に検証できる |
| Test | `bun:test` unit + integration | パーサ境界と実ファイルのバイト同値を分離して検証する |

## 却下した選択肢

- 新規 TLA+ parser library: U1 は構文解析せずバイト同値を守る責務のため不要。
- 埋め込み定数との二重保持: 単一ソース契約と可逆性を損なうため禁止。
- DB・object storage・runtime cache: リポジトリ所有の小規模設計資産には過剰で、既存技術スタックにも存在しない。

## 配布と互換性

- `specs/tla/` はリポジトリ資産であり plugin drop 後も残す。
- U1 の変更は実験資産の公開関数シグネチャを維持し、配布 framework へ新しい runtime dependency を追加しない。
- formatter、lint、typecheck、unit/integration test は既存プロジェクト設定をそのまま使用する。
