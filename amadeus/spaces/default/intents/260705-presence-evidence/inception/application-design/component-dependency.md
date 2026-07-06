# Component Dependency — Presence Evidence（260705-presence-evidence）

上流入力: [components.md](components.md)

## 依存関係

変更は audit-format.md（knowledge 側）と parity-map.json の reason 追補（AD-3）の 2 ファイルに閉じ、コード・skills・record への依存変更はない。

## 並行 Intent との接触

- amadeus-state.ts（コード）: 接触なし（C-1）。Construction 前の確認連絡は「接触なし」の通知に縮退。
- dev-scripts/data/parity-map.json: engineer1 #428（上流同期は parity-map に触れる可能性が高い）との追記型接触。reason 文字列の追補は union 解消可能だが、#428 の進行状況をピア連絡で確認してから着手する。
