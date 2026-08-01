# Components — 260801-cg-plan-guard

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md

- `requirements.md` の FR-1〜FR-6・NFR-1〜NFR-4・裁定4件(承認系譜)を、下記 C1〜C7 の責務境界とスコープ外判断の導出元とした(各コンポーネントに担当 FR を明記)。
- `architecture.md` 現在節(260801-cg-plan-guard、observed `cb809c4de`)の患部3点(tryEmitSwarm / computeBoltDag / parseUnitsBlock)と SWARM 一次証拠(`amadeus-swarm.ts:325-327`)を、C1・C4・C5 の設置位置と C4 の証拠源の確定に用いた。
- `component-inventory.md` 現在節の判断「新規コンポーネントなし — 既存3モジュール内のガード関数追加と audit SWARM イベントの読み手追加」を本設計の上位制約として受け、モジュール新設をゼロに保つ配置(下表の Module 列)とした。

## 設計方針

本 intent は **新規モジュールを作らない**。既存3モジュール(`amadeus-orchestrate.ts` / `amadeus-runtime.ts` / `amadeus-lib.ts`)へ、次の3層に分けて関数を追加する。

1. **純判定層(`amadeus-lib.ts`)** — 入力が全て値である判定器(C2 / C3 / C4a)。in-process import で駆動でき bun coverage の spawn 盲点(`cid:code-generation:bun-coverage-spawn-blindspot`)に落ちない。既存 `recoverBoltDag`(`:8030`)と同じ位置づけ。
2. **I/O 収集層(`amadeus-orchestrate.ts` / `amadeus-runtime.ts`)** — ディスク・audit を読んで純判定層へ値を渡す薄い読み手(C1 / C4b / C5)。
3. **データ(record)** — FR-5 は record ファイルの様式是正のみで、コンポーネントを持たない。

判定と発行を分ける理由は Forbidden の検証劇場回避(判定結果を実行結果から導く)と、落ちる実証を純関数側の単体テストで決定的に取れることの2点である。

## コンポーネント一覧

| ID | 名前 | Module | 担当 FR | 責務 | 公開面 |
| --- | --- | --- | --- | --- | --- |
| C1 | `emitSwarmOrPerUnit`(発行分岐 seam) | orchestrate | FR-1 | `tryEmitSwarm` の3値化した結果を受け、`invoke-swarm` / redirect ask / violation error / per-unit フォールバックのいずれか1つを発行する単一の分岐点 | module-private(2箇所の呼び出し元 `:2782` / `:2808` を置換) |
| C2 | `planIntegrityVerdict` | lib | FR-1 | 「宣言された並行幅」と「これから発行しようとしている実行形態」から `ok` / `redirect` / `violation` を返す純判定器 | export(テスト seam) |
| C3 | `guardMessage` | lib | FR-4 | 3部メッセージ((1) 観測事実 (2) 重み (3) 公認の出口)の**唯一の**組み立て器。FR-1 / FR-2 / FR-3 の全ガード文言がこれを通る | export |
| C4a | `swarmEvidenceVerdict` | lib | FR-2 | 宣言 batch 群 × 収集済み SWARM イベント要約から `satisfied` / `missing(batches)` を返す純判定器 | export |
| C4b | `collectSwarmEvidence` | orchestrate | FR-2 | `readAllAuditShards` + `findAllEvents` で SWARM_STARTED / SWARM_DEGRADED / SWARM_COMPLETED の batch 番号集合を作る読み手 | module-private |
| C5 | `computeBoltDagOutcome` | runtime | FR-3(a)(c) | `computeBoltDag` を「値 or 欠落理由」を返す形へ置換し、units-generation 実行済みスコープの absent / malformed を loud エラー化、正常な欠落は理由付きで返す | module-private(`compile` から呼ぶ) |
| C6 | `bolt_dag_absence`(runtime-graph フィールド) | runtime → orchestrate | FR-3(c) | bolt_dag 非出力時の欠落理由を下流へ運ぶ判別子。生産者は C5、消費者は C1 と degrade 系エラー文言 | runtime-graph.json の任意フィールド |
| C7 | corpus sweep ハーネス | tests | FR-6 | 10+1 record を読み取り専用で走査し、各 record の期待 verdict(緑/赤)を機械照合する | tests のみ |

## コンポーネント責務の境界

### C1 — 発行分岐 seam(FR-1)

現行 `tryEmitSwarm`(`amadeus-orchestrate.ts:2919-`)は `boolean` を返し、**辞退理由が呼び出し元から見えない**。辞退理由は6つ(非 swarm ステージ / skeleton-gate / autonomy 未設定 / bolt_dag 不在 / 全 unit covered / batch ゲート未消化)あり、うち「発動対象」は autonomy 未設定のみ、「発動対象外」が残り5つである(AC-1c の誤発動禁止はここで機械的に守られる)。C1 は `tryEmitSwarm` の戻り値を判別 union へ変え、辞退理由と当該 batch の宣言幅を C2 へ渡して分岐する。

境界: C1 は**発行のみ**を行い判定を持たない。判定は C2、文言は C3 が持つ。

### C4 — approve 時の実績突合(FR-2)

`handleReport`(`:4177-`)の per-unit カバレッジガード(`:4461-4487`)は `isSwarmDriven`(mode subagent かつ autonomy 非 null)を**明示的に除外**している。C4 はこの除外の対称面を埋める: swarm 対象ステージの approve で、宣言 batch のうち幅≥2 のものについて SWARM 実績の有無を突合する。`isSwarmDriven` の真偽に依存しない — #1892 の不履行4件は autonomy 未設定のまま直列完走した経路を含むためである。

境界: C4 は audit を**読むだけ**で、audit へは何も書かない。SWARM イベントの emitter は `amadeus-swarm.ts` のみという一次証拠の単一性(RE §4)を保つ。

### C5 / C6 — bolt_dag 欠落の fail-closed 化と判別子(FR-3)

`computeBoltDag`(`amadeus-runtime.ts:300-313`)の2つの `undefined` — ファイル不在(`:302`、stderr すら無し)と parse 失敗(`:305-311`、stderr は hook `amadeus-runtime-compile.ts:205-217` が exit 0 時に読まないため実質無音)— を、units-generation を実行したスコープでは loud エラーへ変える。degrade スコープ(units-generation SKIP)は従来どおり無音で、これが誤発動禁止(AC-3b)の分岐条件である。判別は `compile` が既に読んでいる state(`amadeus-runtime.ts:339` `readStateFile`)の units-generation チェックボックスで行い、新規 I/O を増やさない(NFR-3)。

C6 は bolt_dag を出力しない場合に限り欠落理由を graph へ載せる。**消費者を持たないフィールドは置かない**(construction.md Forbidden「どのコードも消費しない文書のふりをしたフィールド」)ため、消費者を C1(degrade スコープの発動除外判定)と degrade 系エラー文言の2箇所に確定させる。

### FR-5 は非コンポーネント

`260712-metrics-observation/inception/units-generation/unit-of-work-dependency.md` の様式是正はデータ変更であり、`parseUnitsBlock`(`amadeus-lib.ts:7823-`)は**無改変**(裁定 B: 寛容化しない)。したがって本表にコンポーネントを持たない。C7 の sweep がその是正を 38/38 で確認する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T09:14:41Z
- **Iteration:** 1
- **Scope decision:** none

ADR 4件の代替案実在・機構引用スポットチェック・裁定忠実(redirect/DEGRADED 並行扱い/verb なし/parser 不触/recoverBoltDag 維持)・pin 棚卸し・数値見積りを確認。Minor 1件(ADR-1 列挙 6→7 箇所、:2928 脱落)は conductor が即時是正済み。

### Findings

- Minor: ADR-1 の辞退列挙が 6通り表記で :2928 を脱落(実装は return false 7箇所)— 是正済み(機能影響なし、ok 側カテゴリ合流)。
