# Business Rules — U2 opencode-surface

intent: `260715-opencode-cursor-harness` / Unit: U2
上流入力: requirements.md(FR-1/FR-2)、application-design の component-methods.md(C1)/ components.md / services.md、unit-of-work.md / unit-of-work-story-map.md。

## ルール一覧(検証可能形)

| ID | ルール | 検証 |
| --- | --- | --- |
| R-U2-1 | U1 の emission table 構造・エラー方針を変更しない(エントリ追加のみ — 逸脱は実装前停止) | U1 実装との diff が追加のみであること(レビュー実測) |
| R-U2-2 | opencode.json.example は JSON 厳密(JSONC 不可)で、permission 絞り込み例を含む | `JSON.parse` で読めること(単体テスト)+ permission キー実在(grep) |
| R-U2-3 | AGENTS.md はトークン置換経路(.md)を通り、置換漏れトークンを残さない | dist の AGENTS.md に未置換トークン(`{{`)がないこと(grep 0件) |
| R-U2-4 | skills 合成は codex の合成関数群と**同型実装**(コピーでなく、引用元のエラー分岐との意味論照合を実装コメントに記録 — L-AD1/AC-1b) | 実装コメントに照合記録+レビュー観点 |
| R-U2-5 | AC-2b 完全実測は scratch プロジェクト+project-root override で行い、実 record を汚染しない | scratch-script-discipline 準拠(実測記録にパス明記) |
| R-U2-6 | core・scripts・installer 変更ゼロ | AC-4d grep ヒット0 |

## 完了条件(Bolt 2)

package.ts / dist:check / typecheck / lint / promote:self:check / tests --ci すべて exit 0 + **AC-2a 完全実測(--version・--doctor の exit code 契約 — U1 実測に加え、emission table 拡張後も無退行であることの再実測)** + AC-2b 完全実測記録(AC-6b 様式)+ AC-2c 劣化内容の記録 + push 前 lcov + deslop。
