# Application Design — Components

Intent: 260818-priority-bug-batch-4(depth Minimal — 変更が触る既存コンポーネントの境界のみ。新規モジュールは作らない)

上流: `../requirements-analysis/requirements.md`(FR 帯)、codekb `component-inventory.md` 本 intent 節(責務 3 増・モジュール 0 増の現況)、codekb `architecture.md` 本 intent 節(patch 面の位置)。方式は `decisions.md` ADR-1 / ADR-2。

## Unit 1: issue-2837-invoke-swarm-context(#2837 + FR-2837-5)

| コンポーネント | 責務(本 unit での変更) | 境界・所有 |
|---|---|---|
| `packages/framework/core/tools/amadeus-directive.ts` | `InvokeSwarmDirective` 型 + `INVOKE_SWARM_FIELDS` 閉語彙 + validator へ batch/pool identity フィールドを追加。retry arm との排他/含意を fail-closed 化。:306-311 の偽コメント訂正 | directive 契約の単一定義点(公開面) |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `emitConfiguredSwarm` が batch identity を受領・搬送(破棄をやめる)。DAG index join 面(ADR-1 契約3の全数列挙)の同時整合 | engine-owned routing の権威 |
| `packages/framework/core/tools/amadeus-swarm.ts` | `prepare --batch` の受理形を搬送 identity と同一変更で整合(非数値化する場合のみ)。pool identity の衝突回避 | pool 台帳の識別子権威 |
| conductor 面 7 面(claude/codex/kimi/kiro/kiro-ide skills、cursor/opencode commands) | `--batch <n>` 手動指定を directive 搬送値の転記へ更新。check_cmd/test_file の正規取得元(conductor 知識)を明記 | 配送先ツリー述語で受け入れ |
| `packages/framework/core/tools/amadeus-bolt.ts` / `amadeus-state.ts` | stale SKILL.md 参照コメント 2 箇所の更新(FR-2837-5、挙動不変) | コメントのみ |
| tests(t135 / t113 / t181 + 新規回帰) | batch 導出の直接検証、failed-terminal 再提示の回帰(Red 先行)、validator テスト | unit 層(t211 は tests/unit/ 配下) |

## Unit 2: issue-3106-per-unit-outcome(#3106)

| コンポーネント | 責務(本 unit での変更) | 境界・所有 |
|---|---|---|
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `settlePerUnitOutcomes` に cancelled/failed の emit arm を追加(canonical projection 由来の観測事実のみ)。`SETTLED_UNIT_OUTCOME` → 閉集合3値。`readSettledUnitOutcomes` の受理拡張 + supersession 規則。pool 優先 de-dup と数値 batch join は逐語保存 | settle 台帳の emitter/reader(変更はここに閉じる) |
| `packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts` | **変更なし**(KNOWN_OUTCOMES は cancelled/failed を既に受理 — 読み口不変が ADR-2 の骨子) | 読み口 |
| `packages/framework/core/tools/amadeus-construction-outcome-projection.ts` | **変更なし**(cancelled/failed の導出元として読むだけ) | 観測源 |
| `docs/guide/15-troubleshooting.md` + `.ja.md` | 既知限界段落の更新(英日同一変更、対訳実文言の実読特定後) | FR-3106-4 |
| tests(t533 の対 + supersession round-trip) | per-unit settle × cancelled の Red(:786-801 の対の位置)、failed 版(到達可能性実証を前提)、cancel→再入→success の系列固定 | integration 層 |

## コンポーネント図(dispatch → settle → consume の患部位置)

```
  engine (amadeus-orchestrate.ts)
  ├─ firstUncoveredBatch ── batchNumber ──┐
  │                                        ▼
  ├─ emitConfiguredSwarm ──► invoke-swarm directive ──► conductor 面(7面)
  │        [U1: batch/pool identity を搬送に追加]         └─► amadeus-swarm prepare/check/finalize
  │                                                            └─ pool identity = f(batch)
  └─ settlePerUnitOutcomes ──► UNIT_OUTCOME_SETTLED 行(audit)
           [U2: cancelled/failed arm 追加]      │
                                                ▼
        readPerUnitConsumePopulation ──► per-unit-consume-fanout(KNOWN_OUTCOMES、変更なし)
```

テキストフォールバック: U1 は engine が算出済みの batch 番号を directive へ通し、conductor 面が転記して swarm CLI へ渡す(推測の除去)。U2 は settle 台帳の emit arm を cancelled/failed へ広げ、既に受理可能な読み口へ行を届ける(読み口不変)。両 unit の変更は `amadeus-orchestrate.ts` で交差する(直列化 — `component-dependency.md`)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-18T08:31:00Z
- **Iteration:** 1
- **Scope decision:** none

FR-2837/FR-3106全件がADR-1/ADR-2の実装契約とcomponents/component-methods/component-dependencyへ一貫してトレースでき、codekb file:line引用も照合一致、循環依存なし、後方互換レイヤー混入なしで実装可能と判断

### Findings

- FOLLOW-UP | decisions.md ADR-1/ADR-2はphases/inception.mdが必須とする各主要決定のセキュリティ・コンプライアンス影響記載を一切含まない(該当なし一行の明記もなし)
- FOLLOW-UP | ADR-1実装契約item6はFR-2837-2のcheck_cmd正規取得元反映を「7 conductor 面」に限定するが、requirements.mdのFR-2837-2受け入れ条件は全conductor面(8面)を対象とし0件の面が残ればfailと定めており、pi面の扱いが設計時点で未解決のまま実装時判断へ先送りされている
