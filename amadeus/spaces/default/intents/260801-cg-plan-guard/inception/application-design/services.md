# Services — 260801-cg-plan-guard

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md

- `requirements.md` の FR-1(発行側)/ FR-2(approve 側)/ FR-3(compile 側)という3つの発動面と NFR-3(新規 I/O を増やさない)を、下記の3実行面ごとの契約とライフサイクル記述へ写した。
- `architecture.md` 現在節の「SWARM イベントは prepare/finalize 由来、成果物タイムスタンプは証拠にならない」を、S2 の契約(証拠源の限定)の根拠として引いた。
- `component-inventory.md` 現在節が新規コンポーネント無しと判断した結果、本書に**新規サービスは存在しない**。既存3実行面の契約変更として記述する。

## 実行面(既存プロセス境界)の一覧

本プロジェクトは常駐サービスを持たない CLI/engine であり、「サービス」は**プロセスとして起動される実行面**を指す。本 intent は新しい実行面を作らず、既存3面の入出力契約を変える。

| ID | 実行面 | 起動者 | 本 intent での変更 | 通信形態 |
| --- | --- | --- | --- | --- |
| S1 | `amadeus-orchestrate.ts next` | conductor(手動)/ SKILL 指令ループ | 辞退時に `error` / `ask` を出しうる(FR-1) | stdout = directive JSON、stderr = advisory(既存契約 `cid:code-generation:stdout-directive-stderr-advisory`) |
| S2 | `amadeus-orchestrate.ts report --result approved` | conductor | 実績突合で `error` を出しうる(FR-2) | 同上 |
| S3 | `amadeus-runtime.ts compile` | PostToolUse hook(`amadeus-runtime-compile.ts`)/ 手動 | 欠落理由の判別子を graph へ書く、不正時は非ゼロ終了(FR-3) | exit code + stderr、成果物 runtime-graph.json |

## S1 — `next` の directive 契約

**変更前**: swarm 条件不成立は例外なく per-unit `run-stage` へフォールバックする(無音)。

**変更後**: フォールバック直前に計画整合判定が挟まる。出力は3択で、いずれも既存の directive 種別のみを使う(新 kind を作らない)。

- `invoke-swarm` — 従来どおり(条件成立)。
- `ask` — autonomy 未設定 × 宣言幅≥2 の redirect(AC-1b)。既存ラダー ask と同じ種別・同じ `set-autonomy` 語彙を保つため、`t135` の「2b: ladder ask」契約は破らない。
- `error` — 宣言幅≥2 に対する直列降格(AC-1a)。conductor は directive を消費できず停止する = fail-closed。

冪等性: `next` は読み取り専用のため、同じ状態で何度呼んでも同じ directive を返す。ガードは状態を書かない。

## S2 — `report --result approved` の拒否契約

**変更前**: swarm 駆動ステージ(`isSwarmDriven`)は per-unit カバレッジガードから明示除外され、全 unit covered なら無条件に遷移をコミットする。

**変更後**: code-generation の approve は、宣言 batch のうち幅≥2 のものすべてに SWARM 実績(`SWARM_STARTED` ∪ `SWARM_DEGRADED`、かつ `SWARM_COMPLETED`)が存在することを追加要件とする。不足時は `error` を返し **state も audit も書かない**(遷移未コミット)。

証拠源の限定(architecture.md 現在節): 突合に使えるのは audit の SWARM イベントだけであり、成果物のタイムスタンプ・ファイル更新時刻は並行性の証拠にしない。

逃し弁は計画訂正の一本のみ(裁定2): `unit-of-work-dependency.md` の edge と理由を直して `compile` し直せば、直列宣言になった batch は突合対象から外れて approve が通る。実行時申告 verb・env スキップは新設しない。

冪等性: 既に `[x]` のステージへの再報告(recovery replay)はガード対象外 — 既存 per-unit ガードと同じ scoping を踏襲する。

## S3 — `compile` の終了契約

**変更前**: bolt_dag が作れないとき常に exit 0。parse 失敗は stderr へ advisory を書くが、hook は exit 0 のとき stderr を読まない(`amadeus-runtime-compile.ts:205-217`)ため実質無音。

**変更後**: units-generation を実行したスコープで artifact が不在または様式不適合なら **throw して非ゼロ終了**する。hook は非ゼロ時に `recordHookDrop` へ stderr を残し、`--doctor` が拾える。手動 `compile` では exit code がそのまま見える。

degrade スコープ(units-generation SKIP)と units-generation 未着手は従来どおり exit 0 で、`bolt_dag_absence` に理由を残す。ここが誤発動禁止(AC-3b)の唯一の分岐であり、判定材料は既に読んでいる state のチェックボックスのみ(新規 I/O ゼロ、NFR-3)。

## オーケストレーション形態と依存

3面は互いを直接呼ばない(choreography ではなく、conductor が順に叩く逐次オーケストレーション)。共有資源は次の3つで、いずれも**既存**である。

- `runtime-graph.json` — S3 が書き、S1/S2 が読む。本 intent で任意フィールドが1つ増える。
- `amadeus-state.md` — S1/S2/S3 が読む。本 intent で書き手は増えない。
- audit shards — `amadeus-swarm.ts` のみが SWARM 行を書き、S2 が読む。本 intent で書き手は増えない。

スケーリング特性は対象外(常駐なし・1プロセス1判定)。性能要件は NFR-3 のとおり「新規 I/O を増やさない」ことのみで、実時間ベンチは持ち込まない。
