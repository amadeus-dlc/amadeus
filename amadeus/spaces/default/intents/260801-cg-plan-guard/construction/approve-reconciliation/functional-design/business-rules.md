# Business Rules — U3 approve-reconciliation

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- `unit-of-work.md` の U3 検収リスト(AC-2a / AC-2b / AC-2c / AC-4a approve 側分 + FR-6 の corpus sweep)を BR の受け入れ側チェックリストとして用い、各 BR に対応 AC を付した。
- `unit-of-work-story-map.md` の U3 ストーリー「engine を迂回した手動 fan-out や実行形態の乖離も、approve で必ず表面化する」を、BR-U3-2(手動 fan-out も拒否対象)と BR-U3-3(部分実績の全数列挙)の必須性の根拠とした。
- `requirements.md` の FR-2(逃し弁は計画訂正のみ)・AC-2a/2b/2c・NFR-1(誤発動ゼロは Critical)・NFR-2(既存 fail-closed の非弱体化)・NFR-3(新規 I/O ゼロ)・NFR-4(dist 9 コピー同期)を BR-U3-4 / BR-U3-7 / BR-U3-10 / BR-U3-11 へ写した。制約節の pin 棚卸し要求(CR-5 同型)は BR-U3-8 / BR-U3-9 が受ける。
- `components.md` の C4 境界「C4 は audit を**読むだけ**で、audit へは何も書かない」と C7(corpus sweep ハーネス)を BR-U3-6(書き戻し禁止)と BR-U3-12(sweep の読み取り専用性)の canonical とした。
- `component-methods.md` の C4a 判定仕様(幅≥2 の batch のみ・`startedBatches.has(n) && completedBatches.has(n)`)と C4b の読み手方針(数値化できない値は集合に入れない)を、下記判定表と BR-U3-5 の canonical とした。
- `services.md` の S2 契約(不足時は `error` を返し state も audit も書かない、再報告はガード対象外、逃し弁は計画訂正の一本)を BR-U3-1 / BR-U3-6 / BR-U3-7 の不変条件とした。

## 判定の規則

### BR-U3-1(層の分離)— NFR-1 の前提

判定(`swarmEvidenceVerdict`)は `amadeus-lib.ts` の純関数に置き、ディスク・audit・`process.env` を読まない。収集(`collectSwarmEvidence`)と発行(`handleReport` 内のガード)は `amadeus-orchestrate.ts` に置き、判定式を持たない。判定結果を実行結果から導かない構造(org.md Forbidden の検証劇場回避)を、この分離で機械的に保証する。

判定器は `throw` しない全域関数とする。対象 batch が 0 件(全 batch 幅1)は例外ではなく `satisfied` である。

### BR-U3-2(突合の対象と非対象)— AC-2a / AC-2c

| # | 状況 | 突合 | 帰結 |
| --- | --- | --- | --- |
| 1 | 宣言 batch がすべて幅1(正当直列) | **しない** | 従来どおり approve 通過(AC-2c) |
| 2 | `readBoltDagBatches` が `null`(degrade スコープ・未 compile) | **しない** | 従来どおり approve 通過 |
| 3 | 幅≥2 の batch あり × 当該 batch に STARTED∪DEGRADED と COMPLETED が揃う | する | `satisfied` → 通過(AC-2b) |
| 4 | 幅≥2 の batch あり × 実績 0 | する | `missing` → 拒否(AC-2a) |
| 5 | 幅≥2 の batch が複数 × 一部だけ実績あり | する | `missing`(不足分を全数列挙)→ 拒否 |
| 6 | 対象ステージが code-generation でない | **しない** | inline per-unit 設計ステージを引き込まない |
| 7 | `stageCheckbox.state === "completed"`(再報告) | **しない** | 冪等な recovery replay を壊さない(S2) |
| 8 | skeleton-gate ステージ | **しない** | 逸脱申告 D-1(`business-logic-model.md`)。engine が fan-out を禁じている以上、実績 0 は違反ではない |

行 4 が対象にするのは「engine を迂回した手動 fan-out」だけではなく、「並行と宣言しながら直列で完走した」経路そのものである。手動 fan-out(worktree を切って並行実装したが `prepare` / `finalize` を通していない)も同じく拒否される — これは意図した挙動で、逃し弁は計画訂正のみ(ADR-3 Consequences)。

### BR-U3-3(DEGRADED は実績側へ合流)— AC-2b

`SWARM_DEGRADED` は `prepare` で `SWARM_STARTED` と同じ位置から出る **driver の降格**(要求された ultra が使えず subagent floor で走った)の記録であり、実行形態(fan-out したか)の降格ではない。したがって `startedBatches = SWARM_STARTED ∪ SWARM_DEGRADED` とする。

実装上の含意として、突合は `"Batch number"` のみで照合し unit 名では照合しない。`SWARM_DEGRADED` は unit 名フィールドを持たない(`.claude/tools/amadeus-swarm.ts:359-365` の実引数は `"Batch number"` / `"Requested driver"` / `"Fallback driver"` の3つ)ため、unit 名照合は DEGRADED を構造的に取りこぼし AC-2b に反する。

### BR-U3-4(部分実績は不足を全数列挙して拒否)

宣言 batch のうち一部にしか実績が無い場合、`missing` に残り**全数**を載せる。「1件でも実績があれば通す」述語は採らない。

根拠は実測である(`business-logic-model.md` §実 corpus での述語の挙動): `260720-upstream-sync-230` は宣言 batch 幅 `[6,3,1,1,1]` で、幅≥2 の対象は batch 1(幅6)と batch 2(幅3)。実績は batch 2〜5 にあり batch 1 に無い。ゆるい述語ならこの record は緑になり、#1892 が「部分」と数えた不履行を取りこぼす。

approve は全 unit covered 後にのみ到達するため、実績が要る batch は approve 時点で全て完了しているはずであり、途中状態を許す理由がない(ADR-3 Decision 3)。

### BR-U3-5(非数値の batch 行は実績に数えない)— fail-closed 既定

`auditBlockField(block, "Batch number")` の戻りが `Number()` で有限値にならない行(手編集・旧様式・空文字)は集合へ入れない。実績なしとして扱い、拒否側へ倒す(ADR-3 Decision 4)。

集合へ入れる前に有限性を確認する。`Number("")` は `0` を返すため、`Number.isFinite` だけでは空文字が batch 0 として通る — 空文字を先に弾く。batch 番号は 1-origin であり `0` は宣言 batch と対応しないため実害は無いが、集合に偽の要素を入れない規律として明記する。

### BR-U3-6(突合結果を書き戻さない)— C4 境界 / 検証劇場の回避

突合は audit・state・runtime-graph へ何も書かない。書けば次回の突合が自分の書いた行を証拠として読む自己参照検証になり、org.md Forbidden(「判定結果を実行結果から導出せずに構築しない」)に該当する。

SWARM 行の emitter は `.claude/tools/amadeus-swarm.ts` のみという一次証拠の単一性(RE §4)を保つ。本 Unit は audit の**読み手を1つ増やすだけ**で、書き手を増やさない。

### BR-U3-7(逃し弁の唯一性)— 裁定2

拒否の解消手段は計画訂正の一本のみ:`unit-of-work-dependency.md` の edge と理由を直して `compile` し直す。直列が正当なら当該 batch は幅1になり、BR-U3-2 行1 により突合対象から外れて approve が通る。

実行時申告 verb(「直列で実装した」と宣言する verb)・環境変数によるスキップ・`--force` 系フラグを**新設しない**。既存の `artifactGuardDisabled()` 相当のバイパスにも相乗りしない。

## AC-4a(approve 側分)の機械検査項目

`requirements.md` AC-4a は「各ガードメッセージの3部実在を機械検査するテスト(部欠落で Red)」を要求する。U2 が `redirect` / `violation` の2メッセージを負担し、**U3 が負担するのは approve 拒否メッセージ1本**である(`unit-of-work.md` の U4 レビュー Minor「AC-4a の U2/U3 分担を plan 段で明記」への回答)。

### BR-U3-8(検査述語の構成)

1. マーカー3定数(`GUARD_OBSERVED_MARKER` / `GUARD_WEIGHT_MARKER` / `GUARD_EXIT_MARKER`)が生成文字列に**すべて**含まれること。テストはリテラルを再定義せず U2 が export した定数を import する。
2. 観測部に不足 batch の番号・宣言幅・宣言 unit 名がすべて含まれること(数字のないガードは「観測事実」を欠く)。数値は `SwarmEvidenceVerdict` のペイロードから取り、メッセージ組み立て側で数え直さない(`cid:requirements-analysis:ledger-count-mechanical-recalc`)。
3. 出口部が計画訂正の3手(`unit-of-work-dependency.md` への edge+理由追記 → `compile` → 再実行)を名指すこと。U2 と同一の `PLAN_CORRECTION_EXIT` を通すため、この検査は「同一定数を経由したか」の検査に等しい。
4. 重み部が `PLAN_DRIFT_WEIGHT` を通ること。approve 専用の重み文言を新設しない。
5. 落ちる実証: 3部のいずれか1つを欠いた入力で検査が Red になること、および正当な3部入力で緑になることを同時に固定する(`cid:code-generation:corpus-sweep-for-new-guards` の両側実測)。

U2 が `guardMessage` を canonical として先に着地させるため、U3 は**文言組み立て器を新設しない**。U3 が新設するのは approve 拒否に載せる3部の**値**だけである。

## 既存 pin への影響(実測の棚卸し)

`requirements.md` 制約節(CR-5 同型)の要求により、本 Unit の変更が触れうる既存 pin を実測して宣言する。以下は observed HEAD で直読・grep した結果である。テスト引用はフルパスで書く(`cid:requirements-analysis:reservation-transcription-count-check` 追補 = E-FSPRAS13)。

### BR-U3-9(維持される pin — 改訂不要)

| テスト | 行 | pin 内容 | 本設計での帰結 |
| --- | --- | --- | --- |
| `tests/unit/t211-swarm-batch-progress.test.ts` | `:391-399`(l) | gated × batch 1 covered の `report --stage code-generation --result approved` が `error` **でない** | **維持**。fixture は `seedAutonomyProject([["alpha"], ["beta"]], "gated")`(`:396`)で全 batch 幅1 → BR-U3-2 行1 により突合しない |
| 同上 | `:402-407`(m) | autonomy 未設定 × 1 unit 未 cover の approve が `error`(message に `beta`) | **維持**。既存 per-unit カバレッジガード(`.claude/tools/amadeus-orchestrate.ts:4463-4487`)が先に発火し、本ガードへ到達しない(BR-U3-10 の順序) |
| `tests/integration/t127-single-stage-invariant.test.ts` | `:190` / `:200` / `:217` / `:228` / `:239` | `report --single --stage code-generation --result completed` の synthetic-id 経路 | **維持**。`--single` は `.claude/tools/amadeus-orchestrate.ts:4282-4285` で早期 return し、本ガードの設置点(`:4487` の直後)へ到達しない |
| `tests/integration/t135-invoke-swarm.test.ts` | `:143` の fixture `batches: [["a", "b"]]` | `next` 側の invoke-swarm 契約 | **維持**。U3 は `report` 経路のみを触り `next` を変えない(発行側は U2 の所掌) |
| `tests/integration/t251-swarm-and-next-stage.test.ts` | `:208`(d) | 幅2 × autonomy 未設定 × skeleton 未完了 → `run-stage` かつ `gate:false` | **維持**。`next` 経路の pin であり approve を通らない |
| `tests/unit/t186-foreach-per-unit-iteration.test.ts` | `:582` ほか | inline per-unit ステージの反復と §3d カバレッジガード | **維持**。BR-U3-2 行6(code-generation 以外は突合しない) |

**幅≥2 の batch を持つ fixture で approve を通す既存テストは存在しない**ことを実測で確認した。`grep -rn -- '--result' tests/unit tests/integration | grep -i code-generation` のヒットは上表の t211(2件)と t127(5件)のみで、t211 の fixture は全 batch 幅1、t127 は `--single` である。したがって本ガードは既存 pin を1件も赤化しない見込みだが、BR-U3-10 の再列挙を実装時に必ず行う。

### BR-U3-10(実装前に必須の追加棚卸し)

上表は「approve 経路で code-generation を報告するテスト」の実測にすぎない。着手前に次の3軸で全数 grep を行い、赤化するものを plan で宣言してから実装する(`cid:requirements-analysis:enumeration-reverify-at-implementation`。棚卸しを省いた着手は禁止)。

1. **`handleReport` を in-process 駆動するテスト全数** — 実測ヒット: `tests/unit/t186-foreach-per-unit-iteration.test.ts` / `tests/unit/t211-swarm-batch-progress.test.ts` / `tests/integration/t118.test.ts` / `tests/integration/t248-stage-contract-routing.test.ts` / `tests/integration/t265-engine-boundary.integration.test.ts` / `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` / `tests/integration/t258-engine-error-ambient-shard-pollution.test.ts` / `tests/integration/t321-activation-engine-seams.integration.test.ts` / `tests/integration/t322-activation-lifecycle-behaviour.integration.test.ts` / `tests/integration/t-solo-gate-transaction*.test.ts` 系。うち code-generation を approve するものだけが対象だが、対象判定は grep 結果を読んで行う。
2. **`collectSwarmEvidence` が新たに読む shard に依存するテスト** — audit shard を fixture で置くテスト(`readAllAuditShards` 経由)が、code-generation approve と同居していないか。
3. **`readBoltDagBatches` を approve 経路で新たに呼ぶことの波及** — malformed な `unit-of-work-dependency.md` / `runtime-graph.json` を持つ fixture が approve を通ると、既存 throw(`.claude/tools/amadeus-orchestrate.ts:1491`)へ新たに到達しうる(U2 の BR-U2-10 項2 と同型の到達可能性変化。approve 面での実測は本 Unit が負う)。

## 既存 approve ガードとの共存

### BR-U3-11(発火順序)

`handleReport` 内の既存検査と本ガードの順序を固定する。順序は「安いものから」ではなく「診断が具体的なものから」で決める — 先に落ちた検査のメッセージが conductor の見る唯一のメッセージになるためである。

1. approval authority の検証(`.claude/tools/amadeus-orchestrate.ts:4184-4206`)
2. mirror boundary 報告の分岐(`:4208-`)
3. `--single` 早期 return(`:4282-4285`)
4. scope / node / checkbox の存在検査(`:4385-4412`)
5. Kimi 予約キャリア検査(`:4414-4423`)
6. **既存 per-unit カバレッジガード**(`:4463-4487`)— 未 cover unit がある approve を先に落とす
7. **本ガード(FR-2 実績突合)**(`:4487` の直後)
8. finality / mirror completion / `sequence` の構築(`:4489-`)

6 が 7 より先である理由: 未 cover unit がある時点で「実績が揃っていない」のは当然であり、実績不足を先に報告すると conductor を誤った出口(計画訂正)へ誘導する。正しい出口は「残りの unit を `next` で回す」である。6 は `isSwarmDriven` を除外条件に持つため swarm 駆動時は素通りするが、その場合 7 が拾う — 両者は排他ではなく補完関係にある。

7 が 8 より先である理由: `sequence` を組む前に `return` することで state・audit の書き込みが一切起きない(S2 の「遷移未コミット」)。

### BR-U3-12(既存 fail-closed の非弱体化)— NFR-2

`readBoltDagBatches` の malformed throw(`:1489-1491`)、`recoverBoltDag`(`.claude/tools/amadeus-lib.ts:8030`)、`verifyStageArtifacts`(`.claude/tools/amadeus-state.ts:1939` — approve 側の成果物実在検査、`approveUnderLock` `:3259` から `:3272` で呼ばれる)、既存 per-unit カバレッジガードは**すべて無改変**とする。本 Unit は検査の追加のみで、既存の厳格側を緩めない。

## 不変条件

### BR-U3-13(directive 契約の維持)— S2

- 新しい directive `kind` を作らない。approve 拒否は既存 `error` directive(`errorDirective`)で出す。
- ガードは state・audit・runtime-graph に**書かない**。`report` は拒否時に副作用ゼロで、同じ状態で何度呼んでも同じ拒否を返す。
- stdout は directive JSON のみ、advisory は stderr(`cid:code-generation:stdout-directive-stderr-advisory`)。ガードメッセージは directive の `message` フィールドに載せ、stdout へ素の文字列を書かない。

### BR-U3-14(新規 I/O の上限)— NFR-3

approve 1回あたりに増える I/O は次の2つに限る。いずれも approve 経路でのみ発生し、`next` 経路では発生しない。

1. `readAllAuditShards(pd)` — 当該 intent の shard 群を1回読む。
2. `readBoltDagBatches(pd)` — `runtime-graph.json`(+ 必要時 `unit-of-work-dependency.md`)を1回読む。

かつ、これらは BR-U3-2 の非対象(行1・行2・行6・行7・行8)では**読まない**。条件判定の順序を「node の種別 → checkbox 状態 → DAG 読み → audit 読み」とし、対象外のステージで audit を読まない。実時間ベンチは持ち込まない(NFR-3)。

### BR-U3-15(corpus sweep の読み取り専用性)— FR-6 / C7

sweep は live record(`amadeus/spaces/default/intents/<record>/`)を読むのみで、record・audit・state へ書かない。`runtime-graph.json` は gitignored のため入力にせず、宣言 batch は `parseBoltDag`(`.claude/tools/amadeus-lib.ts:7931`)で `unit-of-work-dependency.md` から直接導く。期待 verdict の表は #1892 の調査結果(不履行4・正当6)+ #1893 現物であり、sweep 側で再判定しない(`requirements.md` 前提「#1892 の調査結果は Issue 本文の実測を正とし再調査しない」)。

### BR-U3-16(配布整合)— NFR-4

`amadeus-orchestrate.ts` / `amadeus-lib.ts` は core 正本であり、`bun scripts/package.ts` と `bun run promote:self` による dist 7面+self-install の同期を同一変更に含める。`dist:check` / `promote:self:check` の green を完成条件とする。
