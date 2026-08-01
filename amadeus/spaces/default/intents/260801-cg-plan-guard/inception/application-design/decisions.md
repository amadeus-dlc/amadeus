# Decisions (ADR) — 260801-cg-plan-guard

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md

- `requirements.md` の FR-1〜FR-4 と裁定4件(承認系譜)・NFR-2(既存 fail-closed 非弱体化)を ADR-1〜ADR-4 の Context と制約として引き、「未解決事項(後続ステージへ)」4件のうち design 所掌の3件(FR-2 判定基準 / FR-3(c) 表現 / FR-1 逆方向の委譲範囲)をここで確定した。
- `architecture.md` 現在節の患部 file:line と SWARM emitter の所在を、各 ADR の「引用機構」として起草時に verbatim 直読で確認した(下記 §引用機構の実測確認)。
- `component-inventory.md` 現在節の「新規コンポーネントなし」を Alternatives Rejected の評価軸(モジュール新設案の却下理由)として用いた。

## ADR-1: 計画整合ガードは `tryEmitSwarm` の戻り値を3値化した単一分岐点に置く

**Context** — `tryEmitSwarm`(`amadeus-orchestrate.ts:2919-`)は `boolean` を返し、呼び出し元(`:2782` / `:2808`)は `false` を一律「per-unit フォールバック」に変換する。辞退の `return false;` は実装上7箇所(node 不在 `:2928` / 非 construction `:2929` / 非 swarm 形態 `:2930` / skeleton-gate `:2933` / autonomy 未設定 `:2935` / bolt_dag 不在 `:2937` / 全 unit covered `:2939`。ほかに batch ゲート未消化=別途 ask 発行)あるが、呼び出し元からは区別できない(§12a iteration 1 Minor の是正: 6通り→7箇所、`:2928` の脱落を補完 — 前3者は判定上「非 swarm ステージ」1カテゴリに合流し `ok` 側)。AC-1c は degrade スコープ・skeleton-gate・autonomy-null の3面を発動対象外(誤発動禁止)と要求しており、区別できない現状のままではガードを安全に足せない。

**Decision** — `tryEmitSwarm` の戻り値を判別 union `SwarmEmitOutcome`(`emitted` / `declined{decline, pendingBatch}`)へ変える。2つの呼び出し元は新設の `emitSwarmOrPerUnit`(C1)1本へ統合し、そこで純判定器 `planIntegrityVerdict`(C2)を呼んで `ok` / `redirect` / `violation` に分岐する。判定の対応は次のとおり。

| decline 理由 | 幅≥2 の宣言あり | verdict | 出力 |
| --- | --- | --- | --- |
| `not-swarm-stage`(inline per-unit 設計ステージ等) | 任意 | `ok` | 従来の run-stage |
| `skeleton-gate` | 任意 | `ok` | 従来の run-stage(AC-1c) |
| `no-dag` かつ `scope-skips-units` | — | `ok` | 従来の degrade 経路(AC-1c / AC-3b) |
| `all-covered` | 任意 | `ok` | 全 cover 再入(本来のゲート提示) |
| `autonomy-unset` | あり | `redirect` | `ask`(3部、出口=`set-autonomy`)(AC-1b) |
| 上記以外 | あり | `violation` | `error`(3部)(AC-1a の防御分岐) |

**Consequences** — 判定が1箇所に集約され、辞退理由の追加は必ず C2 の分岐を通る(将来の新理由は既定で `violation` = fail-closed)。t135 の "2b"(ladder ask)は `ask` 種別と `set-autonomy` 語彙を保つため契約を維持するが、**question 本文は3部形式に変わる**ため実装時に文言 assertion の有無を再確認する。可逆性: 中(戻り値型の変更は呼び出し元2箇所に閉じる)。

**Alternatives Rejected**

- **A: 呼び出し元2箇所それぞれにガードを直書き** — 判定が2重定義になり、片方だけ更新される drift を構造的に作る(`canonical 1定義から導出` 原則違反)。却下。
- **B: `emitPerUnitRunStage` 側(`:3206-`)にガードを置く** — この関数は inline per-unit 設計ステージ(functional-design / nfr-requirements 等、t186 が pin)とも共有されており、swarm 非対象ステージまで判定対象に引き込む。`node.mode` の再判定を関数内で足す必要があり、責務が混ざる。却下。
- **C: SKILL.md の散文で conductor に確認させる** — #1892 の真因そのもの(prose の計画が machine directive にならず無音に落ちる)。却下。

## ADR-2: FR-3(c) の判別子は runtime-graph の任意フィールド `bolt_dag_absence` とする

**Context** — `compile`(`amadeus-runtime.ts:786-791`)は `if (boltDag) graph.bolt_dag = boltDag;` と条件付き append しており、bolt_dag が無い graph は「units を持たないスコープ」と「DAG が欠落した状態」を区別できない。FR-3(c) は「runtime-graph に欠落理由の判別情報を残す(方式は design)」と指定している。

**Decision** — bolt_dag を出力しないときに限り `bolt_dag_absence: { reason: "scope-skips-units" | "units-pending", detail: string }` を append する。理由の判定材料は `compile` が既に読んでいる state(`:339` `readStateFile`)の units-generation チェックボックスのみ。消費者は C1(`no-dag` 辞退の分類 = AC-1c の degrade 除外)と degrade 系エラー文言で、**消費者ゼロのフィールドは作らない**(construction.md Forbidden)。

**Consequences** — `tests/unit/t133-bolt-dag-compile.test.ts:305` の完全キー集合 pin(`["workflow_id","scope","started_at","stages"]`)は改訂が要る(下記 §pinned behaviour)。`bolt_dag` 有りのケースはキー順・内容とも不変で、t133 test 3(byte-identical 再 compile)は成立し続ける(判定材料が純データのため)。runtime-graph.json は gitignored のため dist drift・golden 同期への波及はない。可逆性: 高(任意フィールドの追加/削除)。

**Alternatives Rejected**

- **A: `bolt_dag` を常に出力し `{status: "absent", reason}` を内包させる** — `readBoltDagBatches`(orchestrate `:1465-`)/ `recoverBoltDag`(lib `:8030`)/ `orderedUnits`(`:3029-`)/ t247・t211・t186 の fixture がすべて「`bolt_dag` があれば batches がある」形状に依存しており、変更面が本 intent の射程を超える。却下。
- **B: graph を変えず、下流が state のチェックボックスから毎回導出する** — FR-3(c) の明文(runtime-graph に残す)に反する。加えて導出ロジックが orchestrate と runtime に二重定義される。却下。
- **C: 別ファイル(`.amadeus-boltdag-absence`)に書く** — 新しい machine-local 生成物と gitignore・doctor・worktree fork/merge(`amadeus-bolt.ts:302` / `:455` が runtime-graph.json を byte-copy / 削除する)の面倒を増やす。却下。

## ADR-3: FR-2 の実績述語は「幅≥2 の宣言 batch ごとに STARTED∪DEGRADED かつ COMPLETED」

**Context** — `handleReport` の per-unit カバレッジガード(`:4461-4487`)は swarm 駆動を明示除外しており、approve 側に実行形態の検査は一切ない。SWARM 行の唯一の emitter は `amadeus-swarm.ts`(`emitSwarmStarted:339` / `emitSwarmDegraded:359` / `emitSwarmCompleted:405`)で、いずれも `Batch number` フィールドを持つ。未解決事項として「SWARM_DEGRADED の扱い」と「複数 batch 中の部分実績」が design へ送られている。

**Decision** —

1. 対象は**宣言幅≥2 の batch のみ**(幅1 は正当直列、AC-2c)。
2. batch 番号(1-origin)ごとに `SWARM_STARTED` または `SWARM_DEGRADED` が1行以上、**かつ** `SWARM_COMPLETED` が1行以上あることを要求する。`SWARM_DEGRADED` は `prepare` で `SWARM_STARTED` と同じ位置から出る **driver の降格**の記録であり、実行形態(fan-out したか)の降格ではないため started 側へ合流させる(AC-2b)。
3. 部分実績は不足分を列挙して拒否する。approve は全 unit covered 後にのみ到達するため、実績が要る batch は approve 時点で完了しているはずであり、途中状態を許す理由がない。
4. `Batch number` が数値化できない行は**実績として数えない**(fail-closed 側へ倒す)。
5. 突合結果を audit へ書き戻さない(自己参照検証の回避)。

**Consequences** — 手動 fan-out(engine を迂回して並行実装したが `prepare`/`finalize` を通していない)も拒否される。これは意図した挙動で、逃し弁は計画訂正のみ(裁定2)。`readBoltDagBatches` を approve 経路で呼ぶため、canonical が malformed な状態での approve は既存 throw で落ちる — 既存 fail-closed の再利用であり弱体化はしない(NFR-2)。可逆性: 中。

**Alternatives Rejected**

- **A: `SWARM_UNIT_CONVERGED` の件数で判定** — `finalize` 由来で unit 単位のため、1 unit だけ収束した部分実績と完全実績を分けるには結局 batch 単位の集計が要る。より細かい情報を使って同じ結論を出すだけで、判定が壊れやすくなる。却下。
- **B: 成果物のファイル更新時刻の近接で並行性を推定** — #1892 の検出限界の申し送りが明示的に否定した経路。時計・チェックアウト順で容易に偽陽性/偽陰性になる。却下。
- **C: `SWARM_DEGRADED` を実績なし扱い(不合格)にする** — driver の降格(ultra → subagent floor)を計画不履行と混同し、正当な運用を赤にする。AC-2b にも反する。却下。

## ADR-4: 3部メッセージは `guardMessage` 1関数を通す

**Context** — FR-4 は FR-1 / FR-2 / FR-3 の全ガード文言に (1) 観測事実 (2) 重み (3) 公認の出口 の3部を要求し、AC-4a はその機械検査を要求する。現行コードに3部メッセージの組み立て器は存在しない(`guardMessage` 等の grep で 0 hit)。近い既存物は `degradeUnitResolutionError`(`:3064-3090`、状況別に move を出し分ける)と `AUTONOMY_LADDER_QUESTION`(`:1583-1586`、set-autonomy コマンドを名指し)である。

**Decision** — `amadeus-lib.ts` に `guardMessage(parts)` と、出口・重みの canonical 定数(`PLAN_CORRECTION_EXIT` / `PLAN_DRIFT_WEIGHT` / `AUTONOMY_LADDER_EXIT`)を置き、3ガード全てがこれを通す。3部の境界は固定マーカー文字列で表し、AC-4a の検査はマーカー3個の実在で行う(1部でも欠けると Red)。既存2文言の書き換えはスコープ外とし、`AUTONOMY_LADDER_EXIT` は既存ラダーのコマンド語彙をそのまま再利用する(新しいコマンド語彙を発明しない)。

**Consequences** — 文言の追加・変更が1箇所で済み、`cid:code-generation:count-comment-sync-on-catalog-change` 型の drift を作らない。各行は Bun LCOV の継続行 DA:0 を避けるため、`degradeUnitResolutionError` と同じく**1部1定数の単一行**で書く(`cid:code-generation:bun-multiline-arg-da0`)。可逆性: 高。

**Alternatives Rejected**

- **A: 各ガードが自前でテンプレート文字列を書く** — 3コピーになり、AC-4a の検査が「コピーごとに3部あるか」の検査に退化する。canonical 1定義原則に反する。却下。
- **B: 文言を外部 md ファイル化してロードする** — 実行時 I/O が増え(NFR-3 に反する)、配布9コピーの同期対象も増える。却下。

## Unit 規模の見積り(数値)

| 対象 | 追加/変更 行数(production) | 内訳 |
| --- | --- | --- |
| C3 `guardMessage`+定数(lib) | 約 35 | 関数 12 / 定数3本 15 / 型 8 |
| C2 `planIntegrityVerdict`+型(lib) | 約 60 | 判定 40 / 型 20 |
| C4a `swarmEvidenceVerdict`+型(lib) | 約 55 | 判定 35 / 型 20 |
| C1 `tryEmitSwarm` 3値化+`emitSwarmOrPerUnit`(orchestrate) | 約 70 | 戻り値変更 25 / 新 seam 30 / 呼び出し元2箇所 15 |
| C4b `collectSwarmEvidence`+approve ガード(orchestrate) | 約 55 | 読み手 30 / ガード 25 |
| C5 `computeBoltDagOutcome`+compile 配線(runtime) | 約 65 | 判定 45 / 配線 20 |
| C6 `bolt_dag_absence` 型+読み手(runtime/orchestrate) | 約 30 | 型 10 / 読み手 20 |
| FR-5 record 是正(データ) | 約 12 | 3構造の是正+H2 追加 |
| **production 合計** | **約 382** | |
| テスト(新規 tNNN + 既存改訂 + corpus sweep) | 約 650〜780 | 新規4ファイル相当 500-600 / 既存改訂 100-130 / sweep 50 |

配布同期(NFR-4)は生成物であり手書き行数に数えない(`dist` 7面 + self-install の再生成)。

## 再利用インベントリ(新設の前に実測した既存物)

| 必要な能力 | 既存で賄うもの | 実測(grep/直読) |
| --- | --- | --- |
| audit の全シャード読み | `readAllAuditShards`(`amadeus-lib.ts:4335`) | orchestrate は未 import — approve 経路で新規に使う |
| イベント抽出 | `findAllEvents`(`:6361-`、時刻順ソート済み) | 既存 export |
| audit フィールド取得 | `auditBlockField`(`:4213`) | 既存 export |
| bolt_dag の読み+回復 | `readBoltDagBatches`(orchestrate `:1465-`)/ `recoverBoltDag`(lib `:8030`) | **無改変で再利用**(NFR-2) |
| batch 選定 | `firstUncoveredBatch`(orchestrate `:2843-`) | 無改変で再利用 |
| state チェックボックス | `parseCheckboxes`(lib `:5300`) | runtime.ts は既に import 済み(`:38`) |
| directive 生成 | `errorDirective`(`:871`)/ `askDirective` | 既存 |
| ラダー文言 | `AUTONOMY_LADDER_QUESTION`(`:1583-1586`) | 出口部として語彙を再利用 |
| SWARM 実績の読み手 | **不在**(orchestrate/runtime の `SWARM_STARTED`/`SWARM_COMPLETED` grep が 0 hit) | C4b を新設 |
| 3部メッセージ組み立て器 | **不在**(`guardMessage` 等の grep が 0 hit) | C3 を新設 |

## pinned behaviour の改訂宣言(実装前の棚卸し)

`requirements.md` 制約節(CR-5 同型)の要求により、本設計が既存テストの pin を破る箇所を全数宣言する。

| テスト | 行 | 現行 pin | 本設計での改訂 |
| --- | --- | --- | --- |
| `tests/unit/t133-bolt-dag-compile.test.ts` | `:279-286`(test 4) | cyclic → `bolt_dag` 省略 + stderr に "cyclic"、graph は書かれる | fixture(`state-construction.md:67` = `[x] units-generation — EXECUTE`)が units 実行済みのため **loud エラー + graph 未書き込み**へ改訂。degrade 版 fixture の新ケースを追加 |
| 同上 | `:289-296`(test 5) | malformed(dangling)→ 同上 | 同上(AC-3a2 の正面) |
| 同上 | `:299-306`(test 6) | 不在 → キー集合 `["workflow_id","scope","started_at","stages"]` 完全一致 | units 実行済み fixture では loud エラーへ。degrade fixture では `bolt_dag_absence` を含む5キーへ改訂(ADR-2) |
| `tests/integration/t135-invoke-swarm.test.ts` | `:317-320`(2b) | autonomy 未設定 → `ask` かつ question に `set-autonomy` を含む | 種別・語彙とも維持。**本文が3部形式に変わる**ため実装時に本文 assertion の有無を再確認(現行 assertion は `toContain` のため通過見込み) |
| 同上 | `:324-327`(2c) | 不正な autonomy 値 → `invoke-swarm` でない | 維持(redirect の `ask` は `invoke-swarm` でない) |
| 同上 | `:329-348`(7 / 7b) | skeleton-gate は autonomy 有無に関わらず `run-stage` | 維持(AC-1c で `ok` 判定) |
| `tests/unit/t186-foreach-per-unit-iteration.test.ts` | `:431-439`(7)ほか | inline per-unit ステージは bolt_dag 有りでも従来どおり | 維持(`not-swarm-stage` → `ok`) |
| `tests/integration/t367-degrade-unitname-resolution.test.ts` | 全体 | dag 無しの degrade 解決 | 維持(`pendingBatch === null` → `ok`) |
| `tests/integration/t247-runtime-recovery.test.ts` | `:175` / `:338` | `bolt_dag` のみを持つ graph からの回復 | 維持(`bolt_dag_absence` は bolt_dag 不在時のみ append) |

`tests/unit/t211-swarm-batch-progress.test.ts` / `tests/integration/t248` / `t251` / `t212` は bolt_dag を使うが、いずれも swarm 成立系または非 per-unit 系で本設計の分岐に触れないことを確認した(改訂不要)。テスト採番(新規 tNNN)は units-generation 段で実測予約する。

## 上流へ差し戻す点(設計で回避せず報告する)

**AC-1a と AC-1b の発動条件が重なる可能性** — `tryEmitSwarm` の辞退理由を全数列挙(`:2929-2939`)したところ、「宣言幅≥2 の batch がありながら per-unit 直列へ落ちる」ことが**現行コードで実際に起きうる辞退理由は autonomy 未設定のみ**である。他の5理由はいずれも幅≥2 と両立しない(非 swarm ステージ=そもそも swarm 対象外、skeleton-gate=AC-1c で除外、bolt_dag 不在=幅の宣言自体が読めない、全 unit covered=正当な再入、batch ゲート未消化=`ask` を発行済み)。AC-1b はその唯一のケースを `ask` の redirect と定めているため、AC-1a が求める `error` directive は**現行の到達可能経路を持たない**。

本設計はこの矛盾を「AC-1a を満たすために新しい違反トリガを発明する」方向では解消しない(要件を設計側で書き換えることになるため)。代わりに、(1) 列挙外の辞退理由が将来増えたときに既定で `violation` へ落ちる全域的な分岐を C2 に残し、(2) 実測された計画不履行4件の検出は FR-2(approve 時の実績突合)が担う、という配置とした。これは `requirements.md` FR-1 の但し書き「逆方向の主発動点は FR-2 の実績突合である旨を設計に明記」と整合するが、**順方向についても同じことが言える**という点は要件の記述を超える。AC-1a の Red 実証をどう構成するか(列挙外理由の人工注入で足りるか、要件側を改めるか)は、requirements の所有者の判断を要する。

## 引用機構の実測確認(mechanism-cite-verify-at-draft)

本書が引く機構は起草時に observed 断面で直読した。verbatim 断片は次のとおり。

- `amadeus-orchestrate.ts:2937` — `const batches = readBoltDagBatches(projectDir);` の直後 `if (!batches || batches.length === 0) return false;`
- `amadeus-orchestrate.ts:2935` — `if (autonomy === null) return false;`
- `amadeus-runtime.ts:786-791` — `const boltDag = computeBoltDag(projectDir);` / `if (boltDag) { graph.bolt_dag = boltDag; }`
- `amadeus-runtime.ts:302` — `if (!existsSync(path)) return undefined;`
- `amadeus-runtime-compile.ts:211-217` — `stdio: ["ignore","pipe","pipe"]` / `if (result.status !== 0) { recordHookDrop(... result.stderr ...) }`(exit 0 では stderr を読まない)
- `amadeus-swarm.ts:339` / `:359` / `:405` — `emitSwarmStarted` / `emitSwarmDegraded` / `emitSwarmCompleted` の宣言行。いずれも本体で `"Batch number": batch` を渡す(`:348` / `:363` / `:414`)
- `amadeus-lib.ts:7805-7817` `parseInlineDepsList` — `[]   # コメント` は `t === "[]"` にも `[...]` 形にも一致せず bare scalar として1件の依存名になる(= dangling → malformed)。FR-5 のインラインコメント除去が要る機序
- `amadeus-lib.ts:7844` — `line.match(/^\s*-\s+name\s*:\s*(.+?)\s*$/)`(`- id:` は非一致 → `unrecognised line in units block` を throw)
- `tests/fixtures/state-construction.md:67` — `- [x] units-generation — EXECUTE`(t133 の fixture が units 実行済みである根拠)
