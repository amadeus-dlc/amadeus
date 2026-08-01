# Business Rules — docs-sync(U4)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- BR は `requirements.md` の制約(docs は英語既定・ja 対訳、記録正本は record)と `unit-of-work.md` U4 の検収、`components.md`/`component-methods.md`/`services.md` の確定契約(記述対象)、`unit-of-work-story-map.md` の到達点から導出した。

## ルール

- **BR-U4-1(実装後記述)**: U1〜U3 の着地 PR の実 diff・実メッセージ文言を一次資料として書く(compilation-stage-source-first — 記憶起草禁止)。
- **BR-U4-2(対訳同期)**: en/ja を同一 PR で更新し、レビューで参照整合と対訳同期を確認(docs-language-ownership)。
- **BR-U4-3(件数フリー)**: 散文に硬数値を置かない(隣接列挙がある場合のみ許可 — c3-adjacent-enum-numerals)。
- **BR-U4-4(語彙 grep)**: 対象語彙(bolt_dag_absence / invoke-swarm ガード / SWARM 突合)の repo 全域 grep で docs+正本知識ファイルの対象面を棚卸ししてから書く(E-SDE-FD)。
- **BR-U4-5(dist 非対象)**: docs/ は dist 投影外 — CR-3 の再生成は不要。CI の docs ガード(t132 系)が読む doc に触れる場合は paths-ignore 盲点を確認。

## 検収対応

| AC | 内容 |
|---|---|
| U4-AC-1 | ガード3種の発動条件・3部メッセージ・出口が reference から辿れる |
| U4-AC-2 | en/ja 対の diff が同一 PR に存在 |
| U4-AC-3 | 対象語彙 grep の棚卸し結果が PR 本文に記録される |
