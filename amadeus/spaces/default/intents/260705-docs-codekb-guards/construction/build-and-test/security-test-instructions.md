# Security Test Instructions

Unit: docs-codekb-guards（Test Strategy: Minimal）

## 適用判断

B002（docs-only 宣言）に限り適用する。宣言は workspace_requires ガード（#366 型の実装抜け検出）の免除経路であり、悪用されるとガード回避になるためである。

## 検査

専用 eval の FR-2.3 系 4 検査がこの観点を担う。

- 自由文字列（承認イベント形式でない evidence）の宣言は拒否される。
- audit に実在しない承認イベントを指す evidence は拒否される。
- 無効な宣言は registry に書かれない（汚染なし）。
- 空 evidence は拒否される。

reviewer（amadeus-architecture-reviewer-agent）iteration 2 で「自由文字列によるバイパス経路は残っていない」ことをコード読解でも確認済み。

## その他

- 認証情報・API キー・シークレットのハードコードはない（変更ファイルはエンジンツール・validator・eval・宣言ファイルのみ）。
- 新たな外部入力面はない（宣言 CLI の入力は audit 実在照合で検証される）。
