# Discovered Rules：Engine Installer（260705-engine-installer）

上流入力: [team-practices.md](team-practices.md)

本 Intent の実装に直接効く規則の抽出である。

| ID | 規則 | 実装への含意 |
|---|---|---|
| DR-1 | テスト・eval・validator なしで実装だけを追加しない（MUST NOT） | 専用 eval を先に書き、RED を確認してから installer を実装する |
| DR-2 | 新規検証入口は短い npm script 名で公開する | eval は `test:it:*` 系、インストーラ実行は `bun run scripts/...` 直接または短い script 名 |
| DR-3 | 一時ディレクトリを作る検証は成功時も失敗時も片付ける | eval の隔離 workspace は try/finally で削除 |
| DR-4 | repo 開発用スクリプトを skill の実行時依存にしない | インストーラは配布物（エンジン・skills）から参照されない独立スクリプトとする |
| DR-5 | エンジンツールを修正したら parity-map の例外宣言 + skills/ 正準ソース反映が必要（Corrections c3） | 本 Intent はエンジンを読むだけで修正しないため対象外。ただし eval がエンジンレイアウトを検査するため、レイアウト変更（並行 Intent）で eval が先に fail して検知できる |
