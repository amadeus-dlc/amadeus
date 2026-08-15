# Requirements — intent 260815-per-unit-outcome(Issue #3099)

> Depth: Minimal(FR 7 件)。上流入力: Issue #3099 本文とクロスレビュー 2 名(ESTABLISHED_WITH_REFINEMENTS、凍結 1fc4ad83f)、RE 差分スキャン(observed `78146f435a`)。consume した codekb 3 面のうち `architecture.md`(§260815-per-unit-outcome — 読み口 2 系統分裂の機序)と `code-structure.md`(§差分リフレッシュ — 患部配置表)は本 intent の RE が更新した節から引用し、`business-overview.md` は本差分での業務境界不変のデルタ記載のみを前提として受け取る。質問回答は `requirements-analysis-questions.md`(Q1=C / Q2=A / Q3=A)。

## Intent 分析

units-generation を EXECUTE するスコープで、engine の per-unit `run-stage` 経路により完走した Construction が、per-unit consume を持つ後続ステージ(`build-and-test` ほか)から到達不能になる構造欠陥(#3099)を解消する。目標は「dispatch 経路と outcome 台帳の一致」であり、swarm 経路の挙動・監査の追記型不変量・batch 所属フィルタの意味論は保存する。修正方式 (a) fanout の outcome 源へ solo/canonical 経路を追加 / (b) autonomous 時に invoke-swarm 発行 / (c) per-unit 完了時に engine が outcome 記録 — の選定は**選挙事項**(intent 開始指示)であり、本要件はどの方式でも構造的に満たせる帰属付き条件で書く(cid:requirements-analysis:c3-measurable-ac-must-not-void-ruling)。

## Functional Requirements

### FR-1: per-unit 完走 Construction の後続到達性
units-generation EXECUTE + per-unit `run-stage` 経路で全 unit の成果着地・approve 済みの状態で、`amadeus-orchestrate.ts next` が `producer-outcome-pending` を返さず後続ステージ(build-and-test)の directive を返すこと。
受け入れ確認: #3099 再現形(下記 FR-2 のテスト)が修正前 Red / 修正後 Green。実測は受け入れ基準が名指す `next` 経路そのもので行い、内部関数の単体実行で代替しない。

### FR-2: 幅1 batch 再現条件の落ちる実証
再現テストは幅1 batch 条件(`amadeus-lib.ts:8416` の `units.length < 2` early return が plan-integrity redirect を素通りさせ per-unit dispatch に落ちる — RE 実測)を encode し、pool イベント非由来の母集団で `producer-outcome-pending` の Red を修正前断面で実測すること。
受け入れ確認: 注入 → Red 実測 → 修正 → Green → 残渣ゼロの 1 セット(cid:code-generation:falling-proof-injection-one-set)。既存の t533 integration(pool 経路 seed 14 ケース)は無改変で Green 維持。

### FR-3: batch 所属フィルタ意味論の保存
outcome 母集団の拡張・変更後も、現行 runtime 母集団外の履歴 unit を無視する意味論(`amadeus-orchestrate.ts:2461-2463` の `currentUnits` フィルタ相当)が保存されること。
受け入れ確認: 母集団外 unit の outcome が混入したケースで fanout 判定が変化しないテストが Green。

### FR-4: 全 per-unit consumer への構造的帰結
修正は build-and-test 固有の分岐でなく、7 consumer / 19 edge(`EXPECTED_PER_UNIT_CONSUMER_EDGES`)全体に構造的に及ぶこと。同根面 ci-pipeline(enterprise 限定)は本修正の帰結として治ることを本書で明記し、独立の落ちる実証は課さない(Q2=A)。
受け入れ確認: `assertConsumerEdgeInventory` の突合が不変で Green(edge 表の変更が不要な方式の場合)。edge 横断の担保は fanout 単体層テストで行う。

### FR-5: 停止済み intent の回復手順文書化
既に停止した intent(260814-open-bug-batch-6)の回復手順を、pool イベントを後から捏造しない形で文書化すること(Q1=C: `docs/guide/` へ一般手順、本 intent record へ適用実測)。
受け入れ確認: docs 面に一般手順の節が実在し、record 面に 260814-open-bug-batch-6 への適用計画(または実測)が実在する。

### FR-6: 台帳同期
修正が `amadeus-orchestrate.ts` を触る場合、model-map の実装ハッシュピン(2 occurrences)を同一変更で resync すること。`readUnitPoolEventSetsFromAudit` の catch アーム(allowlist 448 中該当 1 件)を触る場合は意味的セレクタを再アンカーすること。新規 export 関数・監査イベントを導入する場合のみ coverage-registry を regen すること(registry の鍵はソース側ユニット)。実測の一次資料: `amadeus/spaces/default/codekb/amadeus/re-scans/260815-per-unit-outcome.md` §測定述語(:40,:43)および `code-quality-assessment.md` §台帳(:3814,:3817)。
受け入れ確認: フルスイートで SOURCE_DRIFT / fingerprint / freshness の赤ゼロ。

### FR-7: swarm 経路の無退行
swarm(pool)経路で seed された outcome の消費挙動、および solo projection の失敗裁定系配線(`cancelledConstructionUnits` 等 4 呼出点)が無退行であること。
受け入れ確認: t533 unit(8)・integration(14)・t425・t-construction-outcome-projection・swarm guard 系(t207/t211/t135/t379/t251)がすべて無改変 Green(既存挙動変更が方式選定で必要になった場合は選挙裁定を根拠として記録)。

## Non-Functional Requirements

- **TDD 必須**(team.md Testing Posture): 合意済み公開 seam へ失敗テスト 1 件 → Red 実測 → 最小実装 → Green の反復。
- **監査不変量**: 監査シャードは append-only。過去イベントの書換・後付け生成(pool 捏造)は禁止(P2/検証劇場クラス)。
- **coverage 母集団**(cid:build-and-test:bt-coverage-universe-inflation): 新規テストが大型ソースを初 import しないこと。必要なら被検関数の小モジュール切出しで対処。

## Constraints

- 修正方式 (a)/(b)/(c) の選定は選挙(2 subagent、blind)。設計・実装はその裁定後(P1)。
- RFC-0001(approved)は autonomy 概念を再定義予定であり bound-surfaces が本患部と交差する。本 intent は dispatch/outcome 台帳一致の**最小修正**に留め、autonomy 意味論の変更(RFC 実装)へ踏み込まない。
- 後方互換レイヤー・フォールバック分岐の追加は禁止(org.md Forbidden)。古い挙動は置き換える。

## Assumptions

- 幅1 batch 条件は observed `78146f435a` 断面の実測(RE scan)。修正時点の base が前進していた場合は当該行の再実測を行う。
- クロスレビュー証拠(凍結 1fc4ad83f)は患部 5 ファイル不変の実測により現行断面でも有効。

## Out of Scope

- Issue ラベルの S1/P0 への変更(Q3=A — ユーザーの GitHub 操作事項)。
- ci-pipeline 面の独立した落ちる実証(Q2=A)。
- 260814-open-bug-batch-6 の実際の unpark 実行(リカバリ計画ステップ 4 — 本 intent は手順文書化まで)。
- RFC-0001(intent-autonomy-modes)の実装。

## Open Questions

- 修正方式 (a)/(b)/(c) の選定 — code-generation 前の選挙で裁定(候補の構造評価は codekb `architecture.md` §260815-per-unit-outcome に記録済み)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-15T08:36:17Z
- **Iteration:** 1
- **Scope decision:** none

7 FRs match Minimal band, faithfully encode Q1=C/Q2=A/Q3=A, cite upstream codekb sections verbatim-consistently, and no FR forecloses any of the three candidate fix methods; one MINOR citation-grounding note on FR-6 (addressed by conductor with explicit re-scan citation).

### Findings

- NIT | requirements.md FR-6 | model-map pin count and coverage-registry key claim were grounded in the out-of-scope re-scan record rather than the scoped codekb sections; conductor added explicit citation to re-scans/260815-per-unit-outcome.md and code-quality-assessment.md
