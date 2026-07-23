# Code Generation Plan — fix-1296-marker-heading-exemption

上流入力(consumes 全数): requirements.md、scan-notes.md

## 概要

Issue #1296 の修正。required-sections センサーの generic ≥2-H2 floor が、意図的に H2 を欠く marker 成果物(`*-questions.md` / `*-timestamp.md`)へ無条件適用され恒常 `pass:false` になる欠陥を、既決規範 E-FVEPD(cid:practices-discovery:e-fvepd-marker-heading-floor)が要求する floor 免除へ回復する。文書化済み仕様への回復であり仕様変更ではない(requirements.md 冒頭の裁定に従う)。

## 実装形態(E-MHERA1 裁定 A / E-MHERA2 裁定 A)

- 共有述語 `isMarkerArtifact(name)` を **amadeus-lib.ts** の canonical 1定義として抽出し、graph の `templateEligibleArtifacts` filter とセンサーの floor 免除の**両方**をそこから導出(2定義ドリフトの構造的防止 — cid:code-generation:c1 / 集合分裂回避)。
- 免除は無音にせず、Result に `marker_exempt: true` を追加し manifest output_schema へ追記のうえ、最低1消費者(t155 の Result assert + t86 の schema assert)まで同一 PR で配線(FR-2、検証劇場 Forbidden 回避)。縮退分岐(B: pass:true のみ)は発動せず — 配線は過大でなく成立した。

## 免除分岐の位置選定理由

センサースクリプト(amadeus-sensor-required-sections.ts)の免除分岐は、**stem 導出直後・template-override 分岐の前**(`:173` の `const stem = …` の直後、`resolveTemplatePath` の前)に置いた。

選定理由:

- 免除は「generic ≥2-H2 **floor** からの免除」という floor レベルの決定であり(E-FVEPD の文言 "exempt from the prose-heading floor")、floor 計算(`:141` の `pass = h2_count >= 2`)に最も近い位置へ置くことで floor の2つの帰結(generic ≥2 / marker 免除)を概念的に隣接させられる。
- **FR-3 保持**: template-override 分岐(ELIGIBILITY GATE の ineligible 経路 + config_warning、eligible 経路の template 適用)と edge_block 分岐のコードは一切変更しない。marker は `templateEligibleArtifacts`(= `isMarkerArtifact` の否定)により常に eligible 集合から除外されるため、marker に template が解決しても ineligible 経路(config_warning 発火、`pass` 非変更)を通る。免除分岐で先に `pass = true` を設定しても ineligible 経路は `pass` を触らないため免除が保持され、**config_warning の既存意味論は不変**(template を marker へ書いた config の異常は依然警告する)。
- marker は決して `unit-of-work-dependency.md` ではないため edge_block 分岐は marker に適用されない。よって免除分岐を前後どちらに置いても marker の pass/findings は同一で、前置が概念的に最も明快。
- 非 marker は `isMarkerArtifact(stem)===false` で免除分岐を完全スキップ → floor 判定・findings 導出・template・edge_block 挙動は不変。

## 触るファイル目録(正本 4 + テスト 2 = 6、+ 生成物同期)

正本(`packages/framework/core/`):

1. `tools/amadeus-lib.ts` — `isMarkerArtifact(name: string): boolean` を export 追加(モジュールスコープ英語コメント)。
2. `tools/amadeus-graph.ts` — import に `isMarkerArtifact` を追加。`templateEligibleArtifacts` のインライン suffix チェックを `!isMarkerArtifact(a)` 導出へ置換(挙動不変)。
3. `tools/amadeus-sensor-required-sections.ts` — import に `isMarkerArtifact` を追加。Result 型へ `marker_exempt?: true` を追加。stem 導出直後に免除分岐を追加。
4. `sensors/amadeus-required-sections.md` — `:52-53` の「the marker keeps the generic floor」記述を免除契約へ更新。marker 免除の明文段落を追加。output_schema へ `marker_exempt: boolean` を追記。「When neither override is present」文を非 marker 限定へ補正(英語)。

テスト:

5. `tests/unit/t155-template-override.test.ts` — SensorResult 型へ `marker_exempt` 追加。新 describe「marker floor exemption」で 3 テスト(-timestamp / -questions 免除 + 非 marker floor 対照)。既存 ineligible-marker テスト2件(`intent-questions` / `requirements-analysis-questions`)を修正後挙動(pass:true + marker_exempt:true、ELIGIBILITY GATE の template ignored + config_warning は不変)へ更新。
6. `tests/unit/t86-sensor-manifest-schema.test.ts` — output_schema が `marker_exempt: boolean` を宣言することの raw-frontmatter assert を追加(FR-2 消費配線)。

生成物同期(FR-5): `bun scripts/package.ts`(dist 6)+ `bun run promote:self`(self-install 4)。正本1 + dist6 + self-install4 = 11 コピー。

## 検証計画

typecheck / lint / dist:check / promote:self:check / t155 / t86 / FR-7 閉包(配布コピーで再現コマンド verbatim)/ NFR-1 corpus sweep(scratch)/ 落ちる実証(免除の runtime 消費行を一時コメントアウト → dist 再生成 → t155 marker 赤 → 復元 → 緑、不可分)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:37:29Z
- **Iteration:** 1
- **Scope decision:** none

READY(Minor3件 = conductor 実測条件付き)。条件全数閉包: touch 6ファイル機械確認+plan 見出し算術是正 / corpus sweep 全数拡大(非 marker 3,056+marker 414、FULL SWEEP: PASS)/ same-root grep で marker pass:false の残存なし。列挙外テスト2件の反転は承認済み FR-1 の機械的帰結と裁定。

### Findings

- None
