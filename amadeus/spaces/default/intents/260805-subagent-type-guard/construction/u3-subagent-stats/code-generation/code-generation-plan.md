# Code Generation Plan — U3 `subagent-stats`(集計 CLI)

## 上流入力(consumes 全数)

本計画は次の当 Unit 設計成果物に依拠する: `functional-design/business-logic-model.md`(処理フロー・エラーモデル — fail-loud 訂正注記含む)、`functional-design/business-rules.md`(BR-U3-1〜8)、`functional-design/domain-entities.md`(SubagentAuditRecord / ScannedAudit / SubagentStatsReport・seam シグネチャ・不変条件1〜5)、`nfr-design/`(reliability / performance / scalability / security / logical-components)、`inception/units-generation/unit-of-work.md`(§U3・Unit 横断の共通契約)、`inception/requirements-analysis/requirements.md`(FR-4・AC-3・AC-6・NFR-1〜4)、`inception/application-design/components.md` / `component-methods.md`(C-7 契約正本)/ `services.md`(read-only 契約)/ `decisions.md`(ADR-5: 属性不在 = unresolved、ADR-6: COMPLETED 単独タリー)。

## 実装方針

- 新設 `packages/framework/core/tools/amadeus-subagent-stats.ts`(C-7)。主要ロジックは export 純関数 `composeStatsReport(scanned, resolution, measuredAt, scanScope)` と `renderStatsText(report)` へ寄せ、main は走査フェーズ(実 FS I/O)と出力だけを持つ(BR-U3-8 — spawn 盲点回避)。`amadeus-lib.ts` へは依存しない(business-logic-model の依存方向固定)。import は U1 の `amadeus-subagent-observability.ts`(classifyAgentType / resolveAllowedAgentTypes / AllowedSetResolution)と `amadeus-harness.ts`(harnessDir — node builtins のみに依存し lib 非依存)のみ。
- TDD(NFR-2): テストを先に書き Red を実測してから最小実装。テスト戦略は **Comprehensive**(self-feature スコープ): unit(純関数・in-process)+ integration(実 FS・CLI spawn・実 corpus sweep)。
- audit シャードは v1(`event` + `fields`)と v2(`attributes.Event` + `attributes`)の両スキーマが実 corpus に混在する(実測: v1 5,853 / v2 1,017 行)。走査は fixtures の `parseAuditRecords` と同じ正規化で両方を読む。イベント判定は等値比較(不変条件2)。
- 数値は corpus sweep 時点で再確定する(audit は移動値 — Unit 横断の共通契約)。検証時点の実測値は 6,870 completed に増大している(requirements 訂正時点の 974 からの移動。本 Plan 執筆時点)。

## Steps(FR-4・AC-3・AC-6 / NFR-1〜4)

- [x] Step 1: `tests/unit/t460-subagent-stats-compose.test.ts` — composeStatsReport / renderStatsText の in-process テスト。属性 verdict 優先と食い違い計上(BR-U3-3)、trim+fallback の旧行分類、union 非適合 verdict の再分類落とし、model / Model Source / unresolved の全数勘定(BR-U3-4・不変条件3/4)、型別ランキング降順、STARTED 併記、renderStatsText の5節(BR-U3-5 — 測定 ref ヘッダ・4 verdict 全表示・0 でも出す注記行・Model/Model Source 対欠落注記)。(→ FR-4、AC-6)
- [x] Step 2: `tests/integration/t461-subagent-stats.integration.test.ts` — 実 FS テスト。fixture corpus(v1/v2 混在・parse 不能行・Model 有無)への CLI spawn、--json 契約、未知フラグの fail-closed(BR-U3-1)、読取不可シャードの fail-loud 非0 exit(エラーモデル表 訂正注記)、集合外行注入で outside-allowed-set 増加の落ちる実証。(→ FR-4、AC-6)
- [x] Step 3: 上記テストの Red 実測(対象 module 不在で失敗することを確認)。
- [x] Step 4: `packages/framework/core/tools/amadeus-subagent-stats.ts` 実装(〜120行見積)。引数 parse(parse-don't-validate、未知フラグ loud エラー exit 2)、走査(シャード列挙・両スキーマ正規化・parse skip 計上・読取失敗シャード計上)、compose / render の純関数、許可集合 warnings の stderr 役割分担(BR-U3-5)、unreadable shard > 0 で exit 非0。(→ FR-4a/FR-4b、ADR-5/ADR-6、NFR-3)
- [x] Step 5: `bun run build` で dist 再生成(NFR-1 — integration テストは dist から import)。
- [x] Step 6: 全テスト Green 化(t451/t452 含む)+ `bun run lint` + `bun run typecheck`。
- [x] Step 7: AC-3 corpus sweep 両側実証 — 実 corpus スナップショット(測定時刻の byte コピー — 走査中の追記 race を排除)へ CLI を実行し、(0) 組込台帳と同名 persona の不在を機械確認 (i) 許可集合内の観測型への警告分類ゼロ (ii) 警告対象計数が被検 CLI を経由しない独立オラクル(テスト内の独自 shard walker + U1 classifyAgentType)の機械再計算値と完全一致、を integration テストで固定。AC-6 — 実出力ヘッダの測定 ref と unresolved 区分を assert。(→ AC-3、AC-6)
- [x] Step 8: 実 corpus への live 実行で R-2 再計測の実出力を取得し code-summary.md へ貼付(BR-U3-7)。`tests/gen-coverage-registry.ts` で registry 再生成(t451/t452 と同様の登録様式)。
- [x] Step 9: code-summary.md / memory.md 作成、コミット。

## Test 戦略

Comprehensive(self-feature スコープ)。純関数(compose / render)は `tests/unit`(fs-tests-integration-first)、実 FS 走査・CLI spawn・corpus sweep は `tests/integration`。integration テストは `dist/claude/.claude/tools/amadeus-subagent-stats.ts` から import / spawn する(t451/t452 と同一様式 — `bun run build` 前提)。

## 完成条件(unit-of-work.md §U3)

- AC-3: corpus sweep 両側実証(許可集合内の実測型に警告ゼロ / 警告対象全数に警告 — 件数は実測時刻で再確定し独立オラクルと一致)。
- AC-6: 実出力に測定 ref(測定時刻・走査対象・シャード数・イベント総数)+ unresolved 区分。
- NFR-1: `bun run build` 全ハーネス再生成。NFR-3: 読取・分類の失敗は集計を止めない(件数を隠さない)。NFR-4: 既存 audit 行の遡及書換なし(読み取り専用)。
