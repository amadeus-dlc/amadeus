# Requirements（260706-three-layer-build）

対象 Issue: [#572](https://github.com/amadeus-dlc/amadeus/issues/572)（三層化 Phase 2: core/ 一本化 + build.ts 化）

## 意図分析

Phase 1（#552 / PR #565）で三層化の設計 6 問が確定し、`harness/codex/` が新設された。現状の手編集場所は source skills（`skills/amadeus-*`、42 dir）、エンジン正準（`.agents/amadeus/`）、`harness/codex/` に分散し、生成・同期は promote-skill.ts（skills → `.agents/skills`）と `.claude/*` symlink に依る。手編集と生成物の境界が構造で表現されておらず、生成物の手編集は team.md の粒度制約（source と昇格先の同一 PR 規則）という運用規律でしか守られていない。Phase 2 はこれを「core/ と harness/ だけが手編集場所、生成物は build.ts が作り、手編集は CI が検出する」構造へ一本化する。

上流入力: [Phase 1 設計確定（feasibility-questions.md）](../../../260706-harness-codex/ideation/feasibility/feasibility-questions.md)、[initiative-brief.md](../../../260706-harness-codex/ideation/approval-handoff/initiative-brief.md)、[codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)、[codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)、[codekb/amadeus/component-inventory.md](../../../../codekb/amadeus/component-inventory.md)。

## 確定済み設計（Phase 1 の 6 問、5/5 一致 — 再協議しない）

- Q1=A: core/ 直下に上流対応物 + amadeus 拡張分（scopes / sensors / knowledge）を同居。
- Q2=A: 生成物は実体コピー正、`.claude/*` symlink は harness/claude の配線規則。
- Q3=A: build.ts への tooling 一般化は Phase 2（本 Intent）で行う。
- Q4=A: team.md の粒度制約を「再生成の CI 検証」へ置き換える。
- Q5=A: Phase 2 は単独 Intent（本 Intent）。
- Q6=B 付帯: harness/codex は契約 README + provenance 置き場（Phase 2 で差分層ソースとして正準化）。

## 機能要求

- FR-1（core/ 一本化）: 手編集の正準を `core/`（上流対応物 + amadeus 拡張分の同居、Q1=A）と `harness/<harness>/`（harness 別の配線規則・差分層、Q2=A/Q6 付帯）に一本化する。既存の source skills（`skills/amadeus-*`）とエンジン正準の core/ への移動は git mv で行い、履歴追跡（`git log --follow`）を保つ。
- FR-2（build.ts）: promote-skill.ts を一般化した `build.ts` が、core/ + harness/ から harness 別の生成物（実体コピー正）を決定論的に生成する。同一入力からの再生成は byte 同一（冪等）。`.claude/*` symlink は harness/claude の配線規則として build が再現する。
- FR-3（手編集検出 = 粒度制約の置き換え、Q4=A）: 生成物の手編集を CI が検出する（再生成して diff 非ゼロなら fail）。team.md の粒度制約の該当記述を CI 検証参照へ置き換える（steering 更新を本 Intent に含む）。
- FR-4（#543 統合点）: インストーラのバージョン・ハッシュ manifest（#543、engineer2 進行中 = 検討中注記）の生成をビルド時へ統合できる接続点を build.ts 設計に含める。#543 が本 Intent の Construction までに merge されていれば統合を実装し、未 merge なら接続点の設計 + 統合手順の記録に留める（判断は functional-design で確定）。
- FR-5（#554 統合点）: model overlay（#554、merge 済み）の適用点を build 後段へ移設する。
- FR-6（tooling / 検査の追従）: `parity:check`（nameMappings / engineFileExceptions の新 path 対応）、promote 系 eval（build.ts 検証への置き換えまたは追従）、installer eval、rename-leftovers 型検出器（旧 path 残存の検出）を新構造で pass させる。Q1 付帯の 3 点セット（原子的 commit + nameMappings 拡張 + 検出器追従）を適用する（移設系の自己破壊 3 種の実例 = #553 diary）。
- FR-7（TDD）: 新規 build.ts と手編集検出は、失敗する検証（eval）を先に追加してから実装する（dev-scripts ルール）。restructure（機械的移動）は移動前後の等価性検証（全ファイル対応 + sha256、#526 と同型）で担保する。

## 非機能要求

- NFR-1（順序制約、ディスパッチ転記）: Ideation〜Inception は即並行可。機械的な大規模移動（restructure commit）は Construction で行い、着手前に leader へ solo window 要求を送る。restructure は必ず最新 origin/main を基点に、可能な限り git mv で、1 Bolt に閉じる。parity:check と promote 経路の整合は同 Bolt 内で更新する。
- NFR-2: walking skeleton の Bolt PR は人間が承認する（Construction の既定）。
- NFR-3: 成果物・PR は日本語、TS は英語。PR は draft 作成 → 3 条件充足で Ready 化。
- NFR-4（接触面）: engineer4 #557（validator 拡張）、engineer2 #543（installer）が skills/ 接触の可能性。solo window の確定は leader が調停する。

## 受け入れ条件（Issue AC と対応）

| # | 受け入れ条件 | 対応要求 |
|---|---|---|
| 1 | 手編集の場所が core/ と harness/ に一本化され、生成物の手編集が検査（CI）で検出される | FR-1 / FR-2 / FR-3 |
| 2 | test:all / parity:check / installer eval / promote 系 eval が新構造で pass | FR-6 |
| 3 | team.md の粒度制約が CI 検証に置き換わる | FR-3 |
| 4 | 新規 build.ts と手編集検出に先行する失敗検証があり、restructure は等価性検証つき | FR-7 |
| 5 | validator（260706-three-layer-build 指定）pass、gate の upstream-coverage sensor pass | 全要求 |

## スコープ外

- Phase 1 で確定済みの設計 6 問の再協議。
- 新 harness（codex / claude 以外）の追加。
- 上流 aidlc-workflows の基準 commit 更新。
- #543 本体の実装（engineer2 担当。本 Intent は統合点まで）。
