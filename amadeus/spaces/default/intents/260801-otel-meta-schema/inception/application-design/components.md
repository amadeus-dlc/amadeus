# Components — otel-meta-schema

上流入力(consumes 全数): requirements.md、architecture.md(codekb 260801 現在節)、component-inventory.md(同)— コンポーネント分割は requirements.md の FR 系列から、改修患部の実在と現行構成(3プロバイダ+2ストア+1リレー、resource literal の所在、registry def 位置)は architecture.md 現在節から、改修面の目録・計器の現状(production 計器ゼロ)は component-inventory.md 現在節から導出した。

## 新規/改修コンポーネント(規模は行数見積り — 定性表現禁止の規範に従う)

| コンポーネント | 種別 | 見積規模 | 対応 FR |
|---|---|---|---|
| `otel/resource.ts` **新設** | 中立層 | 実装 ~120行+テスト ~180行 | FR-RES-1〜4 |
| `otel/resource-suppliers.ts` **新設**(setter API) | 中立層(注入 seam) | 実装 ~80行+テスト ~120行 | FR-RES-3 / FR-MET-3 |
| `otel/tracer-provider.ts` 改修 | 中立層 | 差分 ~70行(resource 部 ~15 / resolver 部 ~35 / recordException 部 ~20 — 3 arm の内訳明示。旧 ~50 は arm 未分割の過小見積、UG reviewer Major 1 で訂正) | FR-RES-1(literal 置換)/ FR-SPAN-1〜2 / FR-EXC-2 / FR-SUB-4 |
| `otel/local-span-exporter.ts` 改修 | 中立層 | 差分 ~20行 | FR-RES-4(`redactRecord()` :88-99 の redaction 対象へ `resource` を追加 — 現状は `...record` スプレッドで素通り、codekb component-inventory.md:15 / architecture.md:47 の名指し実測どおり) |
| `otel/logger-provider.ts` / `local-log-exporter.ts` 改修 | 中立層 | 差分 ~30行 | FR-RES-1(logs へ resource 載せ) |
| `otel/meter-provider.ts` / `local-metric-exporter.ts` 改修 | 中立層 | 差分 ~30行(resource 載せ ~10 = U1 / meter arm ~20 = U5) | FR-RES-1 / FR-MET-1 |
| 計測点配線(engine/hook 発火点 → 計器ヘルパ呼出し) | 中立層+hooks | 差分 ~55行 | FR-MET-4 |
| `otel/bootstrap.ts` 改修 | 中立層 | 差分 ~40行 | FR-RES-1(一元組み立て)/ FR-MET-1(meter arm 配線) |
| `otel/redaction.ts` 改修 | 中立層 | 差分 ~60行 | FR-EXC-3(stacktrace path 処置) |
| `otel/event-registry.ts` 改修 | 中立層 | 差分 ~30行 | FR-EXC-1 / FR-SUB-1(canonical 79 化) |
| `otel/metrics-instruments.ts` **新設**(計器定数 1定義) | 中立層 | 実装 ~60行+テスト ~80行 | FR-MET-2 |
| `hooks/amadeus-subagent-start.ts` **新設** | hooks(PreToolUse/Task) | 実装 ~100行+テスト ~130行 | FR-SUB-1〜2 |
| span attribute resolver の agent.type/id arm(tracer-provider 内) | 中立層 | 差分 ~15行 | FR-SUB-4 — resolver は `AMADEUS_AGENT_TYPE`/`AMADEUS_AGENT_ID` env を**存在する場合のみ**読む(未設定は省略 = fail-open)。**供給側は本設計では未確定**: PreToolUse hook は subagent プロセスの env を書き換える契約を持たない(hook 入出力契約 component-inventory.md:41-45 実測)ため、env への注入経路が実在するかは【FD 段の未決事項】— FD でハーネス hook API を実測し、(i) 注入経路が実在すれば配線 (ii) 不在なら FR-SUB-4 は「resolver 契約のみ実装・供給は将来のハーネス機能待ち(省略動作)」として requirements の fail-open 条項内で確定する |
| `hooks/amadeus-session-start.ts` ほか既存 hooks 改修 | hooks | 差分 ~50行 | FR-RES-3(session/model 供給) |
| `otel/subagent-lifetime.ts` **新設**(読取合成) | 中立層(読取) | 実装 ~80行+テスト ~100行 | FR-SUB-3 / FR-MET(subagent.duration 導出) |
| `settings.json.example`(全ハーネス)+dist 再生成 | 配布面 | 機械再生成 | FR-SUB-2 |
| 改修面の追加テスト(tracer 3 arm / redaction stacktrace / meter 配線 / hooks 供給の in-process 検証) | tests | ~430行 | FR-SPAN-1〜2 / FR-EXC-2〜3 / FR-MET-1・3〜4 / FR-RES-3 |
| `docs/reference/` telemetry スキーマ章 **新設** | docs | ~200行 | FR-DOC-1 |
| (変更なし)subprocess-span.ts の Command/ExitCode 経路 | — | 0行 | FR-SPAN-3(無改変維持 — 既存 characterization(t-otel-core-plumbing / t384 系)の green で確認) |
| (変更なし)exception の telemetry 分類 | — | 0行 | FR-EXC-4(不変 — FR-EVT-7 実行時検査と drift guard の green で確認) |

**合計見積(行の機械合算)**: 実装 = 120+80+70+20+30+10+20+55+40+60+30+60+100+15+50+80 = **~840行** / テスト = 180+120+80+130+100+430 = **~1,040行** / docs **~200行**(dist/self-install 再生成を除く)。units-generation の Unit 按分合計と同一値。scope-document の「additive・shim なし」制約内。〔訂正 2026-08-01(2回目): 初回訂正は総計のみの転記で行データと乖離していた(UG reviewer iteration 2 指摘)。tracer 行の 3 arm 分割訂正(50→70)・計測点配線行(~55)・改修面テスト行(~430)の追加により、行合算と総計を機械一致させた〕

## Reuse Inventory(新設の正当化 — 既存で代替できないことの根拠)

- resource 組み立て: 既存に組み立て関数ゼロ(tracer-provider.ts:137 の literal のみ — codekb 実測)→ 新設必要
- setter 注入: 既存 seam は detectHarnessType(ファイルパス自己検出)/ hook stdin / layered config の3様式のみで「実行時1回設定・上書き禁止」の API は不在 → 新設必要。ただし memo+reset シームの様式は resolveObservabilityConfig(amadeus-observability.ts:96-134)の既習形を踏襲
- 計器定数: 既存計器ゼロ(production 未配線 — codekb 実測)→ 新設必要。canonical 1定義から導出の規範に従う
- PreToolUse hook: settings に該当セクション不在 → 新設必要。3段ゲート+fail-open は amadeus-log-subagent.ts の既習形を踏襲
- lifetime 合成: started/completed 2イベントからの読取合成は readJournalRecords の既習読み様式の上に置く(Relay 改修は不要 — FR-SUB-3 の設計判断)
