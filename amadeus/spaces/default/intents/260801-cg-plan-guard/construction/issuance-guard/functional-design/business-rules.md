# Business Rules — U2 issuance-guard

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- `unit-of-work.md` の U2 検収リスト(AC-1a / AC-1b / AC-1c / AC-4a 発行側分)を BR の受け入れ側チェックリストとして用い、各 BR に対応 AC を付した。逆方向 AC が U2 の検収に含まれないことを BR-U2-6 の根拠とした。
- `unit-of-work-story-map.md` の U2 価値到達点「U1+U2 = 実測4件クラス(計画不履行)の構造的阻止」を、BR-U2-2(redirect の発動条件)と BR-U2-3(fail-closed 既定)の 2 本を必須とする根拠とした。
- `requirements.md` の AC-1c(誤発動禁止)・NFR-1(誤発動ゼロは Critical)・NFR-2(既存 fail-closed の非弱体化)・NFR-3(新規 I/O ゼロ)・NFR-4(dist 9 コピー同期)を BR-U2-4 / BR-U2-7 / BR-U2-8 / BR-U2-12 へ写した。制約節の pin 棚卸し要求(CR-5 同型)は BR-U2-9 / BR-U2-10 が受ける。
- `components.md` の C1 境界「C1 は発行のみを行い判定を持たない」と C3「FR-1 / FR-2 / FR-3 の全ガード文言がこれを通る」を、BR-U2-1(層の分離)と BR-U2-5(文言の単一定義)の成立条件とした。
- `component-methods.md` の C2 判定仕様(`pendingBatch === null` または `units.length < 2` → `ok` ほか)と C3 の3部契約を、下記判定表と AC-4a 検査項目の canonical とした。
- `services.md` の S1 契約(新 directive kind を作らない・ガードは状態を書かない・`next` は冪等)を BR-U2-11 の不変条件とした。

## 判定の規則

### BR-U2-1(層の分離)— NFR-1 の前提

判定(`planIntegrityVerdict`)・文言(`guardMessage`)は `amadeus-lib.ts` の純関数に置き、ディスク・audit・`process.env` を読まない。発行(`emitSwarmOrPerUnit`)は `amadeus-orchestrate.ts` に置き、判定式を持たない。判定結果を実行結果から導かない構造(org.md Forbidden の検証劇場回避)を、この分離で機械的に保証する。

判定器は `throw` しない全域関数とする。入力の欠落(`pendingBatch === null`)は例外ではなく `ok` である。

### BR-U2-2(両方向の判定表)— AC-1a / AC-1b / AC-1c

計画(bolt_dag の宣言)× 実行(これから発行しようとする形態)× 判定の対応。「宣言幅」は**宣言 batch 全体の unit 数**であり、未 cover 数ではない(`business-logic-model.md` §判定の入力)。

| # | 計画(宣言幅) | 実行(辞退理由) | 判定 | 出力 |
| --- | --- | --- | --- | --- |
| 1 | 宣言なし(`pendingBatch === null`) | 任意 | `ok` | `run-stage`(従来) |
| 2 | 幅1(正当直列) | 任意 | `ok` | `run-stage`(従来) |
| 3 | 幅≥2 | `not-swarm-stage` | `ok` | `run-stage`(inline per-unit 設計ステージ等) |
| 4 | 幅≥2 | `skeleton-gate` | `ok` | `run-stage`(Bolt 1 は常に人間ゲート) |
| 5 | 幅≥2 | `no-dag` | `ok` | 従来の degrade / 未 compile 経路 |
| 6 | 幅≥2 | `all-covered` | `ok` | `run-stage`(全 cover 再入 = 本来のステージゲート) |
| 7 | 幅≥2 | `autonomy-unset-pre-skeleton` | `ok` | `run-stage`(`gate:false` の per-unit 反復) |
| 8 | 幅≥2 | `autonomy-unset`(skeleton 完了後) | `redirect` | `ask`(3部・出口 = `set-autonomy`) |
| 9 | 幅≥2 | 上記以外(将来の新理由) | `violation` | `error`(3部・出口 = 計画訂正) |

逆方向(直列計画 → 並列実行)は行を持たない。engine が組む batch は常に bolt_dag 由来であり、発行側では観測できないためである(BR-U2-6)。

### BR-U2-3(未知理由は停止側へ倒す)— fail-closed 既定

判定器の `default` は `violation` とする。`SwarmDecline` の網羅性をコンパイル時に強制する `never` チェックは**置かない** — 置くと未知理由が型検査で潰れ、ランタイムの fail-closed が消える。行 9 は「新しい辞退理由を足した実装者が C2 の分岐を更新し忘れた場合」の安全網である。

### BR-U2-4(非発動集合の全数固定)— AC-1c / NFR-1

次の集合はガードを発動させない。誤発動は Critical 欠陥として扱い、各行を個別のテストで固定する。

1. **degrade スコープ**(units-generation を SKIP → `no-dag`)。※申告付き是正(E-CPG-U2ABS): 当初の「かつ `BoltDagAbsence.reason === "scope-skips-units"`」条件は、no-dag → ok が理由に依らず無条件である実装事実に合わせて削除 — 理由の判別はガード判定に不要で、参照すると未消費フィールドが生まれる。
2. **skeleton-gate ステージ**(`isSkeletonGateStage` が真。`fix` / `poc` / `security-patch` では code-generation 自身が該当する)。
3. **非 swarm ステージ**(`for_each !== "unit-of-work"` または `mode !== "subagent"` の inline per-unit ステージ — functional-design / nfr-requirements 等)。
4. **正当直列**(宣言幅1のみで構成された DAG)。
5. **全 unit covered の再入**(ステージゲート提示のための正常な経路)。
6. **skeleton 未完了 × autonomy 未設定**(ラダー発火前の正当な初期状態)。

6 の根拠は `.claude/tools/amadeus-orchestrate.ts:3234-3235` の設計コメント `Only AFTER the skeleton — an unset grant before it is the legitimate initial state and keeps today's behaviour.` であり、実測の pin は `tests/integration/t251-swarm-and-next-stage.test.ts` test d(fixture `:295` `- [-] functional-design — EXECUTE`、assert `:231` `expect(directive.kind).toBe("run-stage")`)である。

`no-dag` のとき U1 の判別子が読めない場合(runtime-graph 自体が無い等、`absence === null`)も `ok` とする。判定材料が無い状態でガードを発動させない(U1 BR-U1-4 と同じ方針)。

### BR-U2-5(文言は1定義から導出)— FR-4

`redirect` / `violation` の文言は `guardMessage` 1関数と canonical 定数(`PLAN_CORRECTION_EXIT` / `PLAN_DRIFT_WEIGHT` / `AUTONOMY_LADDER_EXIT`)だけから作る。呼び出し側でテンプレート文字列を組まない。既存の `AUTONOMY_LADDER_QUESTION`(`.claude/tools/amadeus-orchestrate.ts:1581-1586`)と `degradeUnitResolutionError`(`:3064-3090`)は**無改変**で、`AUTONOMY_LADDER_EXIT` は前者の `set-autonomy --mode autonomous|gated` 語彙を再利用するのみとする(新しいコマンド語彙を発明しない)。

観測部に載せる数字(宣言幅・batch 番号・unit 名)は `PlanIntegrityVerdict` のペイロードから取り、発行側で数え直さない(`cid:requirements-analysis:ledger-count-mechanical-recalc` の実装面)。

### BR-U2-6(逆方向は U3 へ委譲)— FR-1 但し書き

発行側で観測できるのは engine 自身が出す directive のみであり、engine が組む batch は `firstUncoveredBatch`(`:2843-2858`)が `batches` から選ぶため依存 edge を跨がない。したがって「直列計画に対する並列実行」は発行側に現れない。検出は U3(FR-2、approve 時の SWARM 実績突合)へ全面委譲し、U2 の完成条件から逆方向の受け入れ基準を外す。この委譲は観測可能性に基づく境界であり、未実装ではない。

## AC-4a(発行側分)の機械検査項目

`requirements.md` AC-4a は「各ガードメッセージの3部実在を機械検査するテスト(部欠落で Red)」を要求する。U2 が負担するのは `redirect` と `violation` の2メッセージである(approve 側は U3)。

### BR-U2-7(検査述語の構成)

1. マーカー3定数(`GUARD_OBSERVED_MARKER` / `GUARD_WEIGHT_MARKER` / `GUARD_EXIT_MARKER`)が生成文字列に**すべて**含まれること。テストはリテラルを再定義せず定数を import する。
2. 観測部に `declaredWidth` の数値と対象 unit 名がすべて含まれること(数字のないガードは「観測事実」を欠く)。
3. `redirect` の出口部が `set-autonomy` を含むこと(既存ラダー語彙の再利用の実証、かつ `tests/integration/t135-invoke-swarm.test.ts:318` の pin と同一契約)。
4. `violation` の出口部が計画訂正の3手(`unit-of-work-dependency.md` への edge+理由追記 → `compile` → 再実行)を名指すこと。
5. 落ちる実証: 3部のいずれか1つを欠いた入力で検査が Red になることを実証する(`cid:code-generation:corpus-sweep-for-new-guards` の両側実測 — 正当な3部入力で緑になることも同時に固定する)。

### BR-U2-8(語彙衝突の予防)

マーカー文字列が観測部・出口部の本文中に偶然現れると検査が空文化しうる。マーカーは行頭固定の接頭辞として使い、検査は「マーカーの実在」で行う(出現回数の一致までは要求しない)。定数を変更する際は vacuity guard(3部すべてを空にした入力で検査が Red)を併せて確認する(`cid:code-generation:vocabulary-collision-vacuity-guard`)。

## 既存 pin への影響(実測の棚卸し)

`requirements.md` 制約節(CR-5 同型)の要求により、本 Unit の変更が触れうる既存 pin を実測して宣言する。以下は observed HEAD で直読・grep した結果である。

### BR-U2-9(維持される pin — 改訂不要)

| テスト | 行 | pin 内容 | 本設計での帰結 |
| --- | --- | --- | --- |
| `tests/integration/t135-invoke-swarm.test.ts` | `:317-318`(2b) | skeleton 完了 × autonomy 未設定 → `ask` かつ question に `set-autonomy` を含む | `redirect` が同じ `ask` 種別で発火し、出口部が `set-autonomy` を含む。`toContain` のため本文の3部化でも通過する |
| 同上 | `:325`(2c) | 不正な autonomy 値は `invoke-swarm` にならない | 維持(`redirect` の `ask` は `invoke-swarm` でない) |
| 同上 | `:337`(7)/ `:347`(7b) | skeleton-gate ステージは autonomy 有無に関わらず `run-stage` | 維持(判定表 行4 → `ok`) |
| `tests/integration/t251-swarm-and-next-stage.test.ts` | `:231`(d) | skeleton 未完了 × 幅2 × autonomy 未設定 → `run-stage` かつ `gate:false` | **`autonomy-unset-pre-skeleton` アームの追加により維持**(D-1 が無ければ赤化する) |
| `tests/unit/t211-swarm-batch-progress.test.ts` | `:358`(h) | gated × 全 batch covered → `run-stage`(二重ゲートなし) | 維持(判定表 行6 → `ok`)(§12a iteration 1 Major の是正: t251:189 への誤帰属を実体 t211:358 へ訂正 — フルパス引用は E-FSPRAS13 準拠) |
| `tests/unit/t211-swarm-batch-progress.test.ts` | `:238`(b) | 全 batch covered → `invoke-swarm` でなく `run-stage` | 維持(同上) |
| `tests/unit/t186-foreach-per-unit-iteration.test.ts` | `:307` / `:338` / `:369` / `:435` / `:447` / `:462` | inline per-unit ステージは bolt_dag 有りでも従来どおり `run-stage` | 維持(判定表 行3 → `ok`) |
| `tests/integration/t367-degrade-unitname-resolution.test.ts` | `:269` ほか | dag 無しの degrade 解決 | 維持(判定表 行1・行5 → `ok`) |
| `tests/integration/t166-multi-repo-construction.test.ts` | — | `invoke-swarm` の `repo` フィールド | 維持(`emitted` 経路は無改変) |

### BR-U2-10(実装前に必須の追加棚卸し)

上表は「swarm / per-unit の directive 種別を assert するテスト」の実測にすぎない。着手前に次の2軸で全数 grep を行い、赤化するものを plan で宣言してから実装する(`cid:requirements-analysis:enumeration-reverify-at-implementation`。棚卸しを省いた着手は禁止)。

1. **`tryEmitSwarm` の戻り値型変更の波及** — `boolean` を前提にした呼び出し・スタブ・型参照。実測では呼び出しは `:2782` / `:2808` の2箇所のみ(`grep -n 'tryEmitSwarm'` のヒットは他に定義 `:2919` とコメント3件 `:1124` / `:3331` / `:4443` / `:4453`)だが、コメント側は文言の整合を要する。
2. **D-2 の到達可能性変化**(`business-logic-model.md` §AD からの逸脱申告)— 「autonomy 未設定 かつ malformed な `unit-of-work-dependency.md` / `runtime-graph.json`」を持つ fixture。`readBoltDagBatches` の malformed throw(`:1489-1491`)が新たに到達しうる。

`tests/unit/t113.test.ts` は `run-stage` の assert を多数持つが swarm 経路ではない(scope/next 解決系)。無影響と判断したが、上記 1 の grep で再確認する。

## 不変条件

### BR-U2-11(directive 契約の維持)— S1

- 新しい directive `kind` を作らない。出力は `invoke-swarm` / `ask` / `error` / `run-stage` の既存4種のみ。
- ガードは state・audit・runtime-graph に**書かない**。`next` は読み取り専用のまま冪等であり、同じ状態で何度呼んでも同じ directive を返す。
- stdout は directive JSON のみ、advisory は stderr(`cid:code-generation:stdout-directive-stderr-advisory`)。ガードメッセージは directive の `question` / `message` フィールドに載せ、stdout へ素の文字列を書かない。

### BR-U2-12(新規 I/O ゼロと配布整合)— NFR-3 / NFR-4

判定に必要な読みは `readBoltDagBatches` と `firstUncoveredBatch` のみで、いずれも autonomy 有りの経路で既に行っていた読みである。辞退経路へ前倒しするだけで新規のディスク読みを足さない。非 swarm ステージ・skeleton-gate では DAG を読まずに辞退する(無駄な読みを増やさない)。

`amadeus-orchestrate.ts` / `amadeus-lib.ts` は core 正本であり、`bun scripts/package.ts` と `bun run promote:self` による dist 7面+self-install の同期を同一変更に含める。`dist:check` / `promote:self:check` の green を完成条件とする。

### BR-U2-13(既存 fail-closed の非弱体化)— NFR-2

`readBoltDagBatches` の malformed throw、`recoverBoltDag`(`.claude/tools/amadeus-lib.ts:8030`)、`isSkeletonGateStage` の構造ガード、`owedBatchGate` の batch ゲートは**無改変**とする。本 Unit は分岐の追加のみで、既存の厳格側を緩めない。
