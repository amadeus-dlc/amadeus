# Investigation Log — U-5 audit-sink-investigation(#3032 / FR-5)

測定 ref: 本 worktree HEAD `a49f9e9fdbd19fd40e9374feba77e9360771d173`。
再現環境: `/private/tmp/claude-501/-Users-j5ik2o-orca-workspaces-amadeus-bugfix-0815-2/eff7cc55-1ce3-4049-a029-c9679e434649/scratchpad/u5-repro/`(repo 外 scratch。ドライバ `driver2.ts` / `driver-wip.ts`、出力 `out/current2.json` / `out/wip.json`)。

**結論: 機序は確定した。ただし現行バイト・当時の着地コミット双方に欠陥は存在せず、原因は main へ着地しなかった作業中(WIP)のバイトである。** Issue #3032 が立てた「OTel per-process ワークスペースピンが宛先を決めている」という仮説は**反証**された。

---

## 1. Step 1 — 当時断面の特定

着地2行の `timestamp` は 2 行とも `2026-08-07T11:20:09Z`(= 20:20:09 JST)。

取得コマンド: `TZ=UTC git log --since=2026-08-07T09:00:00Z --until=2026-08-07T13:00:00Z --format='%H %cI %s' --all`(対象: 全 ref。除外条件なし)。**出力 5 行・exit 0**(件数は `grep -c ''` で転記)。以下は出力の全数であり、`%cI` は commit 自身の TZ で出るため生の値(+09:00)をそのまま載せる。UTC 列は `+09:00` から 9 時間を引いた**派生値**である。

| commit | 生の `%cI` 出力 | UTC(派生) | subject(生の出力) |
| --- | --- | --- | --- |
| `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b` | 2026-08-07T21:49:33+09:00 | 12:49:33Z | chore(record): sync 260807-projectdir-worktree-fix workflow record (completed) (#2416) |
| `6b3dbca725a232d0c7bfd3caaf8091b60b455695` | 2026-08-07T21:48:52+09:00 | 12:48:52Z | fix: add a cwd workspace-marker rung to resolveProjectDir below the env rung (#2413) |
| `b9aaf6e139e04c0ca92e4d03c681fa5d87e8552a` | 2026-08-07T21:44:19+09:00 | 12:44:19Z | chore(record): sync 260807-projectdir-worktree-fix workflow record (completed) |
| `d4f0513c531bc8af75c26435f693def5e0316f16` | 2026-08-07T20:47:53+09:00 | 11:47:53Z | fix: add a cwd workspace-marker rung to resolveProjectDir below the env rung |
| `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0` | 2026-08-07T18:24:51+09:00 | 09:24:51Z | chore(record): sync 260807-failclosed-recovery-path workflow record (completed) (#2404) |

内訳: 5 件のうち `5f2ad9195` / `6b3dbca72` / `4a3da7d62` の 3 件が main 上の squash コミット、`b9aaf6e13` / `d4f0513c5` の 2 件は squash 前のブランチコミット(`--all` が拾う。`6b3dbca72` / `5f2ad9195` の squash 元)。

着地時刻 11:20:09Z は、この 5 件のうち直前の `4a3da7d62`(09:24:51Z)と直後の `d4f0513c5`(11:47:53Z)の**間**にある。すなわち **PR #2413(intent `260807-projectdir-worktree-fix`)の実装作業のさなか**であり、ブランチコミット `d4f0513c5` の 27 分前である。

着地2行の逐語(`sed -n '155,156p' amadeus/spaces/default/intents/260807-projectdir-worktree-fix/audit/j5ik2o-mac-studio-lan-d13e4f0ca2c0.jsonl`):

- `seq:155` `attributes: {Command:"", Error:"seam: something went wrong", Event:"ERROR_LOGGED", Tool:"amadeus-orchestrate"}`, `intentId:"260807-projectdir-worktree-fix"`, `cloneId:"d13e4f0ca2c0"`
- `seq:156` 同上、`Error:"seam: no state"`

当時の `tests/unit/t214-engine-error-logged-seam.test.ts`(`git show d4f0513c5:...`)は `recordEngineError` を駆動するテストを 3 件持つ。**このうち env 段のみに依存するのは 2 件だけ**である。

| t214 のテスト | project dir の与え方 | 依存する段 |
| --- | --- | --- |
| #1 `seam: something went wrong` | `process.env.CLAUDE_PROJECT_DIR = proj` | 段2(env) |
| #2 `seam: argv project-dir` | env を delete し `process.argv` に `--project-dir proj` | 段1(explicit) |
| #3 `seam: no state` | `process.env.CLAUDE_PROJECT_DIR = proj`(record は削除済み) | 段2(env) |

**着地したのは #1 と #3 のちょうど 2 件、#2 は着地していない。**

不在の反証確認(再実測。本ログ自身が needle を含むため**本 intent の record ディレクトリを除外**する — 除外なしでは本ログと `code-summary.md` の 2 ファイルにヒットして再導出できない):

- 述語 `grep -rn --exclude-dir=260814-open-bug-batch-6 "seam: argv project-dir" amadeus/spaces/default/intents/` → 出力 **0 行・exit 1**
- 対照(同形・同除外) `grep -rn --exclude-dir=260814-open-bug-batch-6 "seam: no state" amadeus/spaces/default/intents/` → **1 行・exit 0**(`…/260807-projectdir-worktree-fix/audit/j5ik2o-mac-studio-lan-d13e4f0ca2c0.jsonl:156`)

対象集合は `amadeus/spaces/default/intents/` 配下の全ファイル、除外条件は `--exclude-dir=260814-open-bug-batch-6`(本 intent の record ディレクトリ = 本ログと `code-summary.md` の所在)。この選択性が「段2(env)だけが破れていた」ことを指す。

## 2. 一次証拠 — 当時の WIP 段順(文書証拠)

PR #2413 本文の逐語(取得コマンド: `gh pr view 2413 --json body -q .body | grep -n "marker 段より"` → 1 行・`:8`)。以下は原文どおりで、全角括弧・強調記号を改変していない:

> - `CLAUDE_PROJECT_DIR` は marker 段より**上**を維持 — 「cwd と別の workspace を指す」のが env の文書化された契約であり、既存テスト fixture が広く依存（当初「env より上」で実装したところ state 系テストの隔離 seam が破れ実 record 汚染が発生 → ソロ選挙 E-PWF-CGDEV2 で 2-0 再裁定。intent record の選挙記録参照）

選挙記録 `amadeus/spaces/default/elections/260807-e-pwf-cgdev2/record.md` の question 逐語(抜粋。`…` は本ログでの中略を示し、それ以外は原文どおり):

> 実測インシデント: builder が marker 段を env 段の上に実装して検証を実行したところ、既存テスト群（state 系）の隔離 seam が破れた — それらのテストは CLAUDE_PROJECT_DIR=<temp fixture> を設定し cwd=repo（worktree root、marker 保有）で state ツールを spawn するため、新段が env を上書きして書込が実 record へ流れた。実害: 実 worktree の amadeus-state.md（…）、memory/team.md（…）、memory/project.md（…）、audit へ rogue イベント多数（PRACTICES_AFFIRMED 12件・別 grant mint 含む）。conductor が前進修復済み（team.md 復元・project.md 汚染行除去・state フィールド復旧・audit は append-only のまま保持）

同記録の票タイムラインは「配信 2026-08-07T11:31:17Z → … → 開票 2026-08-07T11:35:19Z」。**着地2行(11:20:09Z)は、この選挙が開かれる 11 分前**にあたる。したがって着地2行は、選挙記録がすでに「audit へ rogue イベント多数」と記していた当該インシデントの残渣そのものである。

## 3. Step 2-3 — scratch 再現(実測)

repo 外 scratch に workspace A(「実 record」役)と workspace B(fixture 役)を作り、cwd を marker を持たない scratch dir、`TMPDIR` を scratch に固定して駆動した。本 repo の record・監査シャードへの書込はゼロ(§5 で機械確認)。

### 3.1 現行バイト(`dist/claude` @ HEAD `a49f9e9f`)— `out/current2.json`

| シナリオ | 結果 |
| --- | --- |
| S1: A を先に OTel ピン(A に 1 行着地)→ env=B で `recordEngineError` | 呼出時の解決先 = **B**。最終 A=1 / B=0、needle は A・B とも **0 行** → **どこにも書かれない** |
| S2: 同上、B の record を削除 | 例外送出なし(`threw:false`)、A=1 / B=0、needle 0 行 |
| S3: cwd を A(marker 保有)、env=B | 解決先 = **B**、B へ 1 行着地、A は 0 行 → env 段が marker 段より上であることの実測 pin |
| S5: cwd=A、env なし、argv `--project-dir=B` | B へ 1 行、A は 0 行 |

S1・S2 は RE §2.5 の経路読解どおりの結果である。`assertSameProject` の throw を `recordEngineError` の `catch {}` が握り潰すため、**別 workspace へ流れるのではなく行が消える**。すなわち **Issue の OTel ピン仮説は現行バイトで成立しない**。

### 3.2 WIP 段順バイト(scratch 複製 + 段順反転)— `out/wip.json`

`dist/claude` を scratch へ複製し、`.claude/tools/amadeus-lib.ts` の `resolveProjectDir` で marker 段を env 段の**上**へ移した(§2 が記す当時の実装形)。cwd を A(marker 保有・state あり)に置き、t214 の 3 テストを env/argv の形まで逐語で再現した。

| ケース | 解決先 | A(実 record 役) | B(fixture 役) |
| --- | --- | --- | --- |
| t214 #1 env=B、state あり | **A** | `seam: something went wrong` **1 行着地** | 0 行 |
| t214 #2 argv `--project-dir=B` | (段1) | 0 行 | `seam: argv project-dir` 1 行 |
| t214 #3 env=B、B の record 削除 | **A** | `seam: no state` **1 行着地** | 0 行 |

A に着地した 2 行の逐語(`out/wip.json` の `A_landedRows`):

```
{"schemaVersion":2,…,"seq":1,…,"attributes":{"Command":"","Error":"seam: something went wrong","Event":"ERROR_LOGGED","Tool":"amadeus-orchestrate"},…}
{"schemaVersion":2,…,"seq":2,…,"attributes":{"Command":"","Error":"seam: no state","Event":"ERROR_LOGGED","Tool":"amadeus-orchestrate"},…}
```

観測された着地2行(§1)と、**属性 4 種・順序・連番・同一秒**まで一致する。t214 #2 が着地しない点も一致する。

## 4. Step 4 — 機序判定

**機序(確定)**: 2026-08-07 の PR #2413 実装中、`resolveProjectDir`(`packages/framework/core/tools/amadeus-lib.ts`)の cwd workspace-marker 段が `CLAUDE_PROJECT_DIR` 段の**上**に置かれた WIP バイトが存在した。この段順では、cwd が marker を持つ実 worktree にあり env を fixture へ向けているテスト(t214 #1・#3)で `resolveProjectDir` が**実 workspace を返す**。結果として:

1. `recordEngineError` の `existsSync(stateFilePath(pd))` ガードは実 workspace の state を見るため通過する(#3 の「record を消したのに書かれた」が説明できる)
2. `emitErrorAuditRow` → `emitAuditEvent` → `ensureOtelBootstrap(pd)` は**同一 workspace** で呼ばれるため `assertSameProject` は throw しない
3. 行は実 record の監査シャードへ静かに追記される

該当行(現行バイト):
- `packages/framework/core/tools/amadeus-lib.ts:232-270` `resolveProjectDir`(現行は段1 explicit → 段2 env → 段3 marker → 段4 script-path → 段5 cwd-harness。`:236-240` のコメントが env を marker の上に置く理由を明記)
- `packages/framework/core/tools/amadeus-orchestrate.ts` `recordEngineError`(state 不在ガードと `catch {}`)

**Issue の仮説の帰結**: OTel の per-process ピンは宛先を決めていない。ピンは `assertSameProject` による**不一致の検出器**であり、不一致時の効果は「別 workspace への着地」ではなく「行の消失」(S1・S2 の実測)。宛先は一貫して `resolveProjectDir` の解決結果である。

**現行バイトへの残存欠陥**: なし。段順は PR #2413 の裁定(選挙 E-PWF-CGDEV2、2-0)どおり env が marker の上に確定しており、S3 でその pin を実測した。

**WIP バイトはどのコミットにも着地していない**(実測)。§1 の 5 件すべてについて `resolveProjectDir` 本体の段順を実測した。述語: `git show <sha>:packages/framework/core/tools/amadeus-lib.ts | awk '/^export function resolveProjectDir\(/,/^}/' | grep -n "CLAUDE_PROJECT_DIR)\|findWorkspaceMarkerAncestor(process.cwd())"`(関数本体に限定して 2 段の出現行番号を取る)。

| commit | env 段の相対行 | marker 段の相対行 | 段順 |
| --- | --- | --- | --- |
| `4a3da7d62` | 6 | (出現なし) | marker 段そのものが未導入 |
| `d4f0513c5` | 10 | 19 | env が上 |
| `b9aaf6e13` | 6 | (出現なし) | marker 段そのものが未導入 |
| `6b3dbca72` | 10 | 19 | env が上 |
| `5f2ad9195` | 10 | 19 | env が上 |

5 件のいずれにも「marker 段が env 段より上」の形は現れない。したがって当該バイトは作業ツリー上にのみ存在した WIP であり、コミットされていない。

## 5. 実 record 無汚染の機械確認

**述語の自己参照について**: 本ログと `code-summary.md` は調査で用いた needle 文字列そのものを本文に含むため、除外条件のない述語は**自分自身にヒットして再導出できない**。実測(除外なし `grep -rl <needle> amadeus/spaces/default/`): `"seam: argv project-dir"` → 2 ファイル(本ログ + `code-summary.md`)、`"probe: pin A"` → 1 ファイル(本ログ)、`"seam: cwd-marker-A env-B"` → 1 ファイル(本ログ)。以下はすべて**本 intent の record ディレクトリを除外して再実行した確定値**である。

- 共通の除外条件: `--exclude-dir=260814-open-bug-batch-6`(本 intent の record ディレクトリ = 本ログと `code-summary.md` の所在)
- 着地シャード `amadeus/spaces/default/intents/260807-projectdir-worktree-fix/audit/j5ik2o-mac-studio-lan-d13e4f0ca2c0.jsonl` の行数は調査前後とも **393 行**(`grep -c "" <path>`。単一ファイル指定のため自己参照なし)
- `grep -rn --exclude-dir=260814-open-bug-batch-6 "seam: something went wrong" amadeus/spaces/default/intents/` → **1 行・exit 0**(上記シャード `:155`)
- `grep -rn --exclude-dir=260814-open-bug-batch-6 "seam: no state" amadeus/spaces/default/intents/` → **1 行・exit 0**(同シャード `:156`)
- `grep -rn --exclude-dir=260814-open-bug-batch-6 "probe: pin A" amadeus/spaces/default/` → **0 行・exit 1**
- `grep -rn --exclude-dir=260814-open-bug-batch-6 "seam: cwd-marker-A env-B" amadeus/spaces/default/` → **0 行・exit 1**
- `grep -rn --exclude-dir=260814-open-bug-batch-6 "seam: argv project-dir" amadeus/spaces/default/intents/` → **0 行・exit 1**
- `git status --porcelain -- amadeus/spaces/default/intents/260807-projectdir-worktree-fix/` → **0 行**(着地シャードを含む当該 record に差分なし)
- 全再現は `TMPDIR` を scratch へ、cwd を marker 非保有の scratch dir へ固定して実行した

## 6. Step 6 — Issue #3032 のクローズ提案と申し送り

Issue の完了条件は 3 つあり、本調査は **条件1(機序の実測特定)を満たして閉じる**経路をとる。条件2(是正+回帰テスト)は、機序が main へ着地しなかった WIP バイトに帰属する以上、**是正対象のコードが存在しない**ため適用されない。条件3(再現しない場合のクローズ)は前提が異なる — 再現は成立した。

### 6.1 クローズ提案文面(案)

> **機序を実測特定したためクローズを提案する(条件1の充足)。仮説の OTel per-process ピンは反証された。**
>
> **確定した機序**: 着地2行(2026-08-07T11:20:09Z)は、同日の PR #2413(`resolveProjectDir` に cwd workspace-marker 段を追加)の**実装作業中に一時的に存在した WIP バイト**によるものである。その WIP では marker 段が `CLAUDE_PROJECT_DIR` 段の**上**に置かれており、cwd が marker を持つ実 worktree にあり env を fixture へ向ける t214 のテストで `resolveProjectDir` が実 workspace を返した。state 不在ガードは実 workspace の state を見るため通過し、`assertSameProject` も同一 workspace のため throw せず、行が実 record へ静かに追記された。
>
> **一次証拠**: (a) PR #2413 本文の逐語「当初「env より上」で実装したところ state 系テストの隔離 seam が破れ実 record 汚染が発生」 (b) 選挙記録 `amadeus/spaces/default/elections/260807-e-pwf-cgdev2/record.md`(配信 2026-08-07T11:31:17Z — 着地の 11 分後)が同インシデントを「audit へ rogue イベント多数」と記載し、audit は append-only のまま保持したと明記 (c) repo 外 scratch で段順を反転した複製バイトを駆動し、着地2行を属性 4 種・順序・連番・同一秒まで一致させて再現(t214 の argv ケースが着地しない選択性も一致)
>
> **OTel ピン仮説の反証**: 現行バイトで「A を先にピン → env を B へ向けて `recordEngineError`」を実測すると、行は B にも A にも書かれない(`assertSameProject` の throw を `catch {}` が握り潰す)。ピンは宛先の決定器ではなく不一致の検出器であり、不一致の効果は別 workspace への着地ではなく行の消失である。
>
> **現行バイトへの残存欠陥はない**: 段順は選挙 E-PWF-CGDEV2(2-0)の裁定どおり env が marker の上に確定しており、cwd=marker 保有 / env=別 workspace のケースで env が勝つことを実測 pin した。
>
> 実測ログ: `amadeus/spaces/default/intents/260814-open-bug-batch-6/construction/audit-sink-investigation/code-generation/investigation-log.md`

### 6.2 既着地2行の revert 要否 — 推奨: **revert しない**

根拠:

1. **監査は append-only**。org/team ノルムは監査シャードを append-only とし、誤りの回復は履歴 rewrite ではなく人間承認付きの通常 revert によると定めるが、本件はツールの誤書込ではなく**当時実際に発生した実行の記録**である。行を消すことは、当時 rogue イベントが実 record へ流れたという事実そのものを消す
2. **同一インシデントについて 2026-08-07 時点ですでに裁定済み**。選挙記録は「conductor が前進修復済み(team.md 復元・project.md 汚染行除去・state フィールド復旧・**audit は append-only のまま保持**)」と記す。本件2行だけを今になって除去すると、その裁定と不整合になる
3. **除去のコストと risk が便益を上回る**。当該シャードは PR #2416 で main へ着地済みであり、除去には履歴に触れる変更と全 intent 監査の再検証が要る。一方 2 行の実害は監査純度の説明可能性のみで、本ログとクローズコメントが provenance を与えることで解消する

代替として推奨するのは、**provenance の記録**(本ログ + Issue クローズコメント)による説明可能性の回復である。

### 6.3 申し送り(本 intent のスコープ外)

- **不一致時の無音ドロップ**: 現行バイトでは、OTel が別 workspace にピン済みの状態で監査行を emit しようとすると、行は `catch {}` に握り潰されて**無音で消える**(S1・S2 の実測)。Issue の完了条件2が求める「loud fail または no-op」のうち no-op には該当するが、可観測性はゼロである。エラーパス上の握り潰しは意図された契約(元エラーを隠さないため)なので本 intent では変更しないが、in-process 駆動の監査欠落を観測したい場合は別 Issue の主題になりうる
- 本調査ではソースコードを一切変更していない(変更ファイル 0 件)
