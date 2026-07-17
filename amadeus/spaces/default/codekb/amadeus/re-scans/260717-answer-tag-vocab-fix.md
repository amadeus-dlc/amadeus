# Re-scan 記録 — 260717-answer-tag-vocab-fix(Issue #1127)

- Date: 2026-07-17 / Observed at: HEAD `6598bfab19c9b401eeccb5cd9bcf1c9861099a57`(git rev-parse HEAD 実測、engineer-3 本線)
- Scope: `bugfix` / 手法: diff-refresh(c1)、base=`3346718`(祖先性 exit 0・距離56 最小 — rescan-base-ancestry)。Developer→Architect 直列(c3、独立再実測5点全一致)
- Focus: checkQuestionsEvidence 述語(amadeus-lib.ts:1148/:1182)/ 消費者2全数(state:1731 gate-start・sensor:85)/ corpus 様式現世代(396行=コロン391/非コロン5)/ テスト被覆(dist import 面・trigger unpinned)
- 区間実測: 述語は #1101 以降不変 — 区間変更は消費側 sensor(#1123)追加のみ。#1127 は base 現存の構造欠陥
- 結論: 修正は (a) ANSWER_TAG_RE コロン必須化(1文字・正当犠牲ゼロ)+(c) eoc1 ヘッダ様式のノルム追補(team.md:215)。9コピー regen 必須。trigger fixture は一時状態(transient-state-fixtures)
- codekb body: 温存(c1 — 対象面に構造変化なし)。詳細は intent record の scan-notes.md
