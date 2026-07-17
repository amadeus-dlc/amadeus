# Stakeholder Map — codekb diff3 cleanup(Issue #1129)

上流入力(consumes 全数): なし(本ステージの `consumes` 宣言は空。参照した事実源は [Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129)、独立クロスレビュー、intent 起動時のユーザー指示、現 HEAD の実測)。

## Key Stakeholders and Interests

| ステークホルダー | 関心 | 必要な証拠 |
|---|---|---|
| ユーザー / repository owner | Issue #1129 を intent として追跡し、Ideation 後に記録をレビュー可能にする | intent record の実在、main 着地後の再実測 |
| Amadeus conductor / architect | CodeKB の最新・履歴境界を誤読せず、次の intent の事実源として使える | `|||||||` 0件、最新ヘッダ各1件 |
| CodeKB 保守者 | branch 固有の merge 残渣を main に持ち込まず、履歴ブロックを保持する | 修正コミット `5e92d1516` と着地面の diff / grep |
| reviewer | Issue の主張、修正範囲、成功条件が実ファイルと一致するか独立確認する | file:line、コマンド出力、測定 ref |
| leader | gate provenance、record-sync の着地、Issue close の順序を管理する | gate-ready SHA、sensor verdict、§13候補、着地状態 |

## Decision-Makers and Influencers

- **最終意思決定者**: ユーザー。Issue 対応 intent の開始と不可逆な main 取り込みを承認する。
- **ゲート執行者**: leader。team mode の delegate / standing grant を発行し、main 着地後の Issue close 条件を検証する。
- **成果物責任者**: conductor e1。Product と Architect の観点を統合し、成果物・sensor・§13候補の実測結果を報告する。
- **独立検証者**: Issue #1129 の起票者以外の reviewer 2名。欠陥実在と `P3` / `S4-MINOR` の妥当性を確認済み。

## Communication Requirements

1. gate-ready 報告は成果物実在、宣言 sensor の確定 verdict、§13候補、commit / push SHA をまとめて leader へ送る。
2. 測定値には対象 ref を付け、現在の clean な conductor HEAD と、修正コミットを含む `origin/fix/1027-state-set-fail-closed` を混同しない。
3. main 着地前に Issue を close しない。着地後は `|||||||` 0件と最新ヘッダ各1件を再実測し、その出力を close 根拠にする。
4. 既決の diff3 検査語彙ノルムはそのまま適用し、同じ判断を再質問・再選挙しない。
