# re-scan 記録 — 260814-t99-copytree-race

## メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-14` |
| Intent | `260814-t99-copytree-race`（scope `self-fix`、depth `Minimal`） |
| Base commit | `5f6b5bf97068f59dee53dcd4a2f6564967c3d164` |
| Observed commit | `5b12d96e99cbf46711acd3dc2b8c103be1b0f801`（= 本 worktree HEAD = `origin/main`） |
| Focus | [Issue #3003](https://github.com/amadeus-dlc/amadeus/issues/3003)（`copyTreeWithRetry` のリトライが dest 汚染下で 3/3 必ず count mismatch し、リトライ構造が構造的に無効化される）+ `base..observed` 差分全域 |
| Scan mode | **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`） |
| 書込範囲 | `codekb/amadeus/` 配下のみ（コード・テスト・state・audit・git 状態の変更ゼロ） |

### base 選定根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` が記録する全 observed のうち、**HEAD の祖先で距離最小**のものを選んだ（`cid:reverse-engineering:rescan-base-ancestry`）。

| 候補 | `git merge-base --is-ancestor <c> HEAD` | `git rev-list --count <c>..HEAD` |
|---|---|---|
| `89532174c`（260813-lifecycle-guard-runtime） | exit 0 | 18（`git rev-list --count 89532174c..HEAD`） |
| **`5f6b5bf97`（260814-fmc-macos-provider / t245 / t528）** | exit 0 | **9**（最小 → 採用） |

取得コマンド: `git merge-base --is-ancestor 5f6b5bf97 HEAD; echo $?` → `0` / `git rev-list --count 5f6b5bf97..HEAD` → `9`。

### observed 選定根拠

`git rev-parse HEAD` = `5b12d96e99cbf46711acd3dc2b8c103be1b0f801`。`origin/main` 系譜のコミットであり、ローカル merge コミットではない（`cid:reverse-engineering:c2-observed-mainline-commit`）。

### scan mode と行番号引用の currency

クロスレビュー run `xrev-260814-3003`（2 名成立: reviewer-1 / reviewer-2 とも `CONFIRMED_WITH_REFINEMENTS`、収束 `ESTABLISHED_WITH_REFINEMENTS`）。verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化した。

currency 根拠（**実測の記録であり免除の主張ではない**）:

- `git diff --name-only 5f6b5bf97..HEAD` = **151 ファイル**。うち `tests/` 配下は **7 件**（下表）。
- 患部 2 面（`tests/harness/fixtures.ts` / `tests/integration/t99-learnings-gate-flow.test.ts`）および専用テスト `tests/integration/t-fixtures-copy-tree-retry.integration.test.ts` は**この 151 件に含まれない** — `git diff --name-only 5f6b5bf97..HEAD -- tests/harness/fixtures.ts tests/integration/t-fixtures-copy-tree-retry.integration.test.ts tests/integration/t99-learnings-gate-flow.test.ts` が **空出力（rc=0）**。被引用パス集合との交差ゼロ（`cid:reverse-engineering:E-XBB-RE-S13-c2`）。
- **表現形式の移行検査**（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）: 区間の `tests/` 変更は formal-verif 系 3 件・t245・t528・coverage allowlist のみで、`CopyTreeOps` の型定義、診断ブロックの書式、免除セレクタの様式のいずれも変えていない → c5 の構造的不成立条件には該当しない。したがって xrev verdict の行番号は observed でそのまま解決する。

## 述語一覧（再実行可能。すべて worktree ルート、observed = `5b12d96e9`）

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git rev-parse HEAD` / `git rev-parse origin/main` | 両方 `5b12d96e99cbf46711acd3dc2b8c103be1b0f801` |
| P1 | `git rev-list --count 5f6b5bf97..HEAD` | **9** |
| P2 | `git diff --name-only 5f6b5bf97..HEAD \| wc -l` | **151** |
| P3 | `git diff --name-only 5f6b5bf97..HEAD -- tests/` | **7 件**（下記 §差分区間） |
| P4 | `git diff --name-only 5f6b5bf97..HEAD \| grep -E "fixtures.ts\|t99-learnings"` | **空出力 rc=1**（患部は区間内無変更） |
| P5 | `git grep -n "copyTreeWithRetry(" -- tests/ \| wc -l` | **16 hit** = 定義行 `fixtures.ts:633` 1 + 本番呼出 **6 件** + 専用テスト `t-fixtures-copy-tree-retry.integration.test.ts` 内 9 呼出（`:47` `:69` `:85` `:102` `:118` `:137` `:168` `:187` `:237`） |
| P6 | `git grep -n "ops\.exists" -- tests/harness/fixtures.ts` | **1 hit**（`:580` = `removeTreeWithRetry` 内、型は `RemoveTreeOps`）。`copyTreeWithRetry` 本体 `:633-661` には**不在** |
| P7 | 未ガード素 `cpSync`（狭い述語、下記 P-A） | **19 サイト / 15 ファイル** |
| P8 | `git grep -c "cpSync(" -- 'tests/**' \| awk -F: '{s+=$2} END{print s}'` | **233**（`tests/` 全体の `cpSync(` 出現総数。コメント行を含む上限値） |
| P9 | `git grep -n "copyTreeWithRetry\|CopyTreeOps" -- plugins/ mise.toml` | **0 hit（rc=1）** — 差分区間の formal-verif 領域と患部の非交差 |

### P-A: 未ガード素 `cpSync` の述語（狭い定義）と、`awk \b` の罠

```
git grep -n "cpSync(" -- 'tests/**' \
  | grep -E "AMADEUS_SRC|AMADEUS_MEMORY_SRC|DIST_DIR|distDir|/dist|\"dist\"|'dist'"
```

- 生 hit **22 行** → コメント行 3 件（`fixtures.ts:602` / `tui-fixtures.ts:3` / `t-fixtures-copy-tree-retry.integration.test.ts:3`）を除外し **19 サイト / 15 ファイル**。
- 除外条件: `copyTreeWithRetry` 経由の 6 呼出はそもそも `cpSync(` を含まないため自動的に対象外。
- **注意（awk `\b` の罠）**: 同じ棚卸しを `awk '/\bcpSync\(/'` で行うと macOS の BSD awk は `\b` を単語境界として解釈せず、**無音で 0 件**を返す。実測: `awk 'BEGIN{ if ("cpSync(" ~ /\bcpSync\(/) print "b-supported"; else print "b-NOT-supported" }'` → `b-NOT-supported`。件数を出す述語は `git grep` 系で組み、`awk` へ正規表現判定を持ち込まない。

**件数の述語依存性（重要）**: Developer scan は別の（より広い）選択で **≈53 サイト / ≈25 ファイル**を報告した。本記録は自分が再実行できる P-A の値 **19 / 15** を採る。参考として、dest 側のハーネスディレクトリ名（`.claude` / `.codex` / `.kiro` / `.agents` / `.pi`）まで含む広い述語では **89 サイト / 41 ファイル**になる。**結論（ガード面 6 に対し未ガード面が大きく上回るという非対称）は 19 / 53 / 89 のいずれを採っても不変**であり、正確な件数は本 intent の判断に効かない。

## Developer scan の主要所見（observed 断面で verbatim 再確認済み）

### F1. 患部 — attempt ループに dest 消去経路が無い

`tests/harness/fixtures.ts:633-661`。ループ本体は `ops.copy(src, dest)` → `ops.count(src)` / `ops.count(dest)` → 等値なら return（`:642-644`）、不一致なら Error 合成（`:645-651`）+ 診断（`:652`）+ backoff（`:659`）。**dest を消す呼び出しは 1 つも無い**。

したがって dest が src の**真の上位集合**になると `destCount > srcCount` が固定され、attempt 2/3 も同一の不一致を再生産して必ず throw に到達する。リトライ回数を増やしても成功確率は上がらない。

姉妹関数 `removeTreeWithRetry`（`:574-590`）は post-condition が `!ops.exists(path)`（`:580`）で、`rm` が**冪等収束**するためリトライ構造が機能する。`copyTreeWithRetry` は同じ形をコピーしながら、`copy` が dest に対して**累積的（非冪等）**であるという差を吸収していない。

### F2. `CopyTreeOps` の 4 面に remove が無く、`exists` は本体未消費

`:617-623` — `copy` / `exists` / `sleep` / `count`。dest を消す面が無いため、F1 の修正は**契約自体の拡張**を要求する。

`CopyTreeOps.exists` は `copyTreeWithRetry` 本体から呼ばれていない（P6: `ops.exists` の唯一の hit `:580` は `RemoveTreeOps`（`:564-568`）側）。注入シームに宣言だけがあり本体が消費しない面であり、検証劇場の疑いがある（**FOLLOW-UP** — 本 intent の患部ではない）。

### F3. count mismatch は retryable 判定を通らない

`isRetryableCopyError`（`:663-666`）は `RETRYABLE_COPY_CODES`（`:600` = `ENOENT` / `EAGAIN` / `EMFILE` / `ENOMEM`）への所属を見るが、count mismatch は `catch` ではなく `try` 内で合成される `Error`（`:645-651`）であり、この関数を**経由しない**。結果として count mismatch は常にリトライされる。

`tests/integration/t-fixtures-copy-tree-retry.integration.test.ts:121-124` のコメントが「不一致自体が transient race でありうるので retryable と同じ扱いにする」と意図を述べており挙動としては整合するが、**恒久的な不一致（F1）と transient な不一致を区別する述語が存在しない**。

### F4. 診断が src 側のみで dest 件数を出さない

`reportCopyTreeFailure`（`:677-701`）の出力は `error.code` / `error.syscall` / `error.path` / `error.message` / `src exists` / `src top-level entries` / `src recursive file count (post-failure re-scan)` / `dest parent exists` / `TMPDIR`。**dest 自体の件数・内容は 1 行も無い**（`:686-698`）。F1 の機序はこの診断ブロックから原理的に読み取れない。診断は #2397 の「bun が path を落とす ENOENT」に照準しており、count mismatch 経路には照準していない。

### F5. post-condition の設計意図が 2 箇所で明言されている

- `:614-616`（verbatim）:
  > `// post-condition (dest's recursive file count == src's), never by cpSync`
  > `// returning without throwing: a partial copy that happens not to throw`
  > `// would otherwise pass silently.`
- `:716-718`（verbatim）:
  > `// Entry vanished between listing and stat (parallel-load race) — do`
  > `// not count it; countFilesRecursive is a post-condition check, and an`
  > `// undercount here correctly fails that check rather than masking it.`

**post-condition を等値から緩める修正（候補 D）は、この 2 つのコメントが宣言する設計意図の書き換えを伴う**。RE では裁定しない。

### F6. 呼出面の棚卸し — 本番 6 件、すべて dest 事前非存在（fresh 契約は未明文）

| # | 呼出面 |
|---|---|
| 1 | `tests/harness/fixtures.ts:769`（`setupIntegrationProject`、dest = `join(proj, ".claude")`） |
| 2 | `tests/harness/tui-fixtures.ts:181` |
| 3 | `tests/integration/t99-learnings-gate-flow.test.ts:128` |
| 4 | `tests/unit/t27.test.ts:257` |
| 5 | `tests/unit/t80.test.ts:163` |
| 6 | `tests/e2e/t-tui-statusline.serial.test.ts:67` |

6 サイトはいずれも `mkdtemp` 系で作った新規プロジェクト直下への初回コピーであり dest は事前非存在だが、**その fresh 契約は関数の doc・型・assert のいずれにも明文化されていない**（`:601-616` の doc コメントに dest 事前状態への言及なし）。

### F7. ガード面の非対称と、同一関数内の姉妹未ガード面

ガード面 6 件（F6）に対し、同じ dist 系ツリーを素 `cpSync` で読む未ガード面が **19 件 / 15 ファイル**（P-A）。特に `tests/harness/fixtures.ts:784`:

```
    cpSync(AMADEUS_MEMORY_SRC, join(proj, "amadeus"), { recursive: true });
```

は **`:769` のガード呼出と同一関数（`setupIntegrationProject`）内の直後にある姉妹面**でありながら素 `cpSync` である。`copyTreeWithRetry` は「危険な操作を一箇所に集約するガード」ではなく、特定サイトに貼られたパッチとして存在している。

### F8. 落ちる実証の立て所（既存シームで成立）

`tests/integration/t-fixtures-copy-tree-retry.integration.test.ts`:

- `opsRecorder`（`:21-42`）はオブジェクトリテラルで `CopyTreeOps` を実装しているため、**必須メンバを追加すると型エラーで全ケースが強制更新される**（F2 の契約拡張が無音で通らない）。
- count mismatch の既存ケースは `:107-127`（3/3 失敗、`count: (path) => (path === "/fake/src" ? 10 : 4)`）と `:129-139`（途中回復、`attempts < 2 ? 4 : 10`）の 2 本で、**いずれも dest < src 方向**。
- **dest > src 方向のケースは 0 本** → F1 の落ちる実証はここに 1 本立てれば成立する。

`tests/harness/fixtures.ts` は patch coverage の計測対象であるため新設分岐には driver が必須だが、注入シームがあるためコストは低い。

## 修正候補のトレードオフ（**裁定は requirements-analysis へ申し送り**）

Issue #3003 の完了条件は「dest 汚染下でもリトライが機能する / 失敗が診断可能になる」こと。観測から導ける方式は 4 系統で、いずれも設計意図（F5）または契約（F2）への影響が異なるため RE では選定しない。

| 候補 | 概要 | 得るもの | 失うもの・コスト |
|---|---|---|---|
| **A: attempt 毎に dest をクリア** | `CopyTreeOps` に `remove` を追加し、attempt 2 以降（または全 attempt）で dest を消してから copy | リトライが本来の意味を回復する（試行間で状態が変わる）。呼出 6 件すべて dest 事前非存在（F6）のため副作用なし | 契約拡張（F2）で専用テスト全ケースの型更新が必要。**残存リスク**: src が継続変異している場合は再被弾する |
| **B: src をスナップショット化** | 一度読み取った src の不変コピーを作り、そこから copy する | 根本原因（src の並行変異）に届く | depth `Minimal` に対して重い — プロセス境界・スナップショット掃除の設計が要る。`t-tui-statusline` の「README 記載手順の再現」という主張が変質する |
| **C: 診断を集合差分へ強化** | `reportCopyTreeFailure` を件数から list 化し、src/dest の集合差分を出す（F4 の是正） | 次回発生時の機序特定が可能になる。単独でも価値がある | **単独では症状を直さない**。診断出力量が増える |
| **D: post-condition を `src ⊆ dest` の包含へ** | 等値判定（`:644`）を包含判定に変える | コスト最小・患部直撃。dest 上位集合の正常系を通す | **F5 の設計意図（`:614-616`「partial copy が黙って通るのを防ぐ」/ `:716-718`「undercount は正しく赤にする」）の書き換えを要する裁定必須事項**。dest 側の余剰が常に無害である保証は無い |

実装上の現実解は **D 単独** または **A を本体 + C を補強**だが、いずれも上表の「失うもの」を requirements/design が明示的に受け入れる必要がある。

## `base..observed` 差分区間（患部外）

151 ファイル。`tests/` 配下は 7 件:

| ファイル | 由来テーマ |
|---|---|
| `tests/.coverage-patch-allowlist.json` | 免除台帳の更新 |
| `tests/integration/t-formal-verif-run-model-check.integration.test.ts` | formal-model-check の macOS provider（#2361 系） |
| `tests/integration/t-formal-verif-tlc-runtime.integration.test.ts` | 同上 |
| `tests/unit/t-formal-verif-tlc-spawn-planner.test.ts` | 同上 |
| `tests/unit/t-formal-verif-tlc-toolchain.test.ts` | 同上 |
| `tests/integration/t245-amadeus-leader-sync.integration.test.ts` | #2971（t245 の `origin` 環境前提） |
| `tests/integration/t528-report-ack-kind.integration.test.ts` | #2981（実行文脈依存） |

ほかに `mise.toml`、`plugins/formal-model-check` 系。

**非交差判定**（本 intent の焦点との衝突確認、task 2）: 差分区間の主要テーマである formal-verif 領域は、`git grep -n "copyTreeWithRetry\|CopyTreeOps" -- plugins/ mise.toml` が **0 hit（rc=1）**（P9）であり、呼出・型・データのいずれでも患部と交差しない。既存 codekb の formal-verif 記述は `260814-fmc-macos-provider` 節が正本として現行を記述しており、本スキャンでは**触れない**（重複記述による正本の二重化を避ける）。t245 / t528 も同様に、それぞれの intent の節が正本。

## 未実測・推測として明示する項目

- **UNMEASURED-1**: 実 CI 上での t99 count mismatch の再現は本スキャンでは行っていない。F1 は `:633-661` の制御フロー実読からの構造的導出（PROVEN）であり、「実際にどの並行テストが dest を汚染したか」の同定は**未実測**。
- **UNMEASURED-2**: 6 呼出面が「dest 事前非存在」であることは各呼出直前の `mkdtemp` 系呼び出しの静的読解に基づく。全経路の実行時 assert は行っていない。
- **UNMEASURED-3**: 未ガード面の件数は述語の広さに依存する（P-A の注記）。Developer scan の ≈53 という値は本記録の述語では再現していない。**非対称という結論は述語非依存だが、件数そのものを受け入れ基準に使ってはならない**。
- **UNMEASURED-4**: 候補 D を採った場合に「dest 側の余剰が常に無害か」は未検証。候補 A の残存リスク（src 継続変異での再被弾）の発生頻度も未測定。
- **UNMEASURED-5**: 差分区間 151 ファイルの分類はコミット単位の要約であり、各ファイルの実読は患部関連パスと非交差判定に限定した。

## 更新した成果物

- `code-quality-assessment.md` — 新現在節「リトライ構造が構造的に無効化される経路と、ガード面の非対称」（Q-A〜Q-F）。直前の現在節（`260814-fmc-macos-provider`）は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。
- `reverse-engineering-timestamp.md` — 本スキャンの実行メタデータを現在節として追記、直前を履歴へ降格。
- 本ファイル（新規）。

**Reviewed-and-unchanged artifacts**（沈黙のスキップではなく、レビュー済みで無変更）: `architecture.md` / `component-inventory.md` / `code-structure.md` / `api-documentation.md` / `business-overview.md` / `dependencies.md` / `technology-stack.md`。患部はテストハーネス内部のリトライ制御であり、構成要素間の関係・公開契約・依存・ランタイムのいずれにも変化がない。**この 7 面は本 intent の節を持たないため、後続ステージがここから本 intent の事実を引いてはならない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）。

## 適用範囲外（明示）

候補 A〜D の選定、`CopyTreeOps` 契約拡張の可否、post-condition の意味変更（F5 の設計意図の書き換え）、未ガード 19 面へのガード適用範囲、`CopyTreeOps.exists` の未消費（F2 の FOLLOW-UP）の是正時機は、いずれも requirements-analysis / application-design の所掌である。
