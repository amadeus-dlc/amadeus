# Requirements Analysis — 明確化質問(260717-answer-tag-vocab-fix / Issue #1127)

<!-- 判定証跡(eoc1-evidence-in-questions-header):
判定: Q1 = 選挙必要(修正方式 — always-elect の明示対象)/ Q2 = 選挙不要(既決導出)。
申告・配信: leader へ選挙 E-ATV-RA の配信を依頼(agmsg 一次記録)。
裁定受領: Q2 = E-OC1 承認 2026-07-17T06:39:04Z(agmsg、leader → e3 — 検証契約の既決導出を承認)。Q1 = E-ATV-RA 開票 2026-07-17T07:09:27Z(表示【3】=(a)+(c) 採用 3/4 — e1 GoA1・e4 GoA2+起草者 vs e2【2】GoA1。対応表公開済み。e4 留保 verbatim は 07:10:43Z 受領)
回答の記入は選挙裁定(Q1)と leader 承認(Q2)の受領後にのみ行う(election-answer-after-ruling / no-election-judgment-gate)。 -->

上流入力(consumes 全数): `../reverse-engineering/scan-notes.md`(欠陥所在・消費者2全数・corpus 396行実測・修正案影響半径)、codekb の `code-structure.md`・`business-overview.md`・`architecture.md`(re-scans/260717-answer-tag-vocab-fix.md で鮮度確認 — business-overview/architecture は対象面に構造変化なしを RE で確認のうえ前提として消費)、`../practices-discovery/team-practices.md` は本スコープ SKIP につき team.md 現行版を正とする。2026-07-17。

## 選挙対象の宣言(1問1行)

- Q1: 選挙必要 — 修正方式の選定(Issue #1127 修正案 (a)(b)(c)。「修正方式」は always-elect の明示列挙対象 — クロスレビュー2名所見と RE 合成の収斂は選挙の実測材料であり裁定ではない)
- Q2: 選挙不要(既決導出)— 検証契約は RE Architect 合成のテスト可能契約 (i)〜(iv)+既存ノルム(injection-surface-verify / transient-state-fixtures / corpus-sweep-for-new-guards / falling-proof-injection-one-set)の機械導出

## Q1: 修正方式は?(選択肢は起草順 — 配信時シャッフル・体裁中立は #1135 運用に従う)

前提実測(RE scan-notes): バグ源 = amadeus-lib.ts:1148 `ANSWER_TAG_RE = /\[Answer\]\s*:?/` の optional コロン。corpus 396行 = コロン形391+非コロン5(全て無害 — ファイル粒度 hasEcode マスク)。trigger 形は committed 0件(待機窓一時状態のみ)・テスト unpinned。消費者2(gate-start fail-closed / advisory sensor — 述語は import 共有、写経なし)。

- 1. (a) 単独: ANSWER_TAG_RE をコロン必須(`/\[Answer\]\s*:/`)へ — 1文字・正当犠牲ゼロ(391行全コロン形)・baseline/coverage 無影響。ノルム文言はコード側根治により現状維持
- 2. (a)+(c) 併用: 上記+cid `eoc1-evidence-in-questions-header`(team.md:215)へ「証跡ヘッダの指示文言に行頭 `[Answer]` 裸トークンを置かない」様式追補(norm PR 別経路・ファイル非交差で並行可)— コード根治+発生源封鎖の多重化。将来の非コロン実答(fail→pass 偽陰性の残余)も発生源側で封じる
- 3. (b) 単独 or 併用: HTML コメント内の行を収集から除外 — trigger 形(コメント内)には効くがコメント外の裸トークン変種に無力、収集ループへのロジック追加でレビュー面が広い
- X. その他(自由記述)

[Answer]: 表示【3】=(a) ANSWER_TAG_RE コロン必須化+(c) eoc1-evidence-in-questions-header への様式追補の併用(E-ATV-RA 採用 3/4、07:09:27Z 開票。e4 留保: 追補は『回答の記入は…』言い換え定型化に留め規範肥大を避ける — (c) 側 AC へ転記)

## Q2: 検証契約(テスト戦略)は?(既決導出)

- 推奨: RE 合成 (i)〜(iv) をそのまま AC 化 — trigger fixture(一時状態・temp file、authoritative 文言 = #1127 一次記録の指示行+承認プレースホルダ+空欄実答)で修正前 `fail:unparseable-timestamp` → 修正後 `pass:answer-blank` の両状態 assert(消費者2面 = 述語直+sensor seam の両ピン)、緑側 = 正当 corpus の verdict 非退行 sweep、注入面 = dist import(regen 後に実測)、非目標 = hasEcode ファイル粒度マスク(既存挙動・スコープ外)
- [Answer]: RE 合成 (i)〜(iv) を AC 化(trigger fixture 一時状態・両状態 assert・消費者2面ピン・corpus 非退行 sweep・dist 注入面・hasEcode マスクは非目標)(既決導出、E-OC1 承認 06:39:04Z)
