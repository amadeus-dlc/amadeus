# Domain Entities — U5 team-mode-docs

> 上流入力(consumes 全数): components(C7)、component-methods(C7 章構成)、requirements(FR-7)、unit-of-work(U5)、unit-of-work-story-map、services(依存境界)

## 型・コードの変更

**なし** — U5 はドキュメントのみの Unit。コード・型・テスト(既存ガード以外)への変更ゼロ。

## 文書構造(entity 相当の構造定義)

| 文書 | 構造 |
|---|---|
| docs/guide/20-team-mode.md / .ja.md | 6節構成(Overview / Prerequisites / Setup / Running an election / Operating Modes contract / Platform support)— business-logic-model の章構成と1:1 |
| docs/harness-engineering への追記 | 3層配置規約(判定ルール+昇格作法)の1節 |
| 既存文書の更新(BR-8) | docs/guide/team-messaging.md・docs/guide/harnesses/codex-cli.md/.ja.md の scripts/ 旧パス参照を新配布パスへ全数更新(conductor 独立 grep 実測 2026-07-23 の3文書) |

## 不変条件

- ガイド番号 20 は既存 19-plugins の次番(既存 docs/guide の連番規約)— 実装時に最新の番号帯を再確認(並行 intent の docs 追加と衝突しうるため)
- 参照する外部 URL は公式入手先のみ(herdr.dev / agmsg 公式 / bun.sh)

## frontend-components について

ドキュメント Unit のため frontend-components.md は生成しない(CONDITIONAL 非該当 — 生成後に不在を確認)。
