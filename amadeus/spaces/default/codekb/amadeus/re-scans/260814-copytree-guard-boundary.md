# Re-scan 記録: 260814-copytree-guard-boundary

対象 Issue: [#3014](https://github.com/amadeus-dlc/amadeus/issues/3014) — `copyTreeWithRetry` のガード適用境界が非対称であり、同一関数内の姉妹面が素 `cpSync` のまま残っている。

## 1. 測定 ref

| 項目 | 値 | 取得コマンド |
|---|---|---|
| Base commit | `5b12d96e99cbf46711acd3dc2b8c103be1b0f801` | 直近 re-scan `260814-t99-copytree-race` の observed（`reverse-engineering-timestamp.md` の全 observed のうち HEAD の祖先で距離最小） |
| Base 祖先性 | exit 0 | `git merge-base --is-ancestor 5b12d96e9 HEAD` |
| Base..HEAD 距離 | 3 commits | `git rev-list --count 5b12d96e9..HEAD` |
| Observed commit | `f60b3f4c868f3b7608a06f08393b8e2f10287fad` | `git rev-parse HEAD` |
| Scope / depth | `self-fix` / `Minimal` / Brownfield / 単一 repo / build `bun` | — |

**observed と `origin/main` の関係(実測、正直な記録)**: 本 scan 実行時点の `git rev-parse origin/main` は **`cd64486a68c6a1144db50fbe3fde8273f5e18455`** であり、observed(= worktree HEAD)より **2 commits 先行**する(`git log --oneline f60b3f4c8..cd64486a6` = `cd64486a6 docs(norms): make coverage-patch-quick the standard pre-push loop (#3019)` / `fb1939dfd chore(metrics): record snapshot ... (#3020)`)。`git merge-base HEAD origin/main` = `f60b3f4c8` すなわち observed は `origin/main` 系譜上のコミットであり、`cid:reverse-engineering:c2-observed-mainline-commit` を満たす。先行 2 件は norms 文書と metrics snapshot で、患部 2 ファイルを一切含まない(下記 §5 で実測)。

## 2. Scan mode と currency 根拠

**Scan mode: xrev differential scan**(`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`)— run `xrev-260814-3014`、クロスレビュー 2 名とも **CONFIRMED_WITH_REFINEMENTS**、収束 **ESTABLISHED_WITH_REFINEMENTS**。

**currency 根拠(実測)**: 本 intent の observed(`f60b3f4c8`)は **xrev が凍結した SHA と同一**である。したがって「xrev 断面 ≠ observed 断面」に起因する currency 劣化は構造的に発生しない(差分が空であることを示す必要すらなく、断面が同一)。

**表現形式の移行検査**(`cid:reverse-engineering:c5-xrev-currency-schema-migration`): review 断面と observed 断面が同一である以上、両断面の間に「患部の表現形式を変える移行」を挟む余地がない → c5 の構造的不成立条件に**該当しない**。

## 3. Focus

`copyTreeWithRetry`(`tests/harness/fixtures.ts`)が**ガード**として引かれている適用境界の非対称。#3003 の修正(#3015)でガード本体は dest-fresh 契約を得たが、**同じ dist 系ツリーを同一関数内で読む姉妹面が素 `cpSync` のまま**であり、ガードの適用原理がコード上に記録されていない。#3014 が申告するスコープは以下 3 系統:

- **(a)** ガード未適用の姉妹面への適用範囲拡大
- **(b)** dest-fresh 契約の明文化(doc / 型 / assert のどこに置くか)
- **(c)** `CopyTreeOps.exists` の未消費、および診断が ops を迂回して素の `fs` を直呼びする点

## 4. Developer scan 所見(Architect による observed 断面での逐語再照合)

以下の file:line はすべて Architect が observed `f60b3f4c8` で `sed` / `git grep` により再取得した。

### 4.1 患部座標

| 座標 | 内容 | verbatim(抜粋) |
|---|---|---|
| `tests/harness/fixtures.ts:852` | ガード呼出(`setupIntegrationProject`) | `  copyTreeWithRetry(AMADEUS_SRC, join(proj, ".claude"));` |
| `tests/harness/fixtures.ts:866-867` | 同一関数内の姉妹面(素 `cpSync`) | `  if (existsSync(AMADEUS_MEMORY_SRC)) {` / `    cpSync(AMADEUS_MEMORY_SRC, join(proj, "amadeus"), { recursive: true });` |
| `tests/harness/fixtures.ts:646-654` | `CopyTreeOps` 契約(5 面) | `export interface CopyTreeOps {` … `  exists(path: string): boolean;`(`:648`) |
| `tests/harness/fixtures.ts:600` | `ops.exists` の唯一の消費点(`RemoveTreeOps` 側) | `      if (!ops.exists(path)) return;` |
| `tests/harness/tui-fixtures.ts:181` | ガード呼出(claude 分岐のみ) | `    copyTreeWithRetry(AMADEUS_SRC, join(proj, ".claude"));` |
| `tests/harness/tui-fixtures.ts:170-179` | kiro / kiro-ide 分岐は丸ごと素 `cpSync` | `    cpSync(KIRO_SRC, join(proj, ".kiro"), { recursive: true });` ほか |

### 4.2 `CopyTreeOps.exists` は本体未消費(反証確認済み)

`git grep -n 'ops\.exists' -- tests/harness/fixtures.ts` の出力は **1 hit のみ**(`600:      if (!ops.exists(path)) return;`)であり、これは `removeTreeWithRetry`(`RemoveTreeOps`)の post-condition である。`copyTreeWithRetry` の本体レンジ(`:665-696`、`export function copyTreeWithRetry` = `:665`、閉じ `}` = `:696`)に `ops.exists` は出現しない。述語の異常終了検査(`cid:reverse-engineering:c6-absence-predicate-exit-code`): 上記 grep は **exit 0 で 1 行出力**しており、空出力を根拠にした不在主張ではない。

### 4.3 診断が ops を迂回して素の `fs` を直呼びする面

`git grep -n 'existsSync\|readdirSync\|statSync' -- tests/harness/fixtures.ts | awk -F: '$1>=700 && $1<=810'` の出力(7 hit):

| 行 | 呼出 | 所属 |
|---|---|---|
| `:719` | `const srcExists = existsSync(src);` | `reportCopyTreeFailure` |
| `:723` | `const destParentExists = existsSync(destParent);` | `reportCopyTreeFailure` |
| `:778` | `return readdirSync(path, { recursive: true }) as string[];` | `safeReaddirRecursive` |
| `:786` | `return readdirSync(path);` | `safeReaddir` |
| `:793` | `if (!existsSync(path)) return -1;` | `countFilesRecursive` |
| `:795` | `for (const entry of readdirSync(path, { recursive: true }) as string[]) {` | `countFilesRecursive` |
| `:797` | `if (statSync(join(path, entry)).isFile()) count++;` | `countFilesRecursive` |

内訳: `existsSync` 3 面 / `readdirSync` 3 面 / `statSync` 1 面。いずれも注入された `ops` を経由しない。この事実は既存テストが**明文で前提化**している — `tests/integration/t-fixtures-copy-tree-retry.integration.test.ts:324-326` verbatim:

```
    // reportCopyTreeFailure's existsSync(src)/safeReaddir(src) calls are
    // real fs calls, unaffected by an injected `ops` — `ops` only stands in
    // for the copy operation itself.
```

### 4.4 単一ファイル面が構造的に適用不可である根拠

`countFilesRecursive`(`:792-805`)は `readdirSync` を **`try` の外**で呼ぶ:

```
function countFilesRecursive(path: string): number {
  if (!existsSync(path)) return -1;
  let count = 0;
  for (const entry of readdirSync(path, { recursive: true }) as string[]) {
    try {
      if (statSync(join(path, entry)).isFile()) count++;
```

src が単一ファイルの場合、`existsSync` は true を返すが `readdirSync(file)` が **`ENOTDIR`** で throw する。`copyTreeWithRetry` は `ops.count(src)` を `try` 内で呼ぶため throw は catch されるが、`ENOTDIR` は `RETRYABLE_COPY_CODES`(`:620` = `ENOENT`/`EAGAIN`/`EMFILE`/`ENOMEM`)に**含まれない**ため `isRetryableCopyError` が false を返し、attempt 1 で `break` → throw する。したがって単一ファイル面へのガード適用は「リトライしないまま必ず失敗する」形になり、適用不可。

## 5. スコープ (a)/(b)/(c) の裁定材料

### 5.1 スコープ (a): 適用範囲拡大 — 述語 pred-a2 と全 8 サイト

**pred-a2(全文)**: 「`copyTreeWithRetry` の呼出を含むのと**同一の関数本体**にあり、コピー元が `dist` 系ツリーを指す定数(`*_SRC` / `*_DIST`)に根ざした素の `cpSync` サイト」。

再実行可能な列挙述語(2 段):

```
# (i) 候補抽出
git grep -n 'cpSync(' -- tests/harness/fixtures.ts tests/harness/tui-fixtures.ts | grep -E '_SRC|_DIST'
# (ii) 同一関数内に copyTreeWithRetry があるかを関数境界で絞る
grep -n '^export function\|^function' tests/harness/fixtures.ts tests/harness/tui-fixtures.ts
```

(i) の出力は **19 行**(`… | wc -l` = 19)。うちコメント行 2 件(`fixtures.ts:622` / `tui-fixtures.ts:3`)は非コードのため除外 → コードサイト 17 件。(ii) で関数境界を当てると、`fixtures.ts:1030/1031/1032/1034/1037/1038/1039/1041/1048` の **9 件**(`… | awk -F: '$2>=1022 && $2<=1070' | wc -l` = 9)は `setupWorkspaceJourney`(`:1022-1070`、本体に `copyTreeWithRetry` を**含まない**)に属するため pred-a2 の**外**。17 − 9 = 残る **8 サイト / 2 ファイル**が pred-a2 の対象:

| # | サイト | src 定数 | 種別 | dest | pred-a2 |
|---|---|---|---|---|---|
| 1 | `fixtures.ts:867` | `AMADEUS_MEMORY_SRC` | ディレクトリ | `join(proj, "amadeus")` | 該当 |
| 2 | `tui-fixtures.ts:170` | `KIRO_SRC` | ディレクトリ | `join(proj, ".kiro")` | 該当 |
| 3 | `tui-fixtures.ts:171` | `KIRO_SRC/../AGENTS.md` | **単一ファイル** | `join(proj, "AGENTS.md")` | 該当だが**適用不可**(§4.4) |
| 4 | `tui-fixtures.ts:172` | `KIRO_MEMORY_SRC` | ディレクトリ | `join(proj, "amadeus")` | 該当 |
| 5 | `tui-fixtures.ts:177` | `KIRO_IDE_SRC` | ディレクトリ | `join(proj, ".kiro")` | 該当 |
| 6 | `tui-fixtures.ts:178` | `KIRO_IDE_SRC/../AGENTS.md` | **単一ファイル** | `join(proj, "AGENTS.md")` | 該当だが**適用不可**(§4.4) |
| 7 | `tui-fixtures.ts:179` | `KIRO_IDE_MEMORY_SRC` | ディレクトリ | `join(proj, "amadeus")` | 該当 |
| 8 | `tui-fixtures.ts:188` | `CLAUDE_MEMORY_SRC` | ディレクトリ | `join(proj, "amadeus")` | 該当 |

**8 サイト − 単一ファイル 2 サイト = 実質 6 サイト**。

#### 5.1.1 dest-fresh 充足の再検証 — Developer scan からの訂正(重要)

Developer scan は「全 6 サイトで dest-fresh を実測確認」と報告したが、Architect の再検証で **6 サイト中 1 サイト(`fixtures.ts:867`)は dest-fresh を満たさない**ことが判明した。

根拠(構造): `setupIntegrationProject` は先頭(`:851`)で `createTestProject()` を呼び、`createTestProject`(`:129-141`)はその内部で `seedWorkspaceShell(proj)`(`:139`)を呼ぶ。`seedWorkspaceShell`(`:219-244`)は `mkdirSync(join(proj, "amadeus", "spaces", space, "memory"), …)`(`:221`)ほかで **`<proj>/amadeus/` を作成し、`.amadeus-clone-id` / `active-space` / `spaces/<space>/intents/{active-intent,intents.json}` / record dir を書き込む**。すなわち `:867` の dest は**呼出時点で既に存在し、seed 済みの内容を持つ**。

根拠(実測): scratch(repo 外、`cid:code-generation:c2-env-isolation-seam-inventory` に従い repo へ書込なし)で `createTestProject()` を 1 回実行:

```
dest exists at setupIntegrationProject entry: true
entries: .amadeus-clone-id,active-space,spaces
```

一方 `dist/claude/amadeus` の直下は `active-space` / `spaces` の 2 エントリのみ(`ls dist/claude/amadeus`)で、**`.amadeus-clone-id` と `spaces/default/intents/` を含まない**。`copyTreeWithRetry` は dest-fresh 契約として **attempt ごとに dest を remove してから copy** するため、`:867` を素朴に置換すると seed 済みの clone-id・cursor・intents registry・record dir が消え、`setupIntegrationProject` の後続(`seedStateFile` / `seedAuditFile` 等)が壊れる。現行の素 `cpSync` は **merge 意味論に依存した意図的な選択**である。

残る 5 サイト(`tui-fixtures.ts:170/172/177/179/188`)は dest-fresh を満たす: `setupTuiProject`(`:153-`)は `mkdtempSync`(`:154`)で空の temp を作り、workspace shell の seed(`seedTuiWorkspaceShell(proj)`)は**コピーブロックより後**の「2. Seed the per-intent workspace shell」節で実行されるため、コピー時点で `<proj>/amadeus` も `<proj>/.kiro` も存在しない。

**裁定材料としての含意**: スコープ (a) の実質適用可能面は **5 サイト**(tui-fixtures のみ)であり、`fixtures.ts:867` は「dest-fresh 契約を満たさないため素 `cpSync` を残す」か「seed 順序を入れ替えて fresh 化する」かの**設計裁定を要する**。後者は `setupIntegrationProject` の seed 順序変更を伴い、Minimal depth の bugfix スコープを超える可能性がある。

### 5.2 スコープ (b): dest-fresh 契約の明文化

現状、dest-fresh 契約は `CopyTreeOps` 直上のコメント(`:638-645`)に **doc としてのみ**存在する。verbatim:

```
// dest-fresh contract (#3003, t99): `dest` must not exist when
// copyTreeWithRetry is called — the helper owns it outright.
```

型にも assert にも現れないため、§5.1.1 の `fixtures.ts:867` のような**契約違反サイトを機械的に検出する手段が無い**。これが #3014 が (b) を独立スコープとして挙げる理由であり、§5.1.1 は (b) の必要性を実例で裏づけている(契約が doc 止まりだったため、Developer scan の目視でも違反が見落とされた)。

### 5.3 スコープ (c): c1 / c2 比較表

| 観点 | **c1: `CopyTreeOps.exists` を除去** | **c2: 診断を readdir ポート経由へシーム化** |
|---|---|---|
| 契約への作用 | **縮小**(5 面 → 4 面) | **拡張**(readdir ポート新設) |
| 変更行(実測) | 削除 6 行 = `fixtures.ts:648`(`exists(path): boolean;`) + `:657`(`exists: existsSync,`) の 2 行、`t-fixtures-copy-tree-retry.integration.test.ts:29-32`(`opsRecorder` の `exists` メソッド)の 4 行 | 新規ポート面 + `reportCopyTreeFailure` / `safeReaddir` の書き換え + 既存テストの前提反転 |
| assert 変更 | **0**。`ops.calls` の `toEqual`(テスト `:52-59`)は `remove:` / `copy:` / `count:` のみを列挙し、`exists:` を含まない(= 呼ばれていないことが既に pin されている) | **必要**。テスト `:323-368` は「診断の `existsSync`/`safeReaddir` は注入 `ops` の影響を受けない実 fs 呼出」を明文の前提とし(`:324-326` verbatim は §4.3)、`src exists: true` / `src top-level entries: 2`(`:365-366`)をその前提の上で assert する。c2 はこの前提を反転させる |
| coverage 免除への連動 | なし | **あり**。`tests/.coverage-patch-allowlist.json` の `safeReaddir` エントリ(`function: "safeReaddir"`, `class: "catch-arm"`)の `expiry` は verbatim `remove when reportCopyTreeFailure takes an injectable readdir port` — c2 はこの expiry 条件そのものを満たすため、**同一変更で免除エントリを削除し、catch 面を driver で被覆する**必要がある |
| リスク | 低(未消費面の削除、振る舞い不変) | 中(診断経路の意味論変更 + 免除台帳連動 + テスト前提反転) |
| team.md 規範との関係 | 「どのコードも消費しない検証用フィールド」の除去に該当 | 検証面の拡張。`cid:code-generation:c-measure-not-prose` に従い、免除削除後は lcov DA 実測で被覆を確認 |

**裁定材料の要点**: c1 と c2 は独立に実施可能であり、c1 は振る舞い不変・6 行削除・assert 変更 0 の surgical な縮小、c2 は契約拡張を伴い免除台帳と連動する。両者を同一 Unit に束ねるかは requirements-analysis の裁定事項。

## 6. base..observed 差分棚卸し

`git log --oneline 5b12d96e9..f60b3f4c8`(3 commits):

| commit | 内容 | 焦点との関係 |
|---|---|---|
| `f60b3f4c8` | #3015 — `copyTreeWithRetry` を dest クリアで収束させる(#3003 の修正) | **患部そのもの**。`tests/harness/fixtures.ts` に +63 行(`git diff --stat da0acecdd..f60b3f4c8 -- tests/harness/fixtures.ts`)。hunk は `@@ -634,18 +634,30 @@` / `@@ -658,6 +670,9 @@` / `@@ -693,6 +708,11 @@` / `@@ -712,12 +732,55 @@` — dest-fresh 契約コメント、`remove` 面追加、`ops.remove(dest)` 呼出、`describeTreeDifference` 診断追加 |
| `da0acecdd` | metrics snapshot(#3017) | 非交差 |
| `d7ffaa544` | #2999 — multi-Unit Delivery Bolt PR attestation | 後述 §7 |

`tests/harness/tui-fixtures.ts` は区間で**無変更**(`git diff --name-only 5b12d96e9..f60b3f4c8 -- tests/harness/tui-fixtures.ts` が空出力)。

## 7. 差分リージョンの他変更 — #2999 を触らない判断根拠

#2999(`d7ffaa544`)は区間内で最大の変更(全体 100 files / +4896 / −111)だが、その大半は `plugins/pr-convergence/**` と Delivery Bolt membership 系のテストであり、本 intent の焦点(`copyTreeWithRetry` のガード境界)と**交差しない**。

唯一 `tests/harness/fixtures.ts` に触れているが、hunk は 2 箇所のみ(`git diff d7ffaa544~1..d7ffaa544 -- tests/harness/fixtures.ts | grep '^@@'`):

- `@@ -49,6 +49,10 @@` — `amadeus-delivery-bolts.ts` からの import 追加(4 行)
- `@@ -158,6 +162,22 @@` — `seedDeliveryBoltPlan` ヘルパの新設(16 行)

いずれも患部レンジ(`:600` 台以降のコピー/ガード/診断領域)の**上流**であり、コピー機構に一切触れない。反証確認: `git diff d7ffaa544~1..d7ffaa544 -- tests/harness/fixtures.ts | grep -cE '^\+.*(cpSync|copyTreeWithRetry|CopyTreeOps)'` = **0**(exit 1、追加行に該当なし)。

**判断**: #2999 は焦点非交差のため codekb の焦点節では扱わず、本 record に上記の非交差根拠のみを記録する。ただし +20 行の行番号シフトを生じているため、base 断面の file:line を本 intent の座標として流用してはならない(本 record の全座標は observed `f60b3f4c8` で取得済み)。

## 8. UNMEASURED(本 scan で測っていないこと)

- **ガード適用後の実行時挙動**: pred-a2 の 5 サイト(tui-fixtures)へ実際にガードを適用したときの t-tui 系スイートの緑/赤は未実測。本 scan は静的座標と契約の照合のみを行った
- **`setupWorkspaceJourney`(`fixtures.ts:1030-1048`)の 8 サイト**: pred-a2 の外(同一関数内にガード呼出が無い)として除外したが、これらが `copyTreeWithRetry` を必要とするか否かは判断していない。Developer scan が報告した「広い述語 35 コードサイト」の残余も同様に未評価
- **`tests/` 全域の素 `cpSync` 面**: 本 scan は `tests/harness/` の 2 ファイルに限定した。前回 scan(260814-t99-copytree-race)が述語 P-A で 19 件 / 15 ファイルと報告した集合の、#3015 着地後の再計数は行っていない
- **c2 実施時の coverage 影響**: `safeReaddir` 免除エントリ削除後の patch coverage 実測(lcov DA)は未実施。実施は code-generation 段
- **`fixtures.ts:867` の seed 順序入替の実現可能性**: §5.1.1 で挙げた代替案(seed を後ろへ動かして dest を fresh にする)の影響範囲(`setupIntegrationProject` の全呼出元)は棚卸ししていない
- **observed 以降の 2 commits**(`fb1939dfd` / `cd64486a6`): 患部非交差であることは `git diff --name-only f60b3f4c8..cd64486a6 -- tests/harness/fixtures.ts tests/harness/tui-fixtures.ts` が空出力であることで確認したが、本 scan の主張はすべて observed `f60b3f4c8` 断面で採取しており、先行 2 件の内容は評価していない

## 9. Verification

- git 状態変更・GitHub 書込・`bun run build`・engine/state 操作: **すべてゼロ**
- 書き込み: `amadeus/spaces/default/codekb/amadeus/` 配下のみ(本 record、`code-quality-assessment.md`、`reverse-engineering-timestamp.md`)
- scratch スクリプト(§5.1.1 の dest-fresh 実測)は repo 外の scratchpad で実行(`cid:code-generation:c2-env-isolation-seam-inventory`)
