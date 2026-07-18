上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本 NFR は codekb `technology-stack.md` の TypeScript/ESM・Bun、`business-logic-model.md` と `business-rules.md` の U1 台帳再利用、`requirements.md` の FR-4/FR-6 を前提とする。新しい実行基盤や外部依存は追加しない。

# 性能要件 — U3 移設選定台帳と層別カバレッジ整合計画

本書は、移設候補のエビデンス優先判定と `CoverageTierBinding` の生成を、計算量・資源使用・再測定条件の面から具体化する。実移設、runner 変更、層別 lcov の生成、CI 配線、強制ゲート化は本 intent の範囲外である。

## PERF-1: 台帳生成は単一走査を維持する

U1 `SizeLedger` の行数を N、エビデンス確認で読む候補ソースの総量を B とする。処理は次の2段に分け、同じ母集団を反復走査しない。

1. `tier === "unit" && measured !== "small"` を1回の台帳走査で抽出し、`signals` の排他的な組合せへ機械分類する。時間計算量 O(N)、追加メモリ O(N) 以下とする。
2. 各候補の repository 内エビデンスを最大1回確認し、後述する閉じた決定表だけで final state を確定する。候補確認までは O(N + B)、2つの queue を比較 sort で安定順序へ並べる処理を含む全体は O(N log N + B)、追加メモリは O(N) 以下とする。

ネットワーク、DB、子プロセス、キャッシュ、並列ワーカ、LLM fan-out を判定経路へ追加しない。size の再判定は既存 `classifyTestSize` にだけ委ね、U3 側で regex 分類器を重複実装しない。

`CandidateEvidence` は `schemaVersion`、`observedRef`、repository 相対 `file` と、各 emitted signal に1件ずつ対応する `SignalEvidence` を持つ。各 `SignalEvidence` は signal、repository 相対の根拠 locator、反証可能な事実要約、`seam-removable | behavior-essential | lexical-false-positive | unknown` の disposition を持つ。final state の決定はこの versioned 入力だけを読む純粋な決定表とし、自由記述の意味推測を分岐条件にしない。

決定表の優先順は、(1) evidence の欠落・重複・矛盾は入力 failure、(2) `unknown` または `lexical-false-positive` が1件でもあれば `classification-review`、(3) `behavior-essential` な network があれば `retier-to-e2e`、(4) `behavior-essential` な network がなく本質的 spawn/timer があれば `retier-to-integration`、(5) 全 non-small signal が `seam-removable` なら `seam-to-small`、(6) それ以外は `classification-review` とする。これにより、同じ台帳と同じ evidence record からの final state は決定的になる。

## PERF-2: review queue と migration queue の優先順位

`classification-review` は remediation ではないため numeric migration rank を付けず、repository 相対 file の code-unit 昇順で並べる独立 `reviewQueue` に置く。fail-closed のため、この queue が空になるまで計画全体を閉包済みとしない。

確定した3 remediation は `migrationQueue` に置き、`MIGRATION_RANK_SEAM = 0`、`MIGRATION_RANK_RETIER = 1` の閉じた rank を使う。`seam-to-small` は rank 0、`retier-to-integration` と `retier-to-e2e` はともに rank 1 とし、既決の「seam が上位、retier が次点」を維持しつつ、根拠のない retier 間順位を発明しない。同順位は normalized repository 相対 file の case-sensitive code-unit 昇順で tie-break する。消費手順は `reviewQueue` の解消後、`migrationQueue` を `(rank, file)` 昇順で処理する。

## PERF-3: 現行実測を再現する基準

権威となる measurement ref は `3917a283a953165866170d235d3dc25ad2fd3643` で、`tests/` 全域再帰 442件、unit 非 small 163件である。163件の排他的バケットは次の合計と一致しなければならない。

| 排他的バケット | 件数 | 初期状態 |
| --- | ---: | --- |
| filesystem のみ | 62 | エビデンス確認後に `seam-to-small` または `classification-review` |
| filesystem + timer | 1 | timer の本質性を確認して判定 |
| spawn のみ | 9 | エビデンス確認後に `retier-to-integration` または `classification-review` |
| filesystem + spawn | 90 | signal 優先順位では決めず、両方の根拠を確認 |
| network のみ | 1 | 既知の lexical false positive のため `classification-review` |

排他的バケットの合計は `62 + 1 + 9 + 90 + 1 = 163` とする。一方、signal 出現数 FS 153 / spawn 99 / network 1 / timer 1 は重複を含むため、254 を候補件数として扱わない。件数は成果物へ固定実装せず、再生成した `SizeLedger` から毎回導出する。

## PERF-4: 応答時間・実行時間予算の非適用と閉包条件

U3 は常駐サービスでも利用者向け request path でもないため、p95/p99 latency、requests per second、同時利用者数、service SLO は N/A である。既存 timeout や単発コマンド成功を service SLO へ昇格させない。

FR-5 の tier 別実行時間予算は U2 の設計対象であり、U3 は新しい数値を追加しない。候補抽出の秒数閾値も強制メカニズムと基準実測が存在しないため設定しない。将来実装時の性能閉包は、同一 measurement ref から同じ排他的バケットと同じ候補順序を再現し、候補数増加に対して単一走査を維持することで確認する。

## PERF-5: coverage 経路の現状を性能目標と混同しない

現行 `coverage:ci` は smoke・unit・integration を実行して単一 `coverage/lcov.info` へ結合し、e2e を含めない。per-tier coverage path は存在せず、4 NamedTier binding の各 `pathState` は **PENDING** である。層別 lcov の生成コスト、保存量、実行時間は未実装・未測定なので数値目標を発明しない。具体値は follow-up で実装経路が決まった後に測定する。

## Review

**Verdict:** NOT-READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-17T17:13:02Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `performance-requirements.md` PERF-1、`reliability-requirements.md` REL-1/REL-2、`tech-stack-decisions.md` TECH-2 | 4つの final state は repository 内エビデンスの意味判断で決める一方、エビデンスの入力型・出典・判定表が定義されていない。実在する `classifyTestSize` が返すのは `size` と `signals` だけなので、同じ `SizeLedger` から LLM 判断非依存で同じ final state を得るという REL-1 を実装できない。 | versioned な `CandidateEvidence` 入力（対象 signal、根拠参照、除去可能性／本質性）と全組合せを閉じる決定表を定義し、根拠不足・競合は必ず `classification-review` へ送る純粋な判定契約にする。 |
| 2 | Major | `scalability-requirements.md` SCAL-1、`reliability-requirements.md` REL-1、`tech-stack-decisions.md` TECH-2 | 4つの final state へ拡張した後の priority 契約が未完である。`seam-to-small` を上位、`retier-to-integration` を次点とする上流順序しかなく、`retier-to-e2e` と `classification-review` の位置、値域、同順位の tie-break、priority と file path の sort-key 順が定義されていないため、「同じ候補順序」を再現・検査できない。 | 4状態を全順序へ写像する閉じた rank と、安定順序の比較キー（例: rank、repository 相対 file）を人間確認のうえ明記する。priority を付与しない状態があるなら、候補順序とは別フィールドとして契約化する。 |
| 3 | Major | `reliability-requirements.md` REL-3、`tech-stack-decisions.md` TECH-4 | coverage の2軸が単一の `coveragePath` 状態へ混在している。e2e は per-tier path が `PENDING` であると同時に `coverage:ci` 参加が `NOT EXECUTED` だが、TECH-4 の EXISTING / PENDING / N/A / NOT EXECUTED の単一判別 union では両方を同時表現できない。また binding を生成しない harness/lib の N/A を同じ型へ載せる場所もない。 | path 存在状態（EXISTING / PENDING / N/A）と CI 参加状態（EXECUTED / NOT EXECUTED / N/A）を直交する別フィールドに分け、4 NamedTier binding と補助 tier 観測の配置、不変条件を定義する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `required-sections` | PASS: 5/5（audit `SENSOR_PASSED`、fire `a25902c2` / `5ef6bd72` / `4bd68bbf` / `bb42b03f` / `4880e2b7`） | 5成果物はいずれも stage の文書形状要件を満たす。 |
| `upstream-coverage` | PASS: 5/5（audit `SENSOR_PASSED`、fire `7850a194` / `34f57a0e` / `366afb17` / `0442af70` / `3cf22ef5`） | 5成果物はいずれも `business-logic-model`、`business-rules`、`requirements` を参照する。 |
| `answer-evidence` | PASS: 1/1（audit `SENSOR_PASSED`、fire `746c6924`） | 質問票 A/A/A に parse 可能な人間承認 timestamp がある。 |
| `linter` | N/A: manifest `matches` に合う `*.ts` / `*.js` 成果物なし | Markdown 成果物へは fire していない。 |
| `type-check` | N/A: manifest `matches` に合う `*.ts` / `*.tsx` 成果物なし | Markdown 成果物へは fire していない。 |
| `classifyTestSize` 全数再測定 | PASS: 442件、unit 非 small 163件、排他的バケット 62 / 1 / 9 / 90 / 1、signal 出現数 153 / 99 / 1 / 1、非ゼロ tier×size key 11件 | 文書の実測値と一致した。`tests/unit/setup-cli-wiring.test.ts` の network 1件も文字列中の `fetch (` による lexical false positive と再現した。 |
| coverage 経路の実コード照合 | PASS: `coverage:ci` は `--ci --coverage`、`--ci` は smoke / unit / integration のみ、出力は単一 `coverage/lcov.info` | combined coverage、e2e 非実行、per-tier path 未実装という現状記述は実コードと一致する。 |

### Summary

Q&A A/A/A、上流契約、実測値、現行 classifier / coverage 経路との事実整合は取れており、架空の性能値も追加されていない。一方、エビデンス判定、priority、coverage 状態モデルの3契約が実装時の推測を残すため、現状は NOT-READY である。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-17T17:22:39Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | `performance-requirements.md` PERF-1/PERF-2、`scalability-requirements.md` SCAL-1、`reliability-requirements.md` REL-1 | 入力列挙順に依存しない file 順の2 queue を要求する一方、全体計算量を O(N + B) としている。順序保証のない N 件を通常の比較 sort で安定化する実装は O(N log N) であり、現記述には線形順序を成立させる入力前提またはアルゴリズムがない。 | 通常の比較 sort を採用するなら計算量を O(N log N + B) に修正する。O(N + B) を維持するなら、canonical file 順の `SizeLedger` 入力保証または線形時間の並べ方を明記する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| iteration 1 findings | PASS: 3/3 resolved | versioned evidence + 閉じた決定表、review/migration queue + rank/tie-break、PathState/CiParticipation の直交化はいずれも成果物間で整合し、前回の実装上の推測を除去した。 |
| `required-sections` | PASS: 5/5（audit `SENSOR_PASSED`、fire `ba9f11b5` / `750e674f` / `6e224fb7` / `7630d343` / `5183be5c`） | 修正後の5成果物はいずれも stage の文書形状要件を満たす。 |
| `upstream-coverage` | PASS: 5/5（audit `SENSOR_PASSED`、fire `b4937bd4` / `4361c8b2` / `fb9db51f` / `e3225bf1` / `3f2733ca`） | 修正後の5成果物はいずれも全必須上流 artifact を参照する。 |
| `answer-evidence` | PASS: 1/1（audit `SENSOR_PASSED`、fire `e88d8ca5`） | Q&A A/A/A に parse 可能な人間承認 timestamp がある。 |
| `linter` | N/A: manifest `matches` に合う `*.ts` / `*.js` 成果物なし | Markdown 成果物へは fire していない。 |
| `type-check` | N/A: manifest `matches` に合う `*.ts` / `*.tsx` 成果物なし | Markdown 成果物へは fire していない。 |
| `classifyTestSize` 全数再測定 | PASS: 442件、unit 非 small 163件、排他的バケット 62 / 1 / 9 / 90 / 1、signal 出現数 153 / 99 / 1 / 1、非ゼロ tier×size key 11件 | 修正後も文書の測定基準と一致し、既知の lexical false positive も再現した。 |
| coverage 経路の実コード照合 | PASS: `coverage:ci` は smoke / unit / integration を単一 `coverage/lcov.info` へ結合し、e2e は非実行 | 直交化した path/CI 状態表と現行コードが一致する。 |
| パイロット境界照合 | PASS | 成果物は設計・計画に限定され、実移設、runner/classifier/CI、#1157 の変更を要求していない。 |

### Summary

iteration 1 の Major 3件は矛盾なく解消され、Q&A A/A/A、stage 必須要件、実コードの測定事実、パイロット境界にも整合する。計算量表記に Minor 1件は残るが実装判断を阻害せず、READY と判定する。
