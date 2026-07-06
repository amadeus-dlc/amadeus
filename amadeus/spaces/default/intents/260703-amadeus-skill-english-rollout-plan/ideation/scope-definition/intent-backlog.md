# Intent Backlog：Amadeus skill 英語化実施計画

## 対象候補

| ID | 候補 | MoSCoW | 依存 | 完了証拠 | 備考 |
|---|---|---|---|---|---|
| PB001 | #395 方針確定 | Must | なし | 対応 PR の merge または明示的な Issue close | 英語化方針、対象範囲、検証方法を決める。 |
| PB002 | #400 小さい土台 PR | Must | PB001 | 対応 PR の merge または明示的な Issue close | 代表 skill で英語化の書き方と検証を確認する。 |
| PB003 | #401 AI-DLC v2 差分対応順序 | Must | PB002 | 対応 PR の merge または明示的な Issue close | #391〜#394 の扱いと実施順序を計画証拠として追跡する。 |
| PB004 | #402 残り展開単位 | Must | PB003 | 対応 PR の merge または明示的な Issue close | 残り skill の段階的英語化単位を決める。 |
| PB005 | #391〜#394 の個別完了 | Must | PB003 | 対応 PR の merge、明示的な Issue close、または対象外判断 | #401 の計画証拠だけで代替せず、Issue #399 の残タスクとして扱う。 |
| PB006 | RU002〜RU006 の段階的英語化 | Must | PB004、PB005 | 対象 PR の merge と検証結果 | Amadeus 系 `SKILL.md` の全面英語化を完了する。 |
| PB008 | #399 最終検証 | Must | PB006 | Traceability と検証結果 | 全面英語化完了後に #399 の完了判断へ進む。 |
| PB007 | 英語化そのものの一括実施 | Won't | なし | なし | 小さい土台 PR から段階的に進める方針と衝突する。 |

## 優先順位

1. PB001
2. PB002
3. PB003
4. PB004
5. PB005
6. PB006
7. PB008

PB007 はこの Intent では扱わない。

## 補足

Backlog 項目は、この Intent 内の作業候補である。

新しい Intent の予約席ではない。
