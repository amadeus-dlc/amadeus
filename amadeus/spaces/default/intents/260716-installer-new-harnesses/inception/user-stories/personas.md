# Personas — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜6)、codekb の business-overview.md / component-inventory.md(RE 全数再検証済み台帳)、`../practices-discovery/team-practices.md`(既存実践)、`../../ideation/intent-capture/intent-statement.md`、`../../ideation/intent-capture/stakeholder-map.md`。

## P-1: OpenCode / Cursor 利用開発者(優先順位 1 — 主ペルソナ)

- 目標: 自分のハーネスへ amadeus を最短で導入し `$amadeus`(opencode)/ `/amadeus`(cursor)を使い始める
- 痛点(現状): 6ハーネス中この2つだけ「manual install」(dist ツリーの手動コピー)— README 導線の非対称
- 本 intent 後: 既存4ハーネスと同一の `install --harness <name>` 一本

## P-2: フレームワーク保守メンバー(優先順位 2 — 全数性契約の受益者)

- 目標: 7値目のハーネス追加時に installer 側の変更漏れを機械検出で防ぐ
- 痛点: 閉じ列挙8サイトの手動追随(dist 面 open-set との非対称)
- 本 intent 後: literal 契約テスト+将来条件チェックリスト(FR-4)が全数台帳として機能

## P-3: 運用者(優先順位 3 — advisory 面のみ、Q1=B 裁定の付随)

- 目標: マルチハーネス環境の状態を doctor advisory で把握
- 痛点: installer が作れるツリーを doctor の otherTrees が列挙できない不整合(FR-6 の根拠)
- 本 intent 後: advisory 出力が6ハーネスを一貫列挙(権威は script-path derivation のまま)

## ペルソナ間の関係と順位根拠

P-1(導入)> P-2(保守)> P-3(運用)。順位根拠: Issue #1048 の中核契約は install 経路の正しさ(P-1)、全数性テストはその持続保証(P-2)、doctor advisory は裁定 B の付随品質(P-3 — install 正しさとは分離)。P-2 は P-1 の成功を将来の追加でも保つ関係、P-3 は P-1 の成果物(生成ツリー)を観測する関係。
