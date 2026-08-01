# Business Rules — U1 dag-integrity

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

- `unit-of-work.md` の U1 検収リスト(AC-3a / AC-3a2 / AC-3b / AC-3c / AC-5a / AC-5b)を BR の受け入れ側の全数チェックリストとして用い、各 BR に対応 AC を付した。
- `unit-of-work-story-map.md` の U1 価値到達点「U1 単独 = 無音 null 化の封鎖(#1893 クラスの恒久防止)」を、BR-U1-1(fail-closed)と BR-U1-9(是正の閉包)の 2 本を必須とする根拠とした。
- `requirements.md` の NFR-1(誤発動ゼロは Critical)・NFR-2(既存 fail-closed の非弱体化)・NFR-3(新規 I/O ゼロ)・NFR-4(dist 9 コピー同期)を BR-U1-4 / BR-U1-6 / BR-U1-7 / BR-U1-11 へ写した。
- `components.md` の C6 制約「消費者を持たないフィールドは置かない」(construction.md Forbidden の適用)を BR-U1-5 の成立条件とした。
- `component-methods.md` の C5 判定表(6 行)と C6 `readBoltDagAbsence` の戻り契約を、BR-U1-2 / BR-U1-3 / BR-U1-5 の判定語彙の canonical とした。
- `services.md` の S3 終了契約(`invalid` は非ゼロ終了、degrade と未着手は exit 0)を BR-U1-1 / BR-U1-4 の分岐条件そのものとして引いた。

## ガード発動の規則

### BR-U1-1(fail-closed の発動条件)— AC-3a / AC-3a2

units-generation のチェックボックスが `completed` のとき、`unit-of-work-dependency.md` が不在、または在っても `parseBoltDag` が `ok:false` を返す場合、`compile` は **throw して非ゼロ終了**する。graph は書かない。理由と `detail` は stderr へ書き、hook の `recordHookDrop`(`.claude/hooks/amadeus-runtime-compile.ts:210`–`:216`)が拾える形にする。

### BR-U1-2(様式適合はスコープに依らない)

ファイルが**実在するのに** parse できない場合は、units-generation の状態にかかわらず `invalid` とする(`component-methods.md` C5 判定表の最終行「書いた以上は様式適合を要求する」)。寛容側へ倒さない。

### BR-U1-3(理由語彙は既存を再輸出する)

`invalid` の `reason` は `BoltDagParse`(`.claude/tools/amadeus-lib.ts:7767`)が既に定める `"absent" | "malformed" | "cyclic"` をそのまま使う。ファイル不在に由来する `invalid` も `"absent"` を使う(ブロック不在と同じ語彙で、`detail` が両者を区別する)。新しい理由語彙を発明しない。

`absence` の `reason` は `"scope-skips-units" | "units-pending"` の 2 値のみ(`component-methods.md` C5 の `BoltDagAbsence`)。`parseCheckboxes` が返す 6 状態(`.claude/tools/amadeus-lib.ts:5300`–`:5330`)のうち `skipped` が前者、残り 5 状態(`completed` はファイル在時のみここに来ない)は後者へ合流させる。

### BR-U1-4(誤発動禁止)— AC-3b / NFR-1

`skipped`(degrade スコープ)および未着手のとき、ファイル不在は**従来どおり exit 0** で、`bolt_dag_absence` を graph へ載せるだけとする。degrade スコープで非ゼロ終了させることは Critical 欠陥とする。

state ファイル自体が読めない・`null` の場合も `units-pending` 側(exit 0)へ倒す。判定材料が無い状態でガードを発動させない。

## データ契約の規則

### BR-U1-5(判別子は消費者を持つ)— AC-3c

`bolt_dag_absence` は消費者 2 箇所を持つ場合にのみ置く: (i) U2 の `readBoltDagAbsence` 経由の発動除外判定、(ii) degrade 系エラー文言。どのコードも読まないフィールドを置くことは construction.md Forbidden(「文書のふりをしたフィールド」)違反である。U1 の完成条件には (i) の読み手(`readBoltDagAbsence`)の実装と、その戻り値を assert するテストを含める。

### BR-U1-6(既存 fail-closed の非弱体化)— NFR-2

`recoverBoltDag`(`.claude/tools/amadeus-lib.ts:8030`)と、その呼び出し元 `readBoltDagBatches` の throw(`.claude/tools/amadeus-orchestrate.ts:1488` `const recovery = recoverBoltDag(cached, source);` / `:1489` `if (recovery.kind === "none") return null;` / `:1490`–`:1491` の malformed throw)は**無改変**とする。本 Unit は追加のみで、既存の厳格側を緩めない。

`parseUnitsBlock`(`.claude/tools/amadeus-lib.ts:7823`)も無改変(裁定 B — parser を寛容化しない)。

### BR-U1-7(新規 I/O ゼロ)— NFR-3

スコープ判定は `compile` が既に読んでいる `stateContent`(`.claude/tools/amadeus-runtime.ts:339`)のみを材料とする。`computeBoltDagOutcome` は `stateContent` を引数で受け、内部でファイルを読み直さない。

### BR-U1-8(キー順の保存)

`dag` のときの graph は現行と**バイト同一**でなければならない(`:788`–`:791` の挙動を変えない)。`bolt_dag_absence` は `bolt_dag` を出力しない場合にのみ、`stages` の後へ append する。

## 既存 pin への影響(実測)

### BR-U1-9(#1893 是正の受け入れ条件)— AC-5a / AC-5b

対象ファイルの現状と是正後の期待値を in-process 実測で確定した(HEAD `1bae73cfcbebffe76b9a74db14e7a22541df28a4`)。

| 対象 | 実測結果 |
| --- | --- |
| 現物の `parseBoltDag` | `{"ok":false,"reason":"malformed","detail":"unrecognised line in units block: - id: U1"}` |
| `- name:` 形の最小再現 | `{"ok":true, "batches":[["U1","U2"],["U3"]]}` — 散文 `W1 = U1 ∥ U2 → W2 = U3`(対象ファイル `:9`)と一致 |
| 行末インラインコメントのみ注入 | `{"ok":false,"reason":"malformed","detail":"unit \"U1\" depends on unknown unit \"[]   # comment\""}` |
| `edges:` 節のみ注入 | `{"ok":false,"reason":"malformed","detail":"unrecognised line in units block: edges:"}` |
| 現物の `required-sections` センサー | `{"pass":false,"h2_count":1,"headings":["## 機械可読 DAG(required-sections センサー要求様式)"],"findings_count":2,"edge_block":"malformed"}` |

したがって 3 構造すべてが独立に parse を落とす — どれか 1 つの是正では不足である。是正後の受け入れは `parseBoltDag` が `ok` かつ `batches` が `[["U1","U2"],["U3"]]`、センサーが `pass:true` / `h2_count >= 2` / `edge_block:"ok"`、sweep が 38/38。

### BR-U1-10(pinned-behavior の明示改訂宣言)

`requirements.md` の制約節は pin 棚卸しの対象として「t135 系の stdout parse、t186 の {unit-name}、graph golden t110/t124 等」を挙げるが、**実測では `t110` / `t124` は本 Unit と無関係**である(`tests/unit/t110-mcp-server-grants.test.ts` は MCP grant、`tests/unit/t124-scope-transpose.test.ts` は scope-grid 転置)。本 Unit の挙動を直接 pin しているのは `tests/unit/t133-bolt-dag-compile.test.ts` であり、次の 3 テストが**現行挙動の維持を assert している**。

- test 4「cyclic edge block: bolt_dag omitted + stderr names 'cyclic'」— graph を読み `"bolt_dag" in g` が false であることを assert。新設計では throw で graph が書かれないため成立しない。
- test 5「malformed edge block (dangling dep): bolt_dag omitted + stderr names 'malformed'」— 同上。
- test 6「absent artifact: envelope keeps the pre-milestone-15 4-key shape」— `:305` `expect(Object.keys(g)).toEqual(["workflow_id", "scope", "started_at", "stages"]);`。

3 テストとも `makeProject()`(`:125`)が `STATE_FIXTURE = tests/fixtures/state-construction.md` をコピーしており、そのファイルの `:67` は `- [x] units-generation — EXECUTE` である。すなわち **3 件すべてが `completed` 分岐に入る**ため、BR-U1-1 の適用で 3 件とも赤くなる。

改訂方針(実装前の宣言事項):

- test 4 / 5 は「`completed` スコープでは非ゼロ終了 + stderr が理由を名指す」へ改訂する(観測対象を graph から exit code へ移す)。
- test 6 は 2 本へ分割する。`completed` × 不在 → 非ゼロ終了(AC-3a)。`skipped` × 不在 → exit 0 かつ 5 キー(`bolt_dag_absence` を含む)エンベロープ(AC-3b / AC-3c)。4 キーのバイト同一性は「units-generation を実行していないスコープ」の契約としては**維持できない** — 判別子を載せる以上キーは増えるためであり、これは意図的な契約改訂である。
- `dag` を出力する成功系(test 1 / 2 / 3)は無改変で通ること(バイト同一 re-compile を含む)を実装後に確認する。

### BR-U1-11(pin 棚卸しの全数化)

`t133` は実測で確定した 1 件にすぎない。`compile` を spawn するテストは他にも多数存在する(`"compile"` を含むテストファイルは 20 件超)。実装前に「`- [x] units-generation` を持つ state fixture を使い、かつ `unit-of-work-dependency.md` を書かないテスト」を全数 grep で棚卸しし、赤化するものを一覧化してから着手する(`cid:requirements-analysis:enumeration-reverify-at-implementation`)。棚卸しを省いた着手は禁止する。

### BR-U1-12(配布整合)— NFR-4

`amadeus-runtime.ts` / `amadeus-lib.ts` は core 正本であり、変更は `bun scripts/package.ts` と `bun run promote:self` による dist 7 面 + self-install の同期を同一変更に含める。`dist:check` / `promote:self:check` の green を完成条件とする。
