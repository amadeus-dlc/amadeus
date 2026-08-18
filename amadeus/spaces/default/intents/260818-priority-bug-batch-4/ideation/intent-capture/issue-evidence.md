# Issue Evidence — 260818-priority-bug-batch-4

## メタデータ

- fetched-at: 2026-08-18T07:07:50Z / repo: amadeus-dlc/amadeus / tool: issue-evidence fetch

## Issue #2837: bug(harness/codex): invoke-swarm directive が実行に必要な batch 番号と convergence check コンテキストを欠く

- state: OPEN / labels: 未取得(本 verb の read 面は本文・状態・コメントのみ) / url: https://github.com/amadeus-dlc/amadeus/issues/2837 / target-sha: 127be70c5d7a584016f88a5d44e8715904020721
- review-run-id: xrev-2837-20260818 / 独立レビュアー: 2名(marker 計数)

### 本文(verbatim)

## 概要

Codex の `amadeus` スキルは、`invoke-swarm` を受け取った conductor に対して、直ちに次を実行するよう要求しています。

- `prepare --batch <n> ...`
- `check <unit> --check-cmd "<project convergence check>"`
- `finalize --batch <n> ... --check-cmd "<project convergence check>"`

しかし、実際のディレクティブは次の最小形だけを返します。

```json
{"kind":"invoke-swarm","units":["numeric-provenance-mapping-contract"],"cap":1}
```

`batch` と `check-cmd`（必要なら protected `test-file`）がなく、Codex が engine-owned routing を再導出せずにプロトコルを実行できません。

## 再現条件

1. Construction autonomy が swarm fan-out を許可する Intent を進める。
2. `code-generation` で `bun .codex/tools/amadeus-orchestrate.ts next` を実行する。
3. 上記の最小 `invoke-swarm` が返る。
4. `.agents/skills/amadeus/SKILL.md` の fixed Unit pool 手順を実行しようとする。

今回の Intent では、同じ Unit の旧 batch 1 が一度失敗・終端した後、上流設計を修正して `code-generation` に再進入しています。このため、単に `batch=1` を推測すると、旧 terminal pool との相関も曖昧になります。

## Codex にとって不足している情報

- 現在の plan generation に対応する 1-origin の batch 番号
- 再進入時に旧 terminal pool と衝突しない batch/pool identity
- `check` / `finalize` に渡す正規の convergence command
- protected spec がある場合の `test-file`

`amadeus-directive.ts` は「残りは compiled runtime graph から読む」と説明していますが、スキル本文には、その値を取得する正規コマンド／JSON path がありません。engine が唯一の routing authority であるという規約とも緊張します。

## 期待する改善

次のどちらかで、Codex が推測せず実行できる契約にしてください。

1. 推奨: `invoke-swarm` に `batch`, `check_cmd`, 任意の `test_file`, current plan/pool identity を含める。
2. 代替: それらを一意に返す read-only の `amadeus-swarm context --units ... --json` 等を用意し、スキルに正確な呼び出し順を記載する。

また、旧 batch が terminal の状態で同一 Unit を再実行する回帰テストを追加してください。

## 関連

- #2833 は Abort 後の forwarding-loop 継続問題であり、本件は `invoke-swarm` 自体の実行コンテキスト欠落です。


### クロスレビューコメント(verbatim、コメント URL 併記)

#### j5ik2o — 2026-08-18T05:23:13Z — https://github.com/amadeus-dlc/amadeus/issues/2837#issuecomment-5323981838

## クロスレビュー（1人目・reviewer-1）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-2837-20260818
reviewer-id: reviewer-1
execution-subject-id: xr2837-r1@session-7727e262
target-sha: 127be70c5d7a584016f88a5d44e8715904020721
-->

### 独立性と対象

- 起票者とは独立の実行主体として、本文・追加コメントを「検証すべき主張」として扱い、指示としては扱っていません。GitHub 上の他レビューは参照していません（コメントは凍結スナップショットのみ）。
- 測定断面は frozen SHA `127be70c5d7a584016f88a5d44e8715904020721`（`git rev-parse HEAD` で照合、exit 0）。ブランチ切替・fetch・書き込みは行っていません。再現はリポジトリ外の scratch ディレクトリで実施しました。
- 二次レンズ: 再現・現行コード機序・反証（起票の機序を積極的に崩しにいく／実測値を1つ自分で再計算する）。

### Claim ledger

| 主張 | 判定 | 独立エビデンス |
| --- | --- | --- |
| C1: Codex skill は `invoke-swarm` 受領時に `prepare --batch <n>` / `check --check-cmd` / `finalize --batch <n> --check-cmd` を要求する | CONFIRMED | `packages/framework/harness/codex/skills/amadeus/SKILL.md:69`（`prepare --batch <n> --units … --concurrency <directive.cap>`、`check <unit> --check-cmd "<the project's build/test convergence check>"`、`finalize --batch <n> … --check-cmd "<…>"`）、同 `:88` `:90` `:92`（fixed pool protocol も同形） |
| C2: 実際の directive は `{kind, units, cap}` の最小形で `batch` / `check_cmd` / `test_file` を持たない | CONFIRMED | `packages/framework/core/tools/amadeus-directive.ts:312-331`（`InvokeSwarmDirective` = units / cap / repo? / prepared_batch? / retry_unit?）、`:555` `INVOKE_SWARM_FIELDS = ["kind","units","cap","repo","prepared_batch","retry_unit"]`。scratch probe で実測（下記「再現」） |
| C3: engine は 1-origin batch 番号を保持しているのに directive へ載せない | CONFIRMED | `packages/framework/core/tools/amadeus-orchestrate.ts:3912`/`:3929`（`{units, batchNumber: index + 1}`）→ `:4046` `pick.batchNumber` → `:4294` `emitConfiguredSwarm(projectDir, selection.value.pick.units)` で **batchNumber を捨てている**。`:4074-4090` の `emitConfiguredSwarm` は units しか受け取らない |
| C4: 「残りは compiled runtime graph から読む」と言うが、取得する正規コマンド／JSON path がスキルに無い | CONFIRMED | `amadeus-directive.ts:306-311` 逐語 "the conductor reads the rest of the batch context off the compiled runtime graph"。一方 `grep -c "runtime-graph\|bolt_dag\|runtime graph" packages/framework/harness/codex/skills/amadeus/SKILL.md` → `0`（exit 1 = 正常な不一致）。`amadeus-swarm.ts` に読み取り verb 無し（`:1419` の Valid 一覧に context/status 無し）。`amadeus-runtime.ts:1511-1522` の `read` は「1 stage row」のみで `bolt_dag` を返さない |
| C5: `check_cmd` / `test_file` も directive に載せるべき | REFINED（部分的に反証） | `packages/framework/core/tools/amadeus-swarm.ts:231-235` 逐語 "checkCmd is the user's own project check command (a trusted input)"。設計上 checkCmd は conductor/ユーザーの知識（D-I）であり engine-owned routing ではない。→ この半分は「契約の追加」であって「契約違反の是正」ではない |
| C6: 再進入時に `batch=1` を推測すると旧 terminal pool と相関が曖昧 | CONFIRMED（機序を追加特定） | `amadeus-swarm.ts:554-556` は `--batch` を **正の整数かどうかしか検証しない**（DAG 照合なし）。その値がそのまま durable な pool identity になる: `:638-639` `idempotencyKey: unit-pool:${flags.batch}:initial-enqueue` / `batchId: flags.batch`、`:616` `bolt start --batch`。つまり推測値は fail-closed に弾かれず黙って採用される |
| C7: fork の stale `Bolt Refs` 復旧手順（discard → merge）はその順序では実行不能 | CONFIRMED（再現済み） | `packages/framework/core/tools/amadeus-state.ts:6124` が `amadeus-worktree discard` と `amadeus-state.ts merge` を指示。しかし `handleMerge` は `:6281-6283` で worktree ディレクトリ存在チェックを行い、`:6317-6318` の「already merged」冪等判定より **前** に落ちる。scratch 実行で exit 1 を実測 |
| C8: 同メッセージの「(which will exit "already merged" cleanly)」 | 新規指摘（REFINED） | `:6318` の already merged 分岐も `errorWithSlug` → `error()`（`:6593-6604` `emitError`）で **非ゼロ終了**。到達しても "cleanly" ではない |
| C9: Stop hook は pending `invoke-swarm` に `report --stage <stage> --result <outcome>` を要求する | CONFIRMED | `packages/framework/core/hooks/amadeus-stop.ts:895-916` `continuationReason`（`:1117` のコメントが invoke-swarm を pending 対象に列挙）。batch 途中と stage 完了を区別する文言は無い |
| C10: batch finalize 直後の stage report は artifact 不在で拒否された | CONFIRMED（引用文言のみ訂正） | 現行文言は `packages/framework/core/tools/amadeus-state.ts:2800-2805`「Refusing to complete "<slug>": one or more missing required artifacts under the intent's record directory…」。起票時の逐語「none of its declared artifacts exist」は **現断面に存在しない**（コード側 `git grep -F` は exit 1、過去の audit 行にのみ残存）。文言変更は 2026-08-12 `bf38a1849d`（#2932）。**機序は不変** |
| C11: `finalize` は exit 0 / `status: converged` / `merge_failures: []` を返すが Git source は統合されない | CONFIRMED | `amadeus-swarm.ts:66-68` 逐語 "amadeus-bolt complete --merge -> the **AIDLC-data** merge back to the base"、`:1045-1049` は `release-merge` と `complete --merge` のみ実行。`amadeus-bolt.ts:608-648` の `handleComplete` は state merge / audit merge / runtime-graph fragment merge だけ。`grep -n "amadeus-worktree" amadeus-swarm.ts` は `create` のみ（`:591`）で `merge` 呼び出し **ゼロ** |
| C12: Codex skill に必須の Git 統合手順が明記されていない | CONFIRMED（根も特定） | `amadeus-bolt.ts:439` 逐語 "Runs BEFORE SKILL.md **Step 6.5's git-merge dispatch**"、`packages/framework/core/knowledge/amadeus-pipeline-deploy-agent/branching-strategies.md:278` 逐語 "…does not call `amadeus-worktree merge` directly — **the dispatch lives in SKILL.md prose**"。しかし `grep -rl "amadeus-worktree" packages/framework/harness/` → **0 ファイル**、`grep -rn "Step 6.5" packages/framework/harness/` → 0。参照先の prose が消失している |
| C13: `prepare` の既定 base はブランチ名（解決済み SHA ではない） | CONFIRMED | `amadeus-swarm.ts:581` `const base = flags.base ?? currentBranch(repoCwd);`、`:1331-1339` `currentBranch` = `git rev-parse --abbrev-ref HEAD` |
| C14: そのため remote 乖離時に worktree create が失敗する | CONFIRMED（引用は truncated） | `packages/framework/core/tools/amadeus-worktree.ts:163` の現行メッセージは起票引用の続きに **"or rerun with `--allow-stale` to intentionally use the local SHA"** を含む。`--allow-stale` は 2026-07-10 `da1611a9ac`（#768）で **起票より前** に着地済み。ただし `grep -n "allow-stale" packages/framework/core/tools/amadeus-swarm.ts` → 0 hit で `prepare` は転送しないため、prepare 経由の回避策は起票者の `--base <local SHA>` が実質唯一 |
| C15: currentness（着地済みの修正があるか） | 部分的に前進 | `git log --all --grep=2837` → 0 件、`git grep 2837 -- packages/ tests/ docs/ .github/` → 該当なし（hit はハッシュ文字列の偶然一致2件のみ）。ただし `prepared_batch` / `retry_unit` が 2026-08-11 `051bbeb99a`（#2864）で追加され、**prepared retry の arm に限り** batch identity が directive に載るようになった（`SKILL.md:76`）。新規 batch の arm は未変更 |
| C16: `harness/codex` というスコープ限定 | REFINED（狭すぎる） | `grep -c -- "--batch <n>"` / `grep -c -- "check-cmd"` を各 conductor 面へ適用（測定 ref = frozen SHA）: claude 6/3、codex 6/3、kimi 6/2、kiro 6/3、kiro-ide 6/3、cursor(commands/amadeus.md) 5/2、opencode(同) 5/2、pi 0/0。**8面中7面が同じ要求を持つ** |
| C17: 回帰テスト「failed terminal batch → upstream replan → same Unit redispatch」の不在 | CONFIRMED | swarm 系テスト（`tests/integration/t135-invoke-swarm.test.ts`、`t379-swarm-canonical-emit.test.ts`、`t211-swarm-batch-progress.test.ts`、`tests/e2e/t134-swarm-referee.test.ts`）に該当ケース無し。`t135` は `--batch 1` をハードコード（`:244` 他）しており、batch 番号の導出そのものをテストしていない。`prepared_batch` の検証は `tests/unit/t113.test.ts:303-322` の pair 整合のみ |

### 再現・コード実読

**1. directive shape の実測（自前の再計算を含む）**

scratch に probe を置き、`packages/framework/core/tools/amadeus-directive.ts` の `validateDirective` を直接 import して実行しました。

```
minimal: {"valid":true,"data":{"kind":"invoke-swarm","units":["numeric-provenance-mapping-contract"],"cap":1}}
enriched: {"valid":false,"errors":["invoke-swarm: unknown key: batch","invoke-swarm: unknown key: check_cmd","invoke-swarm: unknown key: test_file"]}
```

（exit 0）。本文が引用した最小形は現断面でも valid で、`batch` / `check_cmd` / `test_file` は unknown key として **閉じた形で拒否** されます。要望1は型の変更を伴います。

起票の測定値 `cap: 1` も自分で再計算しました。`amadeus-orchestrate.ts:4083-4086` により `cap = min(units.length, swarm.unit.concurrency.limit)`、本ワークスペースの `amadeus/config.json` は `swarm.unit.concurrency.limit = 4` なので `min(1, 4) = 1`。引用値と一致します。

**2. discard → merge の順序（C7）**

scratch に空のプロジェクトディレクトリを作り、`--project-dir` をそこへ向けて `packages/framework/core/tools/amadeus-state.ts merge --slug probe-slug` を実行:

```
EXIT=1
{"error":"[slug=probe-slug] worktree directory does not exist: <scratch>/fakeproj/.amadeus/worktrees/bolt-probe-slug."}
```

worktree 不在チェック（`amadeus-state.ts:6281-6283`）が「already merged」判定（`:6317-6318`）より前段にあることを実測で確認しました。したがって `:6124` の案内どおり discard を先に実行すると merge は必ず落ちます。起票者の復旧手順（worktree 再 create → merge → discard → prepare）が必要になる、という報告と整合します。

**3. 反証の試み（機序を崩しにいった結果）**

- 「batch 番号は runtime graph から取れるのでは？」→ 取れる場所は `runtime-graph.json` の `bolt_dag`（`amadeus-orchestrate.ts:2121-2131`）ですが、これは per-clone の gitignore 対象であり、`amadeus-swarm` にも `amadeus-runtime` にもこれを返す verb はありません（`amadeus-runtime read` は stage 1行のみ）。生 JSON を conductor が自力で parse する以外に経路が無く、それは skill 冒頭（`SKILL.md:20`）の「engine owns all between-stage routing / You never re-derive any of that」と正面から衝突します。→ 反証できず、主張は成立。
- 「`check_cmd` も engine が持つべきでは？」→ ここは **反証が成立しました**。`amadeus-swarm.ts:231-235` はチェックコマンドを利用者側の入力として明示しており、engine が知る値ではありません。C5 の判定を REFINED としています。
- 「`ask` gate は batch 番号を出さないのでは？」→ 出します。`amadeus-orchestrate.ts:3889-3892` の `batchGateQuestion` は "Swarm batch N (…)" と 1-origin 番号を散文で明示し、`approve-batch --batch N` まで案内します。**同じ番号を gate では開示し dispatch では開示しない** という engine 内部の非対称が確認できました（`:3896-3897` のコメントは pick が "its 1-origin number in the topology (the same base the approval ledger and the gate question use)" を運ぶと明言しています）。これは起票の機序を弱めるどころか補強します。

### 機序・影響・ラベル

**機序（確定した事実）**: engine は batch 選択時に 1-origin の batch 番号を確定して保持している（`orchestrate.ts:3929`, `:4046`）。その番号は batch-end gate（`:3889-3892`）と承認台帳 `Swarm Gated Batch Approvals`（`amadeus-bolt.ts:1214-1216`、1-origin のカンマ区切り）で使われる。しかし dispatch 時の `emitConfiguredSwarm`（`:4074-4090`）は units しか受け取らず、`:4294` の呼び出しで番号が捨てられる。受け手の skill は `--batch <n>` を必須入力として要求する。両者の隙間を conductor の推測が埋めている。

**影響（事実と仮説を分けて）**:
- 事実: `prepare` は batch 番号を正の整数としてしか検証せず（`:554-556`）、その値が pool の durable identity になる（`:638-639`）。DAG との突き合わせは無い。
- 事実: `gated` autonomy では承認台帳が engine 側 1-origin 番号で記録される（`amadeus-bolt.ts:1214-1216`）。
- 仮説（未実測）: 上記2点から、推測値と engine の番号がずれた場合、pool identity と承認台帳が黙って乖離しうる。実際にゲート誤判定まで至るかは本レビューでは実行していません。
- 事実: `finalize` は Git source を統合しないまま exit 0 / `converged` / `merge_failures: []` を返す（C11）。この「merged と称して未統合」は偽 green の一形態です。

**ラベル評価**（`.github/ISSUE_TEMPLATE/bug.yml` の定義に照合）:
- **種別 `bug`**: 妥当。完了条件で判定すると、engine と同梱 skill という既存の合意済み契約どうしが噛み合っていない状態の是正であり、新規契約の追加ではありません。ただし C5（`check_cmd` を directive に載せる）だけは切り出すと `enhancement` 相当です。
- **`S3-MAJOR`（回避策のある誤動作、または限定条件での発現）**: 本文の主張に対しては妥当（swarm 対象の Construction autonomy 下でのみ発現、`--base <SHA>` 等の回避策あり）。ただし C11 は「回避策のない偽 green」に踏み込む可能性があり、`S2-CRITICAL`（bug.yml:161-162）の候補です。回避策（手動 cherry-pick）は文書化されていないため、C11 を独立 Issue に分離したうえで重大度を再評価することを推奨します。
- **`P2`（通常）**: 現状維持で妥当と判断します。P1 に上げる根拠（silent divergence の可能性）はありますが、実測での被害確定に至っていません。

### 訂正・未解決事項

1. **引用文言の訂正（C10）**: コメント中の `... none of its declared artifacts exist ...` は現断面のコードに存在しません。同じガードの現行文言は「one or more missing required artifacts under the intent's record directory」（`amadeus-state.ts:2800-2805`）で、2026-08-12 の `bf38a1849d`（#2932）で変更されています。機序は変わっていないため主張は維持されますが、引用は旧 ref のものです。
2. **引用の truncation（C14）**: `amadeus-worktree.ts:163` の実メッセージには `--allow-stale` の案内が含まれます（#768 で起票前から存在）。ただし `prepare` はこのフラグを転送しないため、`prepare` 経由での回避策としては起票者の `--base <local SHA>` が実質唯一である点は変わりません。「Codex はこの制約を事前に知りようがない」という主張も維持されます。
3. **スコープの訂正（C16）**: タイトルの `harness/codex` は狭すぎます。同じ要求は claude / kimi / kiro / kiro-ide / cursor / opencode にも存在し（pi のみ非該当）、欠落しているのは engine の directive shape 側です。修正先は harness 表層ではなく `packages/framework/core/tools/amadeus-directive.ts` + `amadeus-orchestrate.ts` と、全 harness の conductor 面の同期です。
4. **currentness の部分前進（C15）**: `prepared_batch` / `retry_unit`（#2864, 2026-08-11）により **prepared retry の arm** では batch identity が directive に載るようになりました。本 Issue の前提が完全に古くなったわけではありません（新規 batch の arm は未変更）が、要望1を書く際はこの既存フィールドとの整合を取る必要があります。
5. **未解決（本レビューでは判定しない）**: 推測 batch 番号が実際に `gated` の承認台帳を誤らせるところまで到達するか。実 workflow を進める必要があり、read-only の範囲を超えるため未実測です。
6. **未解決**: `test_file`（protected spec）の供給責任者。`check_cmd` と同クラス（conductor 知識）と読めますが、engine 側の明示的な declaration を見つけられませんでした。

### 同根・対称面

- **同根 A: 消えた SKILL.md の手順を、ツール側のコメント／knowledge が今も参照している。** `amadeus-bolt.ts:439` は "SKILL.md Step 6.5's git-merge dispatch" を、`amadeus-state.ts:6119` は "SKILL.md Step 0.6 recovery seam" を前提にしていますが、`grep -rn "Step 6.5" packages/framework/harness/` も `grep -rl "amadeus-worktree" packages/framework/harness/` も 0 件です。C11/C12（Git 未統合）と C7（復旧手順不能）は **同じ根**（conductor 面から手順が失われ、ツール側の前提だけが残った）から出ています。この2件はまとめて扱えます。
- **対称面 B: engine が持つ値を一方の directive では開示し他方では開示しない。** batch 番号は `ask`（batch-end gate, `:3889-3892`）では開示され、`invoke-swarm`（dispatch）では開示されません。同型の非対称が他の directive kind にもないか、別途の棚卸しを推奨します。
- **対称面 C: 全 harness の conductor 面。** C16 の census のとおり 8 面中 7 面が同一要求を持つため、修正時は `packages/framework/harness/*/skills/amadeus/SKILL.md` と `packages/framework/harness/{cursor,opencode}/commands/amadeus.md` を同一変更で同期する必要があります（pi は現在この節を持たないため、意図的な非対称か欠落かの判定が別途必要です）。
- **分割の提案**: 本 Issue は根の異なる少なくとも5件（(1) directive の batch 欠落 / (2) stale Bolt Refs 復旧手順の順序不能 / (3) Stop hook が batch 途中を stage report へ誘導 / (4) finalize の Git 未統合による偽 green / (5) prepare の既定 base がブランチ名）を束ねています。プロジェクトの「1 Issue = 1 Unit」原則に照らすと分割対象です。特に (4) は重大度が異なる可能性があるため独立させるのが妥当と考えます。

### 後続検証者向けメモ

- 検証はすべて frozen SHA `127be70c5` に対する read-only 実行です。書き込みは scratch ディレクトリ内のみ、リポジトリと GitHub の状態は変更していません。
- 再導出できる述語（測定 ref = 同 SHA）:
  - directive shape: `packages/framework/core/tools/amadeus-directive.ts` の `validateDirective` を import し、`{kind:"invoke-swarm",units:["x"],cap:1}` と、そこへ `batch`/`check_cmd`/`test_file` を足したものを渡す。
  - harness census: 各 conductor 面へ `grep -c -- "--batch <n>"` および `grep -c -- "check-cmd"`。
  - 不在主張: `grep -c "runtime-graph\|bolt_dag\|runtime graph" packages/framework/harness/codex/skills/amadeus/SKILL.md` → 0（exit 1 = エラーなしの不一致であることを exit code で確認済み。exit 2 なら述語側の異常）。`grep -rl "amadeus-worktree" packages/framework/harness/` → 0 ファイル。
  - 文言の履歴: `git log -S "none of its declared artifacts exist" -- packages/framework/core/tools/amadeus-state.ts`。
- 注意点: ローカルの `grep` がラッパ実装の環境では、選言が長い述語や `\b` を含む述語が空出力 + 非ゼロ終了で無音失敗します。上記の不在主張はいずれも単純な述語に分割し、exit code を確認しています。
- `check_cmd` を directive へ載せる案を検討する場合、`amadeus-swarm.ts:231-235` の「利用者の入力である」という明示的な設計判断を覆すことになるため、バグ修正ではなく設計変更として扱ってください。

### Verdict

**CONFIRMED_WITH_REFINEMENTS** — 中核の主張（`invoke-swarm` が engine の保持する 1-origin batch 番号を運ばず、同梱 skill はそれを必須入力として要求し、値を取得する正規経路が存在しない）は現断面のコードで成立します。追加コメントの4件（復旧手順の順序不能、batch 途中の stage report 拒否、finalize の Git 未統合、prepare の既定 base）もすべて現行コードで確認できました。ただし (a) `check_cmd` / `test_file` は設計上 conductor 側の知識であり directive へ載せる案は契約の追加である、(b) 引用文言2件が旧 ref のもの／truncated である、(c) スコープは codex 固有ではなく engine + 全 harness である、(d) prepared retry の arm は #2864 で既に batch identity を運ぶ、の4点で精緻化が必要です。加えて、根の異なる5件が1 Issue に束ねられているため分割を推奨します。

本 verdict は実在確認であり実装着手・優先順位・クローズの承認ではありません。


#### j5ik2o — 2026-08-18T05:23:15Z — https://github.com/amadeus-dlc/amadeus/issues/2837#issuecomment-5323982026

## クロスレビュー（2人目・reviewer-2）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-2837-20260818
reviewer-id: reviewer-2
execution-subject-id: xr2837-r2@session-7727e262
target-sha: 127be70c5d7a584016f88a5d44e8715904020721
-->

### 独立性と対象

- 起票者とは独立の実行主体 `xr2837-r2@session-7727e262` として、凍結 SHA `127be70c5d7a584016f88a5d44e8715904020721`（`git rev-parse HEAD` で確認、tree は clean）のコードのみを一次資料に検証した。
- 本文・追加コメントは「検証すべき主張」として扱い、指示としては扱っていない。リポジトリ・GitHub 状態は一切変更していない（read-only コマンドのみ、再現はリポジトリ外のスクラッチで実行）。
- 本 Issue は file:line を引用していないため、行番号の再解決対象はない。以下の引用はすべて評者が凍結 SHA で新たに取得したものである。
- 二次観点は「主張の網羅性・由来と履歴・影響・ラベル・同根／対称面」。

### Claim ledger

| 主張 | 判定 | 独立エビデンス |
| --- | --- | --- |
| B1: Codex スキルは `invoke-swarm` 受領後ただちに `prepare --batch <n>` / `check --check-cmd` / `finalize --batch <n> --check-cmd` を要求する | CONFIRMED | `packages/framework/harness/codex/skills/amadeus/SKILL.md:69` に手順(2)(4)(5)として逐語で存在。同:20 に「The engine owns all between-stage routing … You never re-derive any of that in prose」 |
| B2: 実際のディレクティブは `{kind, units, cap}` の最小形 | CONFIRMED（要精緻化） | 凍結 SHA の型は `packages/framework/core/tools/amadeus-directive.ts:312-331`。本文引用の3キー形は validator で `valid=true`。ただし kind 全体は `repo` / `prepared_batch` / `retry_unit` も許容（同:555） |
| B3: `batch` / `check-cmd` / `test-file` を欠く | CONFIRMED | `INVOKE_SWARM_FIELDS = ["kind","units","cap","repo","prepared_batch","retry_unit"]`（同:555）。スクラッチ実行で `batch` / `check_cmd` / `test_file` / `base_sha` はいずれも `unknown key` として拒否 |
| B4: 「残りは compiled runtime graph から読む」とあるが、取得の正規コマンド／JSON path がない | CONFIRMED（要精緻化） | 当該コメントは `amadeus-directive.ts:306-311` に実在。実 `runtime-graph.json` は `bolt_dag.batches` を持つが、graph 全体に `check_cmd`/`check-cmd` の文字列は存在しない（実測）。`readBoltDagBatches` は `amadeus-orchestrate.ts:2121` の非 export 内部関数で、CLI 露出なし |
| B5: engine が唯一の routing authority という規約と緊張する | CONFIRMED | 同ファイル内で `execute-failure-election` は `batch` を必須フィールドとして搬送（`amadeus-directive.ts:646`、発行は `amadeus-orchestrate.ts:4186` の `batch: target.batch`）。同じ engine が別 kind では batch を渡している |
| B6: 再進入時に旧 terminal pool と衝突しない batch/pool identity がない | CONFIRMED（要精緻化） | pool identity は batch 整数のみ（`amadeus-swarm.ts:638` の idempotency key `unit-pool:<batch>:initial-enqueue`、`amadeus-orchestrate.ts:3920` の `readProjection(String(index + 1))`）。plan generation は監査フィールドに刻むだけで pool key に入らない（`amadeus-swarm.ts:362-373`） |
| C1: stale `Bolt Refs` の公式リカバリ文言（discard → state merge）が実行不能 | CONFIRMED | 文言は `amadeus-state.ts:6124`（「`amadeus-worktree discard` と `amadeus-state.ts merge`（"already merged" で clean 終了する）」）。しかし merge は worktree 存在検査（同:6281-6283）を already-merged 分岐（同:6318）より **前** に置く。さらに `amadeus-worktree.ts` は `Bolt Refs` を一切参照しない（grep exit 1） |
| C2: Stop hook が途中 batch を stage report へ誘導する／stage report は artifact 不在で拒否される | CONFIRMED_WITH_REFINEMENT | `continuationReason`（`packages/framework/core/hooks/amadeus-stop.ts:895-916`）は directive kind 非依存の共通文で、`invoke-swarm` 用の batch 認識分岐を持たない。ただし文面は「`next` を実行し、返った directive を実行してから report」の順序であり、即時 stage report を明示指示してはいない。拒否メッセージ自体は本レビューでは実行再現していない |
| C3: `finalize` は exit 0・`merge_failures: []` を返すが Git source は統合されない | CONFIRMED | `finalize` の統合は `amadeus-bolt.ts complete --merge` のみ（`amadeus-swarm.ts:1043-1049`）。`complete --merge` の子プロセスは state merge / audit-merge / fragment-merge の3つだけで（`amadeus-bolt.ts:632-655`、出力 `merged: ["STATE_MERGED","AUDIT_MERGED","RUNTIME_GRAPH_MERGED"]`）、`amadeus-worktree.ts` の spawn は abort 経路の `discard` 1箇所のみ（同:731） |
| C4: `prepare` の既定 base が branch 名で、local/remote 乖離時に exit 2、`--base <sha>` で回避 | CONFIRMED | `const base = flags.base ?? currentBranch(repoCwd)`（`amadeus-swarm.ts:581`、`currentBranch` は同:1331-1339 で `rev-parse --abbrev-ref HEAD`）。拒否は `amadeus-worktree.ts:163`。`prepare` は `--allow-stale` を一切転送しない（grep exit 1）ため、逃げ道は `--base` のみ |
| 起票以降に前提を覆す変更が着地したか | CONTRADICTED（前提は現存） | リポジトリ内に `#2837` への参照なし。`emitConfiguredSwarm` は 2026-08-03 の #2071 以降未変更。起票翌日 2026-08-11 の #2864（`051bbeb99a`）が `prepared_batch`/`retry_unit` を追加したが、新規 batch 側は未変更 |

### 再現・コード実読

実行はすべてリポジトリ外のスクラッチ。リポジトリに対しては read-only の `git grep` / `git log` / ファイル読取のみ。

1. **凍結 SHA の確認**: `git rev-parse HEAD` → `127be70c5d7a584016f88a5d44e8715904020721`、`git status --porcelain` は空。
2. **ディレクティブ契約の実測**（`validateDirective` を import してスクラッチ実行、exit 0）:

```text
minimal (as issue quotes): valid=true
with batch:      valid=false errors=["invoke-swarm: unknown key: batch"]
with check_cmd:  valid=false errors=["invoke-swarm: unknown key: check_cmd"]
with test_file:  valid=false errors=["invoke-swarm: unknown key: test_file"]
with base_sha:   valid=false errors=["invoke-swarm: unknown key: base_sha"]
prepared retry:  valid=true
```

つまり本文の主張は「スキルに書いていない」以前に「契約が受け付けない」段階で成立する。修正案1は `INVOKE_SWARM_FIELDS`（`amadeus-directive.ts:555`）とバリデータの変更を必ず伴う。

3. **engine 側は batch 番号を保持したうえで捨てている**（本件の中核機序）:
   - `firstUncoveredBatch` は `{ units, batchNumber }` を返す（`amadeus-orchestrate.ts:3906-3932`、`return { units: uncovered, batchNumber: index + 1 }` は同:3929）。
   - `declaredBatchOf` のコメントは「The one place the 1-origin offset is applied」（同:4014-4022）。
   - しかし発行点は `emitConfiguredSwarm(projectDir, selection.value.pick.units)`（同:4294）で、**`units` だけを渡し `batchNumber` を破棄**する。`emitConfiguredSwarm` の引数は `(projectDir, units)`（同:4074）。

   スキルが要求する `--batch <n>` の値は engine が権威的に算出済みであり、emit 境界で失われている。
4. **convergence check は engine のどこにも存在しない**: `git grep -n "check_cmd" -- packages/` と `"convergence_check"` はいずれも exit 1（一致なし）。swarm の設定ドメインは `swarm.unit.concurrency.limit` の1キーのみ（`packages/framework/core/tools/amadeus-config.ts:612-613, 900-903`）。実在の `runtime-graph.json` を読んでも top-level は `workflow_id, scope, started_at, stages, bolt_dag, delivery_bolts` で、graph 全体を文字列化しても `check_cmd`/`check-cmd` に一致しない。
5. **再進入の衝突機序**: `firstUncoveredBatch` の uncovered 判定は terminal outcome の `cancelled` / `succeeded` のみを除外する（`amadeus-orchestrate.ts:3923-3928`）。したがって **failed で terminal になった Unit は同じ batchNumber で再提示される**。一方 pool は batch 整数で識別される（上表 B6）。起票者が batch 1 を推測せず batch 2 を使った判断は、この構造と整合する。
6. **リカバリ文言の実行不能性**: `amadeus-state.ts` の merge ハンドラは worktree ディレクトリ不在で即 error（:6281-6283）、`already merged` の clean 分岐（:6318）はその後段。`git grep -n "Bolt Refs" packages/framework/core/tools/amadeus-worktree.ts` は exit 1、`git grep -n "amadeus-state" packages/framework/core/tools/amadeus-worktree.ts` も exit 1。discard は Bolt Refs を触れないので、prescribed order では stale ref は決して消えない。

### 機序・影響・ラベル

**機序（要約）**: engine は batch 番号を算出しながら emit 時に落とす。convergence check に至っては directive・runtime graph・設定のいずれにも実体がない。結果として conductor は、スキル自身が禁じている engine-owned routing の再導出（uncovered batch 選択ロジックの再実装）と、根拠のない check コマンドの捏造を強いられる。

**影響**: `invoke-swarm` は autonomy が `none`/`semi` でも fan-out する（`amadeus-orchestrate.ts:3982-3984`）ため、DAG を持つ複数 Unit の Construction すべてが対象。かつ **codex 固有ではない**（下記「同根・対称面」）。

**ラベル評価**（`.github/ISSUE_TEMPLATE/bug.yml` の定義に照合）:

- `bug` は妥当。完了条件テストの (3)「成果物が既存の合意済み契約に違反」に該当する — 出荷済み SKILL.md の手順が、同じく出荷済みの directive 契約から実行不能であり、SKILL.md:20 の routing 規約とも背反する。新契約の追加要素（`check_cmd` の宣言先の新設）は enhancement 寄りだが、主たる完了条件は既存契約の整合回復なので `bug` を維持してよい。
- `S3-MAJOR`（回避策のある誤動作）は**本文の主張範囲では**妥当 — 起票者自身が推測・`--base <sha>` で回避している。
- `P2` も本文範囲では妥当。ただし後述のとおり、コメント3の「偽 converged」は本文とは別クラスであり、そちらを別 Issue に切り出したうえで S2 以上を検討すべき（`finalize` が exit 0 と `merge_failures: []` を返す一方、監査は「trunk に着地しない Unit に `SWARM_UNIT_CONVERGED` は出さない」と自称している（`amadeus-swarm.ts:1055-1060`）ため、偽 green の性質を帯びる）。
- タイトルの `harness/codex` スコープは実態より狭い。`engine`＋全 conductor surface に読み替えるのが実測に整合する。

### 訂正・未解決事項

1. **本文の「最小形」記述の訂正**: 凍結 SHA では `invoke-swarm` は `repo` / `prepared_batch` / `retry_unit` も許容する。本文の3キー JSON は「有効な一事例」であって kind の全形ではない。
2. **修正案1は必要だが十分ではない**: 素直に 1-origin の DAG index を載せると、failed terminal 後の再提示では**同じ batch 番号**が返るため（再現6）、起票者が遭遇した pool 衝突をそのまま再現する。搬送すべきは DAG index ではなく、pool generation を織り込んだ識別子である。
3. **`check_cmd` / `test_file` は「搬送」では解けない**: 権威ある値がリポジトリのどこにも存在しない（再現4）。ドキュメントは "the project's own check command"（`docs/reference/17-skill-system.md:125`）と述べており、現行設計では conductor 側の知識と位置づけられている。修正案2の read-only コマンドを作っても、宣言先（config か plan）を先に決めない限り返す値がない。ここは設計判断が要る。
4. **スキルの base 例示も是正対象**: `SKILL.md:69` の唯一のヒントは `[--base main]` だが、省略時の既定は現在 branch 名、コメント4の正解は local SHA で、三者が食い違う。
5. **未検証**: 関連 Issue #2833 との切り分け（本レビューは凍結プロトコルにより GitHub へアクセスしていない）。各コメントが引用する実行時エラー文字列そのもの（同等の文言を生む**コード経路**は実読で確認したが、ライブ実行は再現していない）。
6. **要求された回帰テストは現存しない**: swarm 系テスト（`tests/integration/t135-invoke-swarm.test.ts`、`tests/integration/t379-swarm-canonical-emit.test.ts`、`tests/e2e/t134-swarm-referee.test.ts`）のテスト名を列挙したが、「failed terminal batch → upstream replan → same Unit redispatch」を通す試験は存在しない。

### 同根・対称面

- **他ハーネスも同じ欠陥**: `--check-cmd` を含む conductor surface は 7 面 — `claude` / `codex` / `kimi` / `kiro` / `kiro-ide` の `skills/amadeus/SKILL.md` と、`cursor` / `opencode` の `commands/amadeus.md`（`git grep -c -- "--check-cmd"` の出力より）。`--batch <n>` も skill 系5面すべてに存在（各6件）。`pi` だけは散文が粗く（`packages/framework/harness/pi/skills/amadeus/SKILL.md:84-94`）具体的なフラグを書かないが、batch の出所がない点は同じ。**codex だけ直しても他6面が残り、`tests/unit/t181-conductor-skill-parity.test.ts` の parity ゲートとも整合しない。**
- **同一 kind 内の非対称**: retry 経路（`prepared_batch` + `retry_unit`、`amadeus-orchestrate.ts:4092-4106`）は batch 識別子を搬送するのに、新規 batch 経路は搬送しない。設計上の前例は既に自ファイル内にある。
- **同一 emitter 内の非対称**: `execute-failure-election` は `stage` / `unit` / `attempt` / `batch` / `siblings` を必須搬送する（`amadeus-directive.ts:643-647`）。engine が batch を渡せない構造的理由はない。
- **同根の記述不整合（独立発見）**: `packages/framework/core/tools/amadeus-bolt.ts:726` のコメントは Bolt Refs が「`amadeus-worktree discard` の WORKTREE_DISCARDED 経路で消える」と述べるが、`amadeus-worktree.ts` には `Bolt Refs` も `amadeus-state` への言及も存在しない（両 grep とも exit 1）。C1 のリカバリ文言が実行不能である根っこと同一で、「誰が stale ref を消すか」の契約が実装と食い違っている。
- **record 成果物も同じ穴**: `complete --merge` は state / audit / runtime-graph fragment しか統合しないため、unit worktree の record 配下に書かれた stage 成果物も本線へ来ない。コメント3末尾の「直後の engine report が declared artifact 不在で拒否」は、Git source ではなくこの record 面の非統合として説明できる。

### 後続検証者向けメモ

- 使用コマンド（すべてリポジトリルートで read-only）: `git rev-parse HEAD` / `git status --porcelain` / `git grep -n` / `git grep -c` / `git log --format='%h %ad %s' --date=short -S<token> -- <path>` / ファイル読取。不在主張はすべて **exit code を確認**（一致なし = 1、エラー = 2 の区別）。選言を長く連ねた述語は使っていない。
- ディレクティブ契約の再現は、`packages/framework/core/tools/amadeus-directive.ts` の `validateDirective` を import する小さなスクリプトをリポジトリ**外**のスクラッチに置いて `bun` で実行（exit 0）。リポジトリ内の record・audit には一切書き込んでいない。
- `runtime-graph.json` は per-clone の未追跡生成物なので、内容は「本ワークスペースに実在した1件」を読んだ実測であり、SHA に束縛された不変事実ではない。graph に `check_cmd` が無いという結論は、`git grep -n "check_cmd" -- packages/`（exit 1）と config スキーマの1キーのみという追跡ファイル側の証拠でも独立に支えられる。
- 履歴確認は `-S` によるトークン出現数の差分であり、同一トークン数を保つ編集は検出しない。`INVOKE_SWARM_FIELDS` の配列**内容**は #2864 で変わっているが `-S'INVOKE_SWARM_FIELDS'` には出ないため、凍結 SHA の行（:555）を直接引用している。
- 再検証の最短経路: (1) `amadeus-orchestrate.ts:3929` と :4294 を並べて読み、`batchNumber` が emit 境界で落ちることを確認 (2) 上記スクラッチ probe で `unknown key: batch` を再現 (3) `amadeus-state.ts:6281` と :6318 の順序を確認。

### Verdict

**CONFIRMED_WITH_REFINEMENTS** — 本文の中核主張（`invoke-swarm` が実行に必要な batch 番号と convergence check コンテキストを欠く）は凍結 SHA で成立し、engine が batch 番号を算出しながら emit 時に破棄していること、convergence check の権威ある値がフレームワークのどこにも存在しないことまで機序として確定した。4件の追加コメントもすべてコード実読で裏付けられた。精緻化は3点 — (a) 現行の kind は `repo`/`prepared_batch`/`retry_unit` も持ち「3キーのみ」ではない、(b) DAG index をそのまま載せる修正は再進入時の pool 衝突を再現するため不十分、(c) `check_cmd` は宣言先の新設を伴う設計判断であり搬送だけでは解けない。加えて本欠陥は codex 固有ではなく 7 つの conductor surface に及ぶため、タイトルのスコープは実態より狭い。

本 verdict は実在確認であり実装着手・優先順位・クローズの承認ではありません。


### その他コメント(verbatim、任意)

#### j5ik2o — 2026-08-10T12:07:16Z — https://github.com/amadeus-dlc/amadeus/issues/2837#issuecomment-5239884791

再現中に追加で確認した事実です。

- 旧 batch 1 は terminal (`SWARM_COMPLETED`, failed=1)。現行plan generationで同じUnitが再提示された。
- 未使用の batch 2 として `prepare` すると、worktree作成後に `amadeus-state fork` が stale `Bolt Refs` を検出して失敗した。
- エラー文は `amadeus-worktree discard` の後に `amadeus-state.ts merge` を実行するよう指示するが、その順序では `merge` が `worktree directory does not exist` で失敗する。
- 実際に復旧するには、一時worktreeを再createし、state mergeでstale refを除去し、その後discardしてからprepareし直す必要があった。

したがってdirective context欠落に加え、再進入時の公式リカバリ文言／操作順も実行不能です。回帰テストでは「failed terminal batch → upstream replan → same Unit redispatch」を通し、Codexが手作業でstate identityを推測しなくても再開できることを確認してください。


#### j5ik2o — 2026-08-10T12:29:27Z — https://github.com/amadeus-dlc/amadeus/issues/2837#issuecomment-5240235795

追加のCodex契約上の曖昧さです。

skillの `invoke-swarm` 節はfinalize成功後に「report and continue the loop」と記載し、Stop hookもpending `invoke-swarm` に対して `report --stage <stage> --result <outcome>` を要求します。しかし複数Unit DAGの最初のbatchを成功finalizeした直後に次を実行すると、stage全体のartifactが未完のため正しく拒否されました。

```text
amadeus-orchestrate.ts report --stage code-generation --result completed
```

```json
{"kind":"error","message":"... none of its declared artifacts exist ..."}
```

batch finalize後に必要なのはstage reportではなく、まず `next` で次のuncovered batchを取得することです。最後のbatch後にだけstage reportするのか、engineがall-covered re-entryで別directiveを返すのかを、Codexが推測しなくてよいよう明記してください。Stop hookも途中batchをstage reportへ誘導しないよう、batch terminal evidenceを認識する必要があります。


#### j5ik2o — 2026-08-10T12:30:09Z — https://github.com/amadeus-dlc/amadeus/issues/2837#issuecomment-5240245219

もう一点、`finalize` の成功envelopeと実際のGit統合が一致しませんでした。

- workerはunit worktreeで commit `9400b7a9...` を作成。
- `amadeus-swarm check` はconverged、pool settleはterminal completed。
- `amadeus-swarm finalize` は `status: converged`, `merge_failures: []`, exit 0。
- しかし現在のIntent branchにはworker commitも5成果物も存在せず、unit worktree/branchにだけ残った。
- `amadeus-bolt complete --merge` の実装はstate/audit/runtime graphのみをmergeし、Git source commitをmergeしていない。
- その直後のengine reportはdeclared artifact不在で拒否した。

今回はcommitを現在の専用worktree branchへ手動cherry-pickして継続しました。`finalize` が「merged」と称するならGit source/outputも統合するか、Codex skillに必須のGit統合手順を明記し、未統合時はexit 0を返さない契約にしてください。


#### j5ik2o — 2026-08-10T12:47:24Z — https://github.com/amadeus-dlc/amadeus/issues/2837#issuecomment-5240483912

追加再現: 単位別 PR の収束後、次 batch の `prepare` が既定 base で失敗する

## 状況

- main workflow の専用 branch: `issue-2815-numeric-provenance`
- U1 を main worktree に cherry-pick 済み: local `04155ef5e9da4111b87e1d6f488bae4321571f93`
- U1 の差分を保持した単位別 PR の base として remote branch は pre-U1 の `a3dc6667984adbc1fe1f8b4ff78316f733506022` のまま
- U1 の PR convergence 完了後、engine は U2 の `invoke-swarm` を返した

## 再現コマンド

```sh
bun .codex/tools/amadeus-swarm.ts prepare \
  --batch 3 \
  --units numeric-provenance-sensor-cli \
  --concurrency 1
```

## 実際の結果

`prepare` は現在 branch 名を base に選び、worktree create が次の理由で exit 2 になった。

```text
Local base branch "issue-2815-numeric-provenance" differs from origin/issue-2815-numeric-provenance:
local SHA 04155ef5e9da4111b87e1d6f488bae4321571f93,
remote SHA a3dc6667984adbc1fe1f8b4ff78316f733506022.
```

一方、remote branch を local SHA へ push すると、直前に収束判定した単位別 PR の差分が消えるため、PR convergence と次 batch preparation の要求が衝突する。

## 回避策

未作成・pool 未初期化を確認後、同じ batch で local commit SHA を明示すると成功した。

```sh
bun .codex/tools/amadeus-swarm.ts prepare \
  --batch 3 \
  --units numeric-provenance-sensor-cli \
  --concurrency 1 \
  --base 04155ef5e9da4111b87e1d6f488bae4321571f93
```

## 期待する改善

- `invoke-swarm` directive に、直前 Unit 統合後の authoritative local base SHA を含める。
- または `prepare` が branch 名ではなく解決済み local SHA を既定 base として使う。
- 少なくとも Codex 向け prompt に、単位別 PR の base を保持中は `--base $(git rev-parse HEAD)` 相当を使うことを明記する。

現在の directive は unit/cap だけなので、Codex は remote を push して PR を壊すか、既定 prepare を失敗させるまでこの制約を知れない。


## Issue #3106: bug(engine): per-unit 経路の cancelled unit は UNIT_OUTCOME_SETTLED を持たず producer-outcome-pending が残りうる(pool 経路の cancelled terminal との非対称)

- state: OPEN / labels: 未取得(本 verb の read 面は本文・状態・コメントのみ) / url: https://github.com/amadeus-dlc/amadeus/issues/3106 / target-sha: 127be70c5d7a584016f88a5d44e8715904020721
- review-run-id: xrev-3106-20260818 / 独立レビュアー: 2名(marker 計数)

### 本文(verbatim)

## 背景・対象範囲

PR #3105(Issue #3099 の修正)は、per-unit `run-stage` 経路で完走した Construction の unit outcome を `UNIT_OUTCOME_SETTLED` として監査へ記録し、per-unit consume fanout の母集団を成立させた。ただし選挙裁定(E-260815-3099-FIX-METHOD / E-260815-3099-C-FORM)の attributes が `Outcome: succeeded` のみを定めるため、settle の発行条件は **covered かつ非 cancelled の unit に限定**されている(実装: `packages/framework/core/tools/amadeus-orchestrate.ts` の settlePerUnitOutcomes — PR #3105 断面)。

## 根拠・実測証拠(fact)

- settle emitter は cancelled unit を発行対象から除外する(PR #3105 head `ec5ca39b3` の実装・code-summary.md 申し送り 1)
- pool(swarm)経路の canonical projection は cancelled を第一級 terminal として扱う(`amadeus-construction-outcome-projection.ts:222-228` の `CONSTRUCTION_AUDIT_EVENTS` — BOLT_FAILED / ruling 系を受理)
- したがって **per-unit 経路で unit が cancel された batch は、当該 unit が settle 行を持たず `producer-outcome-pending` が残りうる**(pool 経路との非対称)。#3105 の `docs/guide/15-troubleshooting.md` に既知の限界として明記済み

## 仮説(未実測)

- per-unit 経路の cancel は `handleFailureRuling`(orchestrate.ts:6586 — retry / skip 裁定時の pool mutation)を経由するため、skip 裁定では pool イベントが書かれ fanout が terminal を読める可能性がある。この場合、実発火面は「failure ruling を経ない cancel」に限られる。**実際に per-unit 経路で cancelled unit が pending のまま停止する再現条件の特定が本 Issue の第一作業**

## 期待結果・完了条件

1. per-unit 経路で cancelled unit を含む batch の実挙動を実測し、pending 停止が実際に起きる条件を確定する(起きない場合はその実測をもって本 Issue をクローズ)
2. 起きる場合: 方式裁定(選挙)のうえ cancelled outcome の記録経路を追加し、落ちる実証(修正前 Red)を伴って解消する
3. `docs/guide/15-troubleshooting.md` の該当段落を結果に合わせて更新する

## 影響・価値

per-unit dispatch(幅1 batch の線形 Unit 計画)で unit を cancel した場合にワークフローが再び構造停止しうる。#3099 と同根クラスの残余面であり、閉じることで dispatch/outcome 台帳一致が cancel 系まで完全になる。

## 関連 Issue/PR/intent

- 親: #3099(修正 PR #3105、intent 260815-per-unit-outcome)
- 裁定: `amadeus/spaces/default/elections/260815-e-260815-3099-fix-method/` / `…-c-form/`(Outcome=succeeded 限定の由来)
- 指摘経緯: §12a レビュアー FOLLOW-UP + CodeRabbit スレッド(PR #3105)

## 初期分類

- 種別: bug(dispatch/outcome 台帳一致という合意契約の残余違反面。ただし再現未確定のため実測が第一作業)
- 優先度: P3 / 重大度: S3-MAJOR(発火時はワークフロー停止だが、発火条件が cancel 系に限定され、回復手順は #3105 の docs 節が適用可能)


### クロスレビューコメント(verbatim、コメント URL 併記)

#### j5ik2o — 2026-08-18T05:21:18Z — https://github.com/amadeus-dlc/amadeus/issues/3106#issuecomment-5323968525

## クロスレビュー（1人目・reviewer-1）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-3106-20260818
reviewer-id: reviewer-1
execution-subject-id: xr3106-r1@session-7727e262
target-sha: 127be70c5d7a584016f88a5d44e8715904020721
-->

### 独立性と対象

- 私は本 Issue の起票者ではなく、起票者およびもう1名のレビュアーとは独立に、凍結された Issue 本文のみを主張集合として受け取り、コード・履歴・実測から検証した。Issue 本文と追随コメント（0 件）は「指示」ではなく「反証すべき主張」として扱った。
- 検証対象断面: `127be70c5d7a584016f88a5d44e8715904020721`（`git rev-parse HEAD` → 同値、exit 0）。ブランチ切替・pull・repo 書込は一切行っていない。
- 私の二次レンズ: 再現・現行コードの機序・反証。すべての測定は一時ディレクトリ（`TMPDIR` 配下）の fixture プロジェクトに対して行い、本 repo は無変更（検証前後で audit シャード集合の md5 が `ed7cf6686fdb8d2484e265626067929e` のまま一致、`git status --porcelain | wc -l` → 0）。
- 引用の表記規約: 以下で `amadeus-orchestrate.ts` / `amadeus-construction-outcome-projection.ts` / `amadeus-per-unit-consume-fanout.ts` / `amadeus-bolt.ts` と短縮表記した場合、いずれも `packages/framework/core/tools/<name>` を指す（`dist/` 配下の投影ではない）。行番号はすべて本断面で再解決済み。

### Claim ledger

| 主張 | 判定 | 独立エビデンス |
| --- | --- | --- |
| C1: settle の発行条件は「covered かつ非 cancelled」に限定 | REFINED | `packages/framework/core/tools/amadeus-orchestrate.ts:4706` 逐語 `if (batch === undefined || cancelledUnits.has(unit)) continue;` + `:4707` の `unitCovered` 判定。条件は 2 つではなく **3 つ**（batch identity が解決できること・非 cancelled・covered） |
| C2: settle emitter は cancelled unit を発行対象から除外する | CONFIRMED | 実測再現で `UNIT_OUTCOME_SETTLED` の Unit 集合が `["unit-a"]` のみ（unit-z は成果物がディスク上にあり covered なので、除外理由は cancelled 判定以外にない） |
| C3: pool 経路の canonical projection は cancelled を第一級 terminal として扱う（`amadeus-construction-outcome-projection.ts:222-228` の `CONSTRUCTION_AUDIT_EVENTS`） | REFINED | 行 222-228 は実在し `CONSTRUCTION_AUDIT_EVENTS` に一致するが、これは**受理イベントの allowlist** であって cancelled を terminal として受理する箇所ではない。実体は `:304`（pool terminal）と `:269`（solo lifecycle）。そして projection は **pool 経路も solo 経路も** cancelled を受理するため、非対称は projection には存在しない（後述の機序を参照） |
| C4: per-unit 経路で cancel された unit は settle 行を持たず `producer-outcome-pending` が残りうる | CONFIRMED | 再現で `build-and-test` が exit 1・stderr 逐語 `amadeus-orchestrate: producer-outcome-pending: unit-z` |
| C5: `docs/guide/15-troubleshooting.md` に既知の限界として明記済み | CONFIRMED | 同ファイル `:143` 逐語 `**Cancelled Units are not settled.** ... still reports \`producer-outcome-pending\` for that Unit after the steps above.` |
| C6（仮説）: skip 裁定では pool イベントが書かれるため、実発火面は「failure ruling を経ない cancel」に限られる | **CONTRADICTED** | `handleFailureRuling` の Skip は solo arm（`amadeus-orchestrate.ts:6767-6781`）と pool arm（`:6783-6785`）に分岐し、per-unit（solo）側は `BOLT_COMPLETED`（`Outcome: cancelled` / `Batch Id: solo:N:unit`）だけを書き pool イベントを**1件も**書かない。実測: 実 CLI `resolve-failure --user-input Skip` 実行後の `UNIT_POOL_EVENT_SET_COMMITTED` 件数 = **0**。発火面はむしろ **failure ruling の Skip 裁定そのもの** |
| C7: 発火条件の特定が第一作業（起きなければクローズ） | CONFIRMED（条件確定） | 下記「再現・コード実読」に必要十分条件を実測で確定。**起きる**ため、完了条件 1 のクローズ分岐は成立しない |
| C8: 重大度根拠「回復手順は #3105 の docs 節が適用可能」 | **CONTRADICTED** | `docs/guide/15-troubleshooting.md:143` 自身が「その手順の**後も** cancelled Unit は pending のまま」と述べる。実測でも per-unit stage 再入後に settle されたのは unit-a のみで、consumer は exit 1 のまま |
| C9: 種別 bug / P3 / S3-MAJOR | REFINED | S3 は `.github/ISSUE_TEMPLATE/bug.yml:163` の「**または**限定条件での発現」節で成立するが、同じ根拠行の「回避策のある誤動作」側は C8 により成立しない。種別 bug は妥当だが解釈の余地あり（後述） |
| C10: currentness（起票後に前提を変える着地があるか） | CONFIRMED（変化なし） | `settlePerUnitOutcomes` / `readPerUnitConsumePopulation` / `cancelledConstructionUnits` の 3 関数は #3105 着地コミット `b9615ffb89` と本断面で **byte 同一**（各関数先頭から 35 行の md5 が一致）。repo 内に `3106` への参照は 0 件 |

### 再現・コード実読

**再現手順（実測、すべて一時プロジェクトに対して実行）**

`tests/integration/t533-per-unit-consume-fanout.integration.test.ts` の `seedPerUnitProject` と同形の fixture（2 Unit・batch 1 本・pool 未使用・両 Unit の `code-generation` 成果物をディスクに配置）を組み、次を実行した。

1. solo 相関付きの `BOLT_STARTED` と `BOLT_FAILED`（`Stage: code-generation` / `Attempt Id` / `Batch Id: solo:1:unit-z`）を発行
2. 実 CLI `amadeus-orchestrate.ts resolve-failure --user-input Skip` → exit 0、stdout 逐語 `{"kind":"committed","reason":"Skip committed for solo Unit \"unit-z\" as cancelled."}`
3. 監査シャードの実測: イベント列 `BOLT_STARTED,BOLT_FAILED,BOLT_COMPLETED`、`BOLT_COMPLETED` の fields に `"Outcome":"cancelled"` / `"Batch Id":"solo:1:unit-z"`、**`UNIT_POOL_EVENT_SET_COMMITTED` は 0 件**
4. `code-generation` で `next` → exit 0、`UNIT_OUTCOME_SETTLED` の Unit 集合 = `["unit-a"]`
5. カーソルを `build-and-test` へ移して `next` → **exit 1**、stdout 空、stderr 逐語 `amadeus-orchestrate: producer-outcome-pending: unit-z`

対照（control）として、同じ fixture で cancel を挟まない場合は settled = `["unit-a","unit-z"]`、`build-and-test` は exit 0 で consume 4 件を出力した。したがって差分の帰属は cancel 操作のみ。

**発火の必要条件（実測で確定）**

1. units-generation を EXECUTE した intent が per-unit dispatch（pool を通らない）経路で Construction を回している
2. その stage の Unit のいずれかが cancelled 判定を受ける。実測できた経路は solo Bolt の failure ruling **Skip**
3. 下流に required な per-unit consume を持つ stage（`build-and-test` 等）へ進む

追加で、cancelled Unit の成果物が**ディスク上に無い場合でも同じく発火する**ことを別プローブで実測した（成果物ディレクトリを削除した状態でも `build-and-test` は exit 1 / `producer-outcome-pending: unit-z`）。つまり発火面は「covered な cancelled Unit」に限られず、**per-unit 経路で cancelled になった全 Unit** が対象。

**対称面の実測（pool 側）**: 既存テスト `bun test tests/integration/t533-per-unit-consume-fanout.integration.test.ts -t "cancelled producer Unit"` → 1 pass / 0 fail（exit 0）。pool 経路で cancelled になった Unit は consumer を止めない。非対称は両側とも実測済み。

### 機序・影響・ラベル

**機序（Issue 本文より一段深い）**: 根は「settle が cancelled 語彙を持たない」ことだけではなく、**同一の監査ストリームに対する 2 つの読み口が「cancelled」の可視性で食い違っている**ことにある。

- 検出側 `cancelledConstructionUnits`（`packages/framework/core/tools/amadeus-orchestrate.ts:3934-3946`）は `normalizeConstructionOutcomeAudit` + `projectConstructionOutcomes` の canonical projection を読むため、solo の `BOLT_COMPLETED(Outcome: cancelled)` を terminal として**見る**（`amadeus-construction-outcome-projection.ts:250-286` の `normalizeSoloLifecycle` → `:402-419` の合成 `UNIT_POOL_EVENT_SET_COMMITTED` レコード）。
- 母集団側 `readPerUnitConsumePopulation`（`packages/framework/core/tools/amadeus-orchestrate.ts:2513-2556`）は `readUnitPoolEventSetsFromAudit`（実在する pool 行のみ）と `readSettledUnitOutcomes`（`UNIT_OUTCOME_SETTLED` のみ、しかも `:2508` で `Outcome` を `succeeded` 一語に閉じている）だけを読むため、solo terminal を**見ない**。

結果として、同じ Unit が「settle をスキップすべき cancelled」であり、かつ「outcome 行を持たない pending」でもある、という矛盾状態が構造的に成立する。`packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts:199` の `KNOWN_OUTCOMES` は `cancelled` を正規の値として持ち、`:224-228` は「行が無い」ことだけを pending にするので、cancelled 行さえ届けば fail-closed は解ける。

修正方式は少なくとも 2 系統ある（**方式選定は選挙事項であり、私は裁定しない**）: (a) settle 側に cancelled 語彙を追加する — この場合 `SETTLED_UNIT_OUTCOME`（`:2475`）と `readSettledUnitOutcomes` の閉語彙（`:2508`）の両方を同時に開く必要がある。(b) 母集団側を canonical projection から読むよう広げる。(a) は「engine が観測した事実を前へ記録する」という #3105 の設計線に沿い、(b) は読み口の分裂そのものを閉じる。

**影響**: Issue 本文の「ワークフローが再び構造停止しうる」は CONFIRMED。加えて、**文書化された復旧手順がこのケースには存在しない**（C8）。`readSettledUnitOutcomes` が `succeeded` 以外を拒否するため、手で `UNIT_OUTCOME_SETTLED` を足す回避は「cancelled な Unit を succeeded と偽る」ことになり、台帳を汚したうえで存在しない成果物へ fanout する。したがって「回避策あり」を根拠にした重大度判断は成り立たない。

**ラベル**:

- **種別 `bug`**: 妥当と判断する。`producer-outcome-pending` は「producer がまだ terminal を出していない」という意味の fail-closed だが、canonical projection は同じ Unit の terminal を既に持っている — 診断が事実に反しており、内部整合性の違反である。ただし反対解釈（選挙 E-260815-3099-FIX-METHOD / C-FORM が `Outcome: succeeded` に限定し、docs もその限界を宣言済みなので、拡張は新契約 = `enhancement`）も筋が通る。**この分岐は起票者・チームの裁定事項として明示的に残す**。
- **重大度 `S3-MAJOR`**: ラベル自体は維持でよい（`bug.yml:163` の「限定条件での発現」に該当）。ただし Issue 本文の根拠文「回復手順は #3105 の docs 節が適用可能」は事実に反するので**本文の訂正が必要**。なお `bug.yml:160` の `S1-FATAL` は「ワークフロー停止」を含むため、復旧手順不在を加味すると S2 への引き上げ余地もある（私は S3 維持を推すが、根拠は「回避策あり」ではなく「発現条件が限定的」の一点に依るべき）。
- **優先度 `P3`**: 価値判断であり falsifiable ではないため INCONCLUSIVE。ただし「復旧手順が無い」という新事実は優先度再考の入力になりうる。

### 訂正・未解決事項

1. **引用行の再解決**: `handleFailureRuling` は本断面で `packages/framework/core/tools/amadeus-orchestrate.ts:6733`。Issue が引く `6586` は、PR head `ec5ca39b3`（そこでは `6692`）でも PR base `78146f435a`（`6567`）でも一致しない。シンボル名では一意に解決したので主張の実体は保たれているが、行ピンは現断面へ更新すべき。
2. **C3 の引用意味論**: `packages/framework/core/tools/amadeus-construction-outcome-projection.ts:222-228` は行としては実在・一致するが、「cancelled を第一級 terminal として扱う」根拠箇所ではない。根拠は `:304`（pool）と `:269`（solo）。かつ projection は solo cancelled も受理するため、「pool 経路との非対称」という Issue タイトルの因果は**一段ずれている** — 非対称の所在は projection ではなく `readPerUnitConsumePopulation` の入力集合。
3. **C6 の仮説は反証済み**: 「skip 裁定なら pool イベントが書かれる」は pool arm にのみ当てはまり、per-unit（solo）arm には当てはまらない。「実発火面は failure ruling を経ない cancel に限られる」という限定は**削除すべき**。
4. **C1 の条件数**: settle のスキップ条件は 3 つ（batch identity 未解決も含む）。batch identity を解決できない Unit も同じく pending 源になりうる（コードコメント `:4682-4685` が意図として明記）。本 Issue の範囲外だが、修正時に同じ関数を触るため棚卸し対象。
5. **未解決（私は裁定しない）**: 修正方式 (a)/(b) の選定、種別 bug/enhancement の解釈、優先度。いずれも選挙またはユーザー裁定の領分。

### 同根・対称面

- **pool 経路**: cancelled Unit は consumer を止めない（既存 t533 テスト実行で exit 0 を実測）。本 Issue の非対称の相手側として確定。
- **solo 失敗・未裁定**: solo `BOLT_FAILED` を置いたまま `next` すると `code-generation` は `ask`（failure ruling プロンプト）を返し、`UNIT_OUTCOME_SETTLED` は 0 件だった。**失敗 Unit を succeeded と誤って settle する逆向きの欠陥は無い**（failure ask が settle より前に短絡する fail-closed が正しく効いている）。この面は健全。
- **`resolve-failure Abort`**: `amadeus-orchestrate.ts:6788-6790` は `amadeus-bolt.ts abort` 経由で `BOLT_FAILED(Reason: aborted)` → `constructionSuspended` へ落ちるので cancelled にはならない。本 Issue の発火面には入らない（未実測、コード実読による判定）。
- **`Retry`**: solo arm は `amadeus-bolt.ts start` を再実行するのみで terminal を書かないため無関係。

### 後続検証者向けメモ

- 再現は `tests/integration/t533-per-unit-consume-fanout.integration.test.ts` の `seedPerUnitProject`（`:101-167`）をスクラッチへ複製し、cancel を実 CLI の `resolve-failure --user-input Skip` で駆動する形が最短。落ちる実証を repo 側へ足すなら同ファイルに「solo skip → `producer-outcome-pending`」の 1 本を追加するのが自然（`:786-801` の pool 版 cancelled テストと対になる）。
- `dist/` の関連 3 ファイル（`amadeus-orchestrate.ts` / `amadeus-construction-outcome-projection.ts` / `amadeus-per-unit-consume-fanout.ts`）は source 断面と byte 一致を `diff -q` で確認済み（3 件とも exit 0）。fixture は `dist/claude/.claude` を複製するので、この確認を省くと stale dist で測ることになる。
- 測定の provenance: 件数・exit code はすべて上記コマンドの出力からの転記。派生値は用いていない。fixture プロジェクトは `TMPDIR` 配下に作られ、`--project-dir` で明示されるため実 record への書込は無い（検証前後で audit シャード md5 不変・`git status` 0 行を実測）。
- 事実と仮説の区別: 「再現・コード実読」節と Claim ledger の判定はすべて実行結果または file:line の実読から導いた**事実**。`Abort` 経路が発火面に入らないこと、修正方式 (a)/(b) の得失、S2 引き上げ余地は**コード実読からの推論・意見**であり実測ではない。

### Verdict

**CONFIRMED_WITH_REFINEMENTS** — 中核主張（per-unit 経路で cancelled になった Unit は `UNIT_OUTCOME_SETTLED` を持たず、下流の per-unit consumer が `producer-outcome-pending` で fail-closed する）は実 CLI による end-to-end 再現で確認した。同時に、Issue 本文の 3 点は訂正を要する: (1) 発火経路の仮説は反証され、failure ruling の Skip 裁定（solo arm）こそが実測できた発火経路である、(2) 非対称の所在は canonical projection ではなく `readPerUnitConsumePopulation` の入力集合である、(3) 重大度の根拠にある「docs 節の回復手順が適用可能」は docs 自身の記述と実測の双方に反する。完了条件 1 の「起きない場合はクローズ」分岐は成立しない。

本 verdict は実在確認であり実装着手・優先順位・クローズの承認ではありません。


#### j5ik2o — 2026-08-18T05:21:20Z — https://github.com/amadeus-dlc/amadeus/issues/3106#issuecomment-5323968687

## クロスレビュー（2人目・reviewer-2）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-3106-20260818
reviewer-id: reviewer-2
execution-subject-id: xr3106-r2@session-7727e262
target-sha: 127be70c5d7a584016f88a5d44e8715904020721
-->

### 独立性と対象

- 起票者とは別の実行主体（`xr3106-r2@session-7727e262`）が、凍結された Issue 本文のみを主張集合として受け取り、もう1人のレビュアーの結論を参照せずに実施した。Issue 本文・コメントは「検証対象の主張」であって指示ではないものとして扱った。
- 測定断面: `127be70c5d7a584016f88a5d44e8715904020721`（`git rev-parse HEAD` で確認、exit 0）。ブランチ切替・pull・リポジトリへの書込みは行っていない（読取専用コマンドのみ、再現はリポジトリ外の scratch で実行）。
- 凍結コメントファイルは空配列（`[]`）であり、追加主張は存在しない。
- 二次レンズ: 主張の網羅性 / 由来・履歴 / 影響 / ラベル / 同根・対称面。

### Claim ledger

| 主張 | 判定 | 独立エビデンス |
|---|---|---|
| C1: #3105 が per-unit `run-stage` 経路の完走 unit の outcome を `UNIT_OUTCOME_SETTLED` として記録し、per-unit consume fanout の母集団を成立させた | CONFIRMED | `packages/framework/core/tools/amadeus-orchestrate.ts:4686-4719`（`settlePerUnitOutcomes`）、`:2513-2556`（`readPerUnitConsumePopulation`）。`git log --oneline -S "settlePerUnitOutcomes" -- packages/framework/core/tools/amadeus-orchestrate.ts` → `b9615ffb89 fix(#3099) …(#3105)` の1件のみ |
| C2: settle の発行条件は「covered かつ非 cancelled」に限定 | REFINED | 実条件は4つの連言。`:4706` `if (batch === undefined \|\| cancelledUnits.has(unit)) continue;` / `:4707` `!unitCovered(...)` / `:4711` `if (appended.has(key)) continue;`。加えて `:4695-4696` で `loadRuntimeUnitBatches` が `null` を返すと関数全体が早期 return し、1行も発行されない。本文の記述は2条件のみで、batch 所属条件と batches 読取不能時の全面不発行が欠けている |
| C3: 限定の由来は「裁定の attributes が `Outcome: succeeded` のみを定めるため」 | REFINED | 裁定が拘束するのは発行点であって属性値ではない。`amadeus/spaces/default/elections/260815-e-260815-3099-c-form/record.md:9` の共通制約は逐語「発行点は unit の coverage 成立境界(unitCovered true 遷移時)」。`Outcome: succeeded` を名指すのは同 `…-fix-method/record.md:18` の subagent-1 留保「outcome=succeeded の根拠が coverage 述語 + reviewer verdict で足りないと実装時に判断される場合は、その場で緩めず再裁定へ戻すこと」。閉語彙そのもの（`SETTLED_UNIT_OUTCOME = "succeeded"`）は `amadeus-orchestrate.ts:2475` の #3105 実装判断であり、cancelled 除外は申し送りとして記録された実装判断。趣旨は妥当だが帰属がやや緩い |
| C4: settle emitter は cancelled unit を発行対象から除外する（実装・code-summary 申し送り1） | CONFIRMED | `amadeus-orchestrate.ts:4706` の第2選言。申し送りは `amadeus/spaces/default/intents/260815-per-unit-outcome/construction/per-unit-outcome/code-generation/code-summary.md:53` に逐語「**cancelled unit は per-unit 経路で settle 行を持たず pending が残る**」 |
| C5: pool 経路の canonical projection は cancelled を第一級 terminal として扱う（`amadeus-construction-outcome-projection.ts:222-228`） | REFINED | 引用行は凍結SHAで正確に一致（`:222` が `const CONSTRUCTION_AUDIT_EVENTS`、`:228` が `];`）。ただしこの配列は **`cancelledConstructionUnits` が使う construction outcome projection の語彙**であって、fanout 母集団が読む口ではない。母集団側（`amadeus-orchestrate.ts:2522`）は `readUnitPoolEventSetsFromAudit` 経由で `UNIT_POOL_EVENT_SET_COMMITTED` **のみ**を読む（`amadeus-unit-pool-runtime.ts:122-141`）。また配列に「ruling 系」イベントは無く、ruling の結果は `BOLT_COMPLETED` または pool event set として届く。この読み口の差が本件の機序そのもの（下記） |
| C6: per-unit 経路で cancel された unit は settle 行を持たず `producer-outcome-pending` が残りうる | CONFIRMED | 静的連鎖 + seam 再現（下記「再現・コード実読」）。`declaredUnits` は `loadRuntimeUnitRows` 由来で cancelled を除外しない（`amadeus-orchestrate.ts:2518-2521`）一方、outcome 行は付かないため `amadeus-per-unit-consume-fanout.ts:224-228` の pending 述語（`outcome === undefined`）に該当する |
| C7: `docs/guide/15-troubleshooting.md` に既知の限界として明記済み | CONFIRMED | 同ファイル `:143`（対訳 `docs/guide/15-troubleshooting.ja.md:143`） |
| C8（仮説）: skip 裁定では pool イベントが書かれ fanout が terminal を読めるため、実発火面は「failure ruling を経ない cancel」に限られる | CONTRADICTED | per-unit（= solo）経路の skip 裁定は `amadeus-orchestrate.ts:6767-6781` の **solo アーム**に落ち、pool ではなく `BOLT_COMPLETED`（`Outcome: "cancelled"`, `Batch Id: solo:<n>:<unit>`）を書く。これは pool event set ではないため母集団に見えない。さらに solo batch id は非数値で、母集団の数値 batch join（`:2527` `foldUnitPoolEventSets(eventSets, String(index + 1))`）に構造的に載らない。**skip 裁定そのものが発火条件**であり、発火面は本文の想定より広い |
| C9: `handleFailureRuling`（orchestrate.ts:6586） | 行移動 | 凍結SHAでは `packages/framework/core/tools/amadeus-orchestrate.ts:6733`。`:6586` は裁定記録 `…-fix-method/record.md:18` が当時の pool writer 呼出点として引いた行番号で、現断面には対応しない |
| C10: 重大度根拠「回復手順は #3105 の docs 節が適用可能」 | CONTRADICTED | 引用先の当該段落自身が逆を述べている。`docs/guide/15-troubleshooting.md:143` 逐語「a batch containing a cancelled Unit still reports `producer-outcome-pending` for that Unit **after the steps above**」。すなわち文書化された回復手順は cancelled unit には効かない |
| C11: 種別 bug / 優先度 P3 / 重大度 S3-MAJOR | 種別 CONFIRMED、S3 REFINED、P3 は判断事項 | 下記「機序・影響・ラベル」 |

### 再現・コード実読

**静的連鎖（実読、凍結SHA）**

1. `settlePerUnitOutcomes` が cancelled unit を除外 — `amadeus-orchestrate.ts:4706`。
2. `readPerUnitConsumePopulation` の `declaredUnits` は `bolt_dag.units` 全行から作られ、cancel の有無で絞られない — `:2516-2521`。
3. 同関数の outcome 行は (a) pool event set の terminal（`:2529-2537`）と (b) settle 行（`:2548-2553`）のみ。cancelled な per-unit unit はどちらも持たない。
4. `amadeus-per-unit-consume-fanout.ts:224-228` が「行が無い unit」を pending として throw。
5. throw は `runEngineMain` の最終境界（`amadeus-orchestrate.ts:7238-7249`）で `console.error` + `exit(1)` になる。既存の統合テストが同じ表面を固定している（`tests/integration/t533-per-unit-consume-fanout.integration.test.ts:435` `expect(result.stderr).toContain("producer-outcome-pending")`）。

**seam 再現（リポジトリ外の scratch、書込みなし）**

`resolvePerUnitConsumeFanout` に、per-unit 経路で cancelled unit が生じた断面と同じ母集団（`declaredUnits: ["unit-a","unit-b"]`、outcome 行は `unit-a: succeeded` のみ）を与えた結果（`bun` 実行、exit 0）:

```
A(cancelled unit has NO row: today's per-unit route) => THROW code=producer-outcome-pending units=["unit-b"]
B(cancelled recorded explicitly)                     => OK paths=["construction/unit-a/code-generation/code-summary.md"]
C(pool route: cancelled terminal present)            => OK paths=["construction/unit-a/code-generation/code-summary.md"]
```

B/C は対照実験で、**`cancelled` を明示的に1行記録すれば fanout はそのまま通り、当該 unit の path も正しく除外される**ことを示す。`KNOWN_OUTCOMES`（`amadeus-per-unit-consume-fanout.ts:199`）は既に `cancelled` を受理するため、読み口の変更は不要で、修正は emitter 側に閉じる。

**currentness**: `git log --oneline --since=2026-08-15 -- packages/framework/core/tools/amadeus-orchestrate.ts packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts packages/framework/core/tools/amadeus-construction-outcome-projection.ts docs/guide/15-troubleshooting.md` は4件を返すが、`git blame -L 4703,4719` は settle 本体の全行が `b9615ffb891`（2026-08-15、#3105）のままであることを示す。起票後に前提を変える着地は無い。

### 機序・影響・ラベル

**機序（確定）**: 同一の「cancel された」という事実を、2つの読み口が別々の語彙で読む。`cancelledConstructionUnits`（`:3934-3946`）は 5 イベントを受理する construction outcome projection を使うため cancel を**見て** settle を抑止する。一方 fanout 母集団は `UNIT_POOL_EVENT_SET_COMMITTED` だけを読むため cancel を**見ない**。結果、抑止だけが効いて記録が残らず、母集団に穴が空く。per-unit 経路には pool が無いので、この穴は原理的に埋まらない。

**発火面（本文より広い）**: 裁定記録 `…-fix-method/record.md:19` の subagent-2 留保が逐語「solo:\<n\>:\<unit\> 形式の非数値 id を持ち込むと batch join が退化する」と予見していたとおり、per-unit=solo 経路の skip 裁定（`:6767-6781`）が書く `BOLT_COMPLETED` は数値 batch join に載らない。したがって「failure ruling を経ない cancel」に限られるという本文の仮説は成立せず、**文書化された skip 裁定という正規手順そのものが発火経路**である。

**影響**: cancelled unit を含む per-unit 経路の Construction 完了後、per-unit producer への required consume を持つ下流 stage（`code-generation` の下流では `build-and-test` と `ci-pipeline`。`amadeus-per-unit-consume-fanout.ts:90-93`）の directive が構築できず、`next` が exit 1 で停止する。当該 stage 自身は cancelled を covered 扱いで反復を終えてゲートまで進む（`:4840`、`:3923-3927`）ため、**「Construction は承認まで完了したのに次段が動かない」**という #3099 と同じ症状に戻る。

**ラベル評価**（`.github/ISSUE_TEMPLATE/bug.yml` 定義に対して）
- 種別 `bug`: 妥当。完了条件は既存の合意済み契約（dispatch と outcome 台帳の一致）の回復であって新契約の追加ではない。
- 重大度 `S3-MAJOR`: 結論は「限定条件でのみ発現」の側面で支持できるが、**根拠の後半（回復手順が適用可能）は C10 のとおり誤り**。文書化された回避策は存在しない。私が実読で見つけた唯一の抜け道は、同一 (intent, stage, unit, batch) で `BOLT_STARTED` を再発行して terminal を消す経路（`amadeus-construction-outcome-projection.ts:190-192` の `currentTerminalKey` は attempt を含まないため、`:264` の delete が効く）だが、これは cancel を撤回して unit をやり直すことに等しく、cancel の目的を否定するため実質的な回避策ではない。定義上 S1 の「ワークフロー停止」と S3 の「限定条件でのみ発現」が同時に当たるため、`S2-CRITICAL`（回避策なし）への引上げも成り立つ。最終的な文字はトリアージの判断事項として起票者へ戻す。
- 優先度 `P3`: 判断事項。発火経路が例外的操作でなく正規の skip 裁定である点は、P3 より高く見る根拠になりうる。

### 訂正・未解決事項

1. C8 の仮説は成立しない。Issue の第一作業「pending 停止が実際に起きる条件を確定する」は、少なくとも **solo skip 裁定経由の cancel** について本レビューで確定した（静的連鎖 + seam 再現）。
2. C10 の重大度根拠は引用先文書と矛盾するため、修正が必要。
3. C2 の発行条件記述に batch 所属条件と `batches === null` 時の全面不発行が欠けている。
4. C5 の「pool 経路の canonical projection」は、cancel を見る読み口（construction outcome projection）と fanout 母集団が読む口（pool event set）が別物である点を明示しないと、修正方式の議論で読み口を取り違える恐れがある。
5. 私が実施していないこと: engine を実駆動する end-to-end の再現（`next` を cancelled unit 入りの実 record に対して回す）。私の確証は静的連鎖と fanout seam の直接実行までであり、e2e はもう1人のレビュアーのレンズに委ねる。
6. 方式は未裁定のまま。`cancelled` を記録する形（seam 実験 B）が読み口変更なしで成立することは示したが、どの形を採るかは選挙事項であり本レビューの範囲外。

### 同根・対称面

- **SR1（同根・未起票）**: per-unit 経路の **failed** unit も同じ穴に落ちる。`amadeus-orchestrate.ts:4127-4128` は設計意図を逐語「at a downstream consumer stage a failed producer is reported by the per-unit consume fan-out (`producer-outcome-failed`)」と述べるが、per-unit 経路では failed unit にも行が付かないため、実際には `producer-outcome-failed` ではなく `producer-outcome-pending` が出る。停止するという結果は同じだが、診断が原因を指さない。cancelled を記録する修正を設計する際は failed も同じ設計判断の対象に含めるべき。
- **SR2（同根・防御面）**: 母集団は `bolt_dag.units` から、発行資格は `bolt_dag.batches` から導かれるという非対称そのものが本欠陥のクラス。`loadRuntimeUnitBatches`（`:2178-2192`）は batch 要素が1つでも不正なら `null` を返し、その場合 `settlePerUnitOutcomes` は1行も発行せず（`:4696`）、母集団側は `?? []` で空 batches として全 unit を pending にする（`:2525`）。
- **SR3（実測の否定結果）**: `:4706` 第1選言（batch 未収載 unit）は、`computeBatches`（`packages/framework/core/tools/amadeus-lib.ts:8899-8916`）が全 unit を巡回的に分割し、循環時のみ `null` を返す契約のため、well-formed な compiled DAG では到達不能。すなわち本 Issue の発火面は cancel 系に正しく限定されており、この点で本文の scope 判断は妥当。
- **SR4（テスト被覆の穴）**: `tests/unit/t533-per-unit-consume-fanout.test.ts` と同 integration の cancelled ケースは、すべて pool 経由で terminal を植える形（`settleThroughPool`、integration `:395`, `:790`）であり、**per-unit settle 経路 × cancelled の組合せを固定するテストは存在しない**。修正時の落ちる実証はこの組合せに置くのが自然。

### 後続検証者向けメモ

- 引用行の再解決は必須。本 Issue の `orchestrate.ts:6586` は裁定記録から引き継がれた行番号で、凍結SHAでは `:6733`。一方 `amadeus-construction-outcome-projection.ts:222-228` は現断面でも正確だった。
- 本件を読むときは「cancel を見る読み口」と「outcome を読む読み口」を必ず分けて追うこと。同じ `cancelled` という語が、`normalizeConstructionOutcomeAudit`（5 イベント受理）と pool event set（1 イベント）の2つの語彙に跨がっており、片方だけを見ると機序を取り違える。
- solo 経路の batch identity は `solo:<n>:<unit>`（`packages/framework/core/tools/amadeus-bolt.ts:257`, `:579`）で非数値。数値 batch join を前提とする読み口（`:2527`, `:4139-4141`, `:4157`）との噛み合わせは、この系統の欠陥を探す際の第一の検査軸になる。
- 修正方式を議論する前に `amadeus-per-unit-consume-fanout.ts:199` の `KNOWN_OUTCOMES` を確認すること。`cancelled` は既に受理語彙にあるため、読み口を触る必要はない。

### Verdict

**CONFIRMED_WITH_REFINEMENTS** — 中核の欠陥（per-unit 経路の cancelled unit が settle 行を持たず、下流 consumer が `producer-outcome-pending` で停止する）は静的連鎖と seam 再現の両方で確認した。ただし本文の仮説（skip 裁定なら pool イベントが救う）は成立せず、発火面は正規の skip 裁定を含むぶん本文の想定より広い。あわせて重大度の根拠が引用先 docs と矛盾しており、発行条件の記述にも欠落がある。上記の訂正を本文へ反映することを推奨する。

本 verdict は実在確認であり実装着手・優先順位・クローズの承認ではありません。


### その他コメント(verbatim、任意)

(なし)
