# Risk & Sequencing — 260720-hold-choice-resolution

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md — リスクは requirements.md の契約変更(E-HCRRA3=B)と unit-of-work-story-map.md の誤裁定シナリオから、e4 交差リスクは components.md 非変更リストと unit-of-work-dependency.md の境界実測から、緩和手順(base-advance-regrounding / injection-surface-verify)は team-practices.md の Corrections から導出。単一 unit(unit-of-work.md)につき順序リスクなし。

## リスク

| リスク | 影響 | 緩和 |
| --- | --- | --- |
| e4 バッチ先着地で election.ts が前進 | rebase 衝突(関数非交差だが同ファイル) | base-advance-regrounding: merge-base 実測 → --no-ff merge+parent 数機械確認 → 全検証再実行。実 diff で交差再判定(c6) |
| 契約変更(tie 二値廃止)の見落とし利用者 | 旧手順の leader 操作が exit 1 | valid ヒント付き loud 拒否が誘導(FR-1)+SKILL 3面の使い分け1行(FR-4) — 無音誤裁定より安全側 |
| 落ちる実証の面誤り | 偽の赤/緑 | injection-surface-verify: テストが読む面(scripts/ 直 — 選挙 CLI は dist 非投影)を注入前に実測確認 |
| grant 期限(05:35:22Z)超過 | ゲート停止 | 期限接近時に leader へ更新依頼、待ちは park |

## シーケンス

単一 Bolt — 順序判断なし。構築ステージ列(FD→NR→ND→CG→B&T)は engine の per-unit ループに従う。
