# 論理コンポーネント — U8 docs-sync

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions

## 構成(文書 Unit — 実装モジュールなし)

U8 はコード変更を伴わない文書 Unit であり(BR-U8-0 — `performance-requirements.md` / `scalability-requirements.md` の N/A 前提)、構成要素は文書と既存ゲートのみ:

| 要素 | パス | 内容 |
|---|---|---|
| 更新対象(確定分) | `docs/guide/19-plugins.md` / `docs/guide/19-plugins.ja.md` | install / doctor / drop 手順を U1-U6 着地物から転記(components.md C8 責務行 — `business-logic-model.md`) |
| 更新対象(棚卸し分) | 語彙 grep で確定する追加 DocsTarget | scalability-design.md の有界確定手順で導出 |
| 検査 | 既存 t174 系 legacy-refs / 言語切替リンク検査 | 再実行のみ・新設なし(`reliability-requirements.md` REL-U8-3、`performance-requirements.md` 検査面) |
| 転記元契約 | component-methods.md C1-C6 の契約表 | 乖離は逸脱扱いで停止(`security-requirements.md` SEC-U8-2) |

新規ツール・新規依存・record への書込なし(tech-stack-decisions.md — 非干渉)。

## 保証機構の層別

| 層 | 保証 | 対応 ID |
|---|---|---|
| 起草手順(実行 → 転記) | 文書の真正性(未実行手順・破壊的コマンドの非記載) | `reliability-requirements.md` REL-U8-1、`security-requirements.md` SEC-U8-1 |
| 対訳照合(見出し/フェンス機械照合) | 日英内容差ゼロ | `reliability-requirements.md` REL-U8-2 |
| 既存ゲート+literal grep | 参照整合・クラス語彙の正準性 | `reliability-requirements.md` REL-U8-3 |
| 逸脱停止 | 誤手順の非公開 | `security-requirements.md` SEC-U8-2、`reliability-requirements.md` REL-U8-4 |

## テスト層配置

N/A(参照継承 1 行)— 新規テストを追加せず、既存 docs 参照整合ゲート(integration 層既存)と手動実行確認(stage diary 記録 — `business-logic-model.md` 検証)のみで検証する。

## 障害分離(failure domains / blast radius / isolation / shared resources)

N/A — U8 はコード非搬送の文書 Unit(BR-U8-0)であり、実行時障害領域を持たない(根拠: 同 unit の nfr-requirements における performance / scalability の N/A 前提)。ただし成果物ファイル自体の共有関係として: 書込は `docs/guide/19-plugins.md` / `19-plugins.ja.md`(+語彙 grep で確定する追加 DocsTarget)のみで、record への書込なし・他 unit の成果物と非共有。転記元(U1-U6 の着地物と component-methods.md C1-C6 契約表)は読取のみで、乖離時は docs 側で吸収せず実装側の逸脱として停止する(SEC-U8-2)。

(nfr-design Step 6 の必須内容 — U2 ND レビュー iteration 1 Major 指摘の是正 2026-07-27)
