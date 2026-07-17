# Scan Notes — 260717-answer-tag-vocab-fix(Issue #1127)

> 上流入力(consumes 全数): codekb の business-overview.md / architecture.md / code-structure.md / api-documentation.md / component-inventory.md / technology-stack.md / dependencies.md / code-quality-assessment.md(diff-refresh・body 温存)+ reverse-engineering-timestamp.md(鮮度回転)。測定 ref: HEAD `6598bfab1`(branch team/…/engineer-3)、base=`3346718`(祖先・距離56 — rescan-base-ancestry)。Developer→Architect 直列(c3、両者同期回収・独立再実測5点全一致)。2026-07-17。

## 欠陥の所在(file:line 確定)

- **バグ源**: `packages/framework/core/tools/amadeus-lib.ts:1148` — `ANSWER_TAG_RE = /\[Answer\]\s*:?/` の `:?`(optional コロン)。証跡ヘッダ指示行『[Answer] 記入は…』(コロンなし)を回答行として収集(:1186)
- **偽赤機序(4段・Architect 実コード確認)**: 待機窓一時状態で (1) 実 `[Answer]:` 全空欄 (2) 指示行が唯一の filled answer として収集(:1155)→ filled=true (3) E-code なし → 承認行スキャンへ (4) 『leader 承認: (受領後に追記)』が承認語あり ISO parse 不能 → `fail:unparseable-timestamp`(:1199-1206)
- 区間 diff(3346718..HEAD): 述語自体は #1101 以降**不変** — 区間の変更は消費側(sensor #1123)の追加のみ

## 消費者の全数列挙(enumeration-completeness — 2箇所で確定・第3経路なし)

1. gate-start ガード: `amadeus-state.ts:1731`(import :40)— fail-closed、cutoff `QUESTIONS_EVIDENCE_CUTOFF_YYMMDD=260716`。承認 TS 記入後に走るため #1127 実害は advisory 偽赤に限定
2. advisory sensor: `amadeus-sensor-answer-evidence.ts:85`(import :19)— **述語は import 消費で写経なし**(C1 凍結は reason→verdict 写像 :86-87 のみ)→ regex 修正の sensor 側伝播は regen で自動、コード改修不要

## corpus 様式の現世代実測(format-currency-grep-for-parser-intents)

- questions.md 153 / `[Answer]` 保持 81 / E-OC1 ヘッダ保持 40。`[Answer]` 行 **396 = コロン形 391+非コロン 5**(git grep 実測)
- 非コロン5行はすべて散文言及(blockquote ヘッダ/本文参照)で、**無害の真の機序はファイル粒度の hasEcode マスク**(:1188-1192 の OR 集約 — 同ファイル実答の E-code が pass:evidence-present へ吸収)
- **trigger 形は committed corpus に0件**(待機窓一時状態のみ — transient-state-fixtures の実証例)。authoritative 文言: 指示行『[Answer] 記入は leader 承認受領後にのみ行う。 -->』(HTML コメント内)+『leader 承認: (受領後に追記)』
- テスト被覆: t-eoc1-gate-evidence / t-answer-evidence-sensor は**両方 dist/claude/... を import**(t-eoc1:13-14 — injection surface)。trigger 形は **unpinned**(コロンなし [Answer] テストデータ0件 — absence-claim-grep-verify 済み)

## 修正戦略(Architect 合成 — requirements への引き継ぎ)

**(a) コロン必須化を主+(c) ノルム様式追補を従**(e1 クロスレビュー所見と一致):

- (a) `:?`→`:` の1文字 — 正当犠牲ゼロ(391行全コロン形)・baseline/coverage 無影響・9コピー regen(dist6+self-install2)で機械同期
- (c) cid `eoc1-evidence-in-questions-header`(team.md:215)へ「行頭に `[Answer]` 裸トークンを置かない正準文言」を追補(norm PR 経路 — code PR と非交差・並行可)
- 回帰テスト契約: trigger fixture(temp file・一時状態)で修正前 `fail:unparseable-timestamp` → 修正後 `pass:answer-blank`、消費者2面(state/sensor)両ピン、緑側 = 正当 corpus の verdict 非退行 sweep
- 非目標(スコープ膨張防止): ファイル粒度 hasEcode マスク(R1)は既存挙動 — 本 intent で変更しない
- 対称性: (a) は収集のみ狭め判定不変。fail→pass 偽陰性(非コロン実答)は corpus 0件+(c) で発生源封鎖 — 『[Answer]: コロン形が deciding answer の唯一の正準様式』を requirements で契約化

## リスク

R1 hasEcode マスク(スコープ外・非目標明記)/ R2 regen 漏れ drift(dist:check+promote:self:check 必須)/ R3 code PR と norm PR の順序独立(ファイル非交差)
