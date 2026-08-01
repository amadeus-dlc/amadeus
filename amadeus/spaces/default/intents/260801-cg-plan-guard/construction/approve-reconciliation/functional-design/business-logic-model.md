# Business Logic Model — U3 approve-reconciliation

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- `unit-of-work.md` の U3 変更面(`amadeus-orchestrate.ts` / `amadeus-state.ts` の approve 経路、audit 読みは `readAllAuditShards` 再利用)を、下記 §突合の設置点と §実績の収集の「新規 I/O を足さない」制約の根拠とした。
- `unit-of-work-story-map.md` の U3 ストーリー「engine を迂回した手動 fan-out や実行形態の乖離も、approve で必ず表面化する」を、発動条件を `isSwarmDriven` に依存させない設計(§突合の発動条件 第3項)の根拠とした。
- `requirements.md` の FR-2(AC-2a / AC-2b / AC-2c)と FR-4(approve 側の3部メッセージ)、FR-6(corpus sweep)、NFR-3(既読データの突合のみ)を、本書の各節の受け入れ条件へ写した。
- `components.md` の C4a / C4b の責務境界(「C4 は audit を**読むだけ**で、audit へは何も書かない」)と C7(corpus sweep ハーネス)を、§実績の収集と §corpus sweep の構成に適用した。
- `component-methods.md` の C4a シグネチャ・C4b 実装方針・「FR-2 のガード設置点(`handleReport`)」の4条件を canonical として受け、本書はその条件列に skeleton-gate 除外1件を追加する逸脱申告(§AD からの逸脱申告 D-1)を行う。
- `services.md` の S2 契約(不足時は `error` を返し **state も audit も書かない**、逃し弁は計画訂正の一本のみ、再報告はガード対象外)を §拒否時の出力と §不変条件の前提とした。

## 突合の発動条件

approve 経路(`.claude/tools/amadeus-orchestrate.ts:4177` `export function handleReport`)で、次が**すべて**成立するときにのみ突合を行う。1つでも欠ければ従来どおり素通りする。

| # | 条件 | 実測した機構 | 根拠 |
| --- | --- | --- | --- |
| 1 | `isGated` かつ `stageCheckbox.state !== "completed"` | `:4463` の既存 per-unit ガードと同じ scoping | 再報告(recovery replay)を巻き込まない(S2 冪等性) |
| 2 | `node.for_each === SWARM_FOR_EACH && node.mode === SWARM_MODE` | `:2820` `const SWARM_FOR_EACH = "unit-of-work";` / `:2821` `const SWARM_MODE = "subagent";` | 対象は code-generation のみ。inline per-unit 設計ステージを引き込まない |
| 3 | `isSwarmDriven` を**条件にしない** | `:4461-4462` `const isSwarmDriven = node.mode === SWARM_MODE && readAutonomyMode(stateContent) !== null;` | #1892 の不履行4件は autonomy 未設定のまま直列完走した経路を含む(`components.md` C4 境界) |
| 4 | `isSkeletonGateStage(node, scope)` が偽 | `:1559-1563` | **逸脱申告 D-1**。skeleton-gate ステージでは engine 自身が swarm を辞退する(`:2933`)ため実績が構造的に 0 になり、突合すると出口のない拒否になる |
| 5 | `readBoltDagBatches(pd)` が非 null | `:1465` | degrade スコープ(bolt_dag 構造的不在)は対象外(AC-2c / AC-3b)。malformed は既存 throw(`:1491`)で落ちる = NFR-2 の非弱体化 |
| 6 | 宣言 batch のうち**幅≥2 のものが1つ以上ある** | `readBoltDagBatches` の戻り `string[][]` | 正当直列(全 batch 幅1)は突合を要求しない(AC-2c) |

条件 4 の到達可能性を実測した。stock スコープ15件で「units-generation が EXECUTE」かつ「code-generation が construction 最初の in-scope ステージ」を同時に満たすものは**存在しない**(`bun` で `.claude/tools/data/scope-grid.json` × `stage-graph.json` を突き合わせた結果: code-generation が最初になるのは chore / fix / poc / self-fix の4件で、いずれも units-generation は SKIP)。したがって条件 4 は stock では条件 5 に吸収されるが、composer が作る custom スコープでは両立しうるため、独立の分岐として残す(§AD からの逸脱申告 D-1)。

## 実績の収集(audit 読み)

`collectSwarmEvidence(projectDir)`(C4b、`amadeus-orchestrate.ts` に module-private)が3種のイベントを読み、batch 番号の集合2本を作る。

1. `readAllAuditShards(projectDir)`(`.claude/tools/amadeus-lib.ts:4335`)で当該 intent の**全クローン shard** を1バッファへ結合する。単一 shard の `readFileSync` を書かない — fork/merge を跨いだ shard が別ファイルとして並ぶため、自クローン分だけを読むと実績が偽の 0 になる。
2. `findAllEvents(audit, "SWARM_STARTED")` / `"SWARM_DEGRADED"` / `"SWARM_COMPLETED"`(`:6361`)で該当ブロックを取る。内部で `splitAuditRecords` が JSONL 1行=1レコードへ分解し、時刻順にソート済みで返る。
3. 各ブロックから `auditBlockField(block, "Batch number")`(`:4213`)で batch 番号を取り、`Number()` で数値化できたものだけを集合へ入れる。

### v1 / v2 スキーマの取り扱い(罠)

audit は2世代のレコードが**同一 shard 内に混在**する。実測(`amadeus/spaces/default/intents/*/audit/*.jsonl`):

- v1: `{"schemaVersion":1,...,"event":"SWARM_STARTED","fields":{"Batch number":"1","Unit names":"driver-contract-core","Concurrency cap":"1"}}`
- v2: `{"schemaVersion":2,...,"eventName":"amadeus.subagent.completed","attributes":{"Event":"SUBAGENT_COMPLETED",...}}`(実測: v2 レコードを含む shard は4ファイル)

イベント種別の所在(v1 は `event`、v2 は `attributes.Event` または `eventName`)とフィールドの所在(v1 は `fields`、v2 は `attributes`)が世代で異なるため、**JSON を自前で分解しない**。`auditBlockField` が `journalRecordField`(`.claude/tools/amadeus-journal.ts:130-144`)へ委譲して両世代を吸収するので、種別判定もフィールド取得も必ずこの関数を通す。

さらに、**イベント種別ごとにフィールド名が異なる**。実測した emitter(`.claude/tools/amadeus-swarm.ts`)の実引数:

| イベント | 宣言行 | フィールド |
| --- | --- | --- |
| `SWARM_STARTED` | `:339` | `"Batch number"`(`:348`)/ `"Unit names"`(複数形・カンマ連結)/ `"Concurrency cap"` |
| `SWARM_DEGRADED` | `:359` | `"Batch number"`(`:363`)/ `"Requested driver"` / `"Fallback driver"` — **unit 名フィールドを持たない** |
| `SWARM_COMPLETED` | `:405` | `"Batch number"`(`:414`)/ `"Converged count"` / `"Failed count"` |

3種に共通するキーは `"Batch number"` だけである。突合は batch 番号のみで行い、unit 名では照合しない(`SWARM_DEGRADED` に unit 名が無い以上、unit 名照合は DEGRADED を構造的に取りこぼす = AC-2b に反する)。

## 実績述語と判定(ADR-3)

純判定器 `swarmEvidenceVerdict(batches, evidence)`(C4a、lib の全域関数)が、宣言 batch 群と収集済み集合から `satisfied` / `missing` を返す。

1. **対象の絞り込み** — `batches[n-1].length >= 2` を満たす batch 番号 `n`(1-origin)だけを対象にする。幅1 batch は正当直列であり実績を要求しない(AC-2c)。
2. **述語** — 対象 batch `n` について `startedBatches.has(n) && completedBatches.has(n)`。`startedBatches` は `SWARM_STARTED ∪ SWARM_DEGRADED` である。DEGRADED は `prepare` で STARTED と同じ位置から出る **driver の降格**(ultra → subagent floor)の記録であり、実行形態の降格ではないため started 側へ合流する(AC-2b、ADR-3 Decision 2)。
3. **部分実績** — 宣言 batch の一部にしか実績が無い場合は、不足している batch を**全数列挙して**拒否する(ADR-3 Decision 3)。approve は全 unit covered 後にのみ到達するため、実績が要る batch は approve 時点で完了しているはずであり、途中状態を許す理由がない。
4. **非数値の batch 行** — `Number()` で有限値にならない `"Batch number"`(手編集・旧様式)は集合に入れない = 実績なしとして扱う(fail-closed 側へ倒す、ADR-3 Decision 4)。
5. **書き戻し禁止** — 突合結果を audit へ書かない(ADR-3 Decision 5)。書けば次回の突合が自分の書いた行を証拠として読む自己参照検証になり、org.md Forbidden の検証劇場に該当する。

### 実 corpus での述語の挙動(両側の実測)

本節の述語を `parseBoltDag` + 上記の集合構成で live record へ適用した結果(読み取り専用、本セッションで実測)。

| record | 宣言 batch 幅 | 対象(幅≥2) | STARTED∪DEGRADED | COMPLETED | 判定 |
| --- | --- | --- | --- | --- | --- |
| `260722-election-core-promotion` | `[2,1,2]` | 1, 3 | ∅ | ∅ | `missing: [1,3]`(赤) |
| `260724-mirror-auto-modes` | `[1,2,1,1]` | 2 | ∅ | ∅ | `missing: [2]`(赤) |
| `260717-test-pyramid-rebuild` | `[1,2]` | 2 | ∅ | ∅ | `missing: [2]`(赤) |
| `260720-upstream-sync-230` | `[6,3,1,1,1]` | 1, 2 | 2,3,4,5 | 2,3,4,5 | `missing: [1]`(赤 — **部分実績**の実例) |
| `260717-swarm-dispatch-enum` | `[1,1,1]` | なし | 1,2,3 | 1,2,3 | `satisfied`(緑 — 正当直列) |
| `260712-metrics-observation` | parse `malformed`(`- id: U1`) | — | ∅ | ∅ | FR-5 是正後に `[["U1","U2"],["U3"]]` → 対象 1 → `missing: [1]`(赤) |

`260720-upstream-sync-230` が ADR-3 Decision 3(部分実績)の生きた根拠である — 幅3の batch 2 は実績があり `satisfied` 側、幅6の batch 1 だけが欠けている。「実績が1件でもあれば通す」述語ならこの record は緑になり、#1892 が数えた不履行を取りこぼす。

## 拒否時の出力

`missing` のとき `emit(errorDirective(guardMessage({...})))` して `return` する。`sequence`(approve / advance / complete-workflow の dispatch 配列、`:4500` 以降)を組む前に戻るため、**state も audit も書かれない**(S2)。

3部は U2 が canonical 化した `guardMessage`(`amadeus-lib.ts`)を通す。approve 側が渡す値:

| 部 | マーカー定数 | approve 側の内容 |
| --- | --- | --- |
| (1) 観測事実 | `GUARD_OBSERVED_MARKER` | 不足 batch の番号・その宣言幅・宣言 unit 名の全数、および収集した実績集合の要約(数字は `SwarmEvidenceVerdict` のペイロードから取り、発行側で数え直さない) |
| (2) 重み | `PLAN_DRIFT_WEIGHT` | #1892 の実測(18 intent 中4件)への参照。U2 と同一定数を再利用し、approve 専用の重み文言を新設しない |
| (3) 公認の出口 | `PLAN_CORRECTION_EXIT` | `unit-of-work-dependency.md` への edge+理由追記 → `bun <harness>/tools/amadeus-runtime.ts compile` → 再実行。U2 と同一定数 |

出口が計画訂正の一本である理由は裁定2(実行時申告 verb・env スキップを新設しない)。直列で実装したことが正当なら、その正当性は計画側(edge と理由)に書かれるべきであり、そこに書けば当該 batch は幅1になって突合対象から外れる。

## corpus sweep(FR-6)の実施形

C7 の sweep は U3 の検収に含まれる(全ガード横断)。**live record を読み取り専用で走査する**形とし、fixture へコピーしない — コピーは #1892 の実測との同一性を失い、record 側の是正(FR-5)が sweep に反映されなくなる。

- 入力: `amadeus/spaces/default/intents/<record>/inception/units-generation/unit-of-work-dependency.md`(committed)と `.../audit/*.jsonl`(committed)。`runtime-graph.json` は gitignored のため使わない — 宣言 batch は `parseBoltDag`(`amadeus-lib.ts:7931`)で artifact から直接導く。
- 期待値: 10+1 record の期待 verdict を表としてテスト内に持ち、`swarmEvidenceVerdict` の戻りと機械照合する。期待値は #1892 の調査結果(不履行4・正当6)+ #1893 現物であり、テスト側で再判定しない。
- 読み手: shard は `readAllAuditShards(projectDir, intent, space)` の intent 引数で record ごとに切り替える(active intent へ依存しない)。
- 両側実測(`cid:code-generation:corpus-sweep-for-new-guards`): 赤側は上表の4 record、緑側は正当直列 record。「赤しか出ない」「緑しか出ない」述語はどちらも sweep を通らない。
- 副作用ゼロ: sweep は record へ書かない。audit へも書かない(§実績述語 5 と同じ理由)。

## AD からの逸脱申告

### D-1: 発動条件に skeleton-gate 除外を追加する

`component-methods.md` の「FR-2 のガード設置点(`handleReport`)」は条件を4つ(scoping / swarm ステージ / `readBoltDagBatches` 非 null / verdict `missing`)と定めており、skeleton-gate 除外を含まない。本書は `isSkeletonGateStage(node, scope)` が真のとき発動しない条件を**追加**する。

- 理由: skeleton-gate ステージでは `tryEmitSwarm` が `:2933` で辞退するため fan-out が engine 側で禁じられており、SWARM 実績は構造的に 0 になる。突合すると「engine が禁じた形態の実績が無い」ことを理由に approve を拒否することになり、公認の出口(計画訂正)がその拒否を解消しない = 出口のない停止になる。
- 対称性: U2 の BR-U2-4 項2(skeleton-gate は発動対象外)と同一の除外であり、AC-1c の approve 面である。
- 到達可能性: stock スコープ15件では条件 5(`readBoltDagBatches` 非 null)に吸収されるため実質不到達(§突合の発動条件の実測)。custom スコープでのみ両立しうる。
- 判断: 設計側で黙って実装せず、実装前の裁定事項として conductor へ申告する(`cid:requirements-analysis:implementation-deviation-election`)。裁定が「追加しない」なら、条件 5 が stock を守ることを根拠に本条件を落として実装する。

### 逸脱ではない境界の明示: 直接 `amadeus-state.ts approve` は覆わない

本ガードは `handleReport` に置くため、`bun .claude/tools/amadeus-state.ts approve <slug>` を直接叩く経路は通らない。これは AD(`component-methods.md` の設置点指定)どおりであり、既存の per-unit カバレッジガード(`:4463`)・finality 判定・mirror boundary 判定がすべて同じ位置にある engine 側の一貫した境界である。state 側(`approveUnderLock`、`.claude/tools/amadeus-state.ts:3259`)は `verifyStageArtifacts` による成果物実在検査のみを担い、実行形態の知識を持たない。境界を動かす提案は本 intent の射程外(Won't の「新設しない」方針と整合)であり、逸脱申告ではなく設計上の既知の穴として記録する。

**既知の穴・追記(実装後、PR #1948 レビューで確定)**: 実績収集は intent audit の append-only 全域を batch 番号で集計するため、**replan(DAG 再編成)後に旧計画の SWARM 実績が同一 batch 番号の現行証拠として通過**しうる(鮮度相関の欠如)。主目的(#1892 = swarm が一度も走らない不履行)の検出は成立。鮮度相関(SWARM イベントへの DAG 世代識別子等)は設計拡張として Issue #1953 へ切り出し。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T10:48:26Z
- **Iteration:** 1
- **Scope decision:** none

ADR-3 忠実(DEGRADED 合流・幅1除外・不足全数列挙・書戻し禁止)・実 shard の SWARM 語彙一致・approve ガード共存順序・型 canonical(形式差の申告付き)を実測確認。指摘 0 件。

### Findings

- None
