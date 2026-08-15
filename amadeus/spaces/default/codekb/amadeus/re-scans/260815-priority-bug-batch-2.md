# RE スキャン記録: 260815-priority-bug-batch-2

**観測 ref**: observed = `9ba8170bb03996fb98b497cfcbac3d207795018d`（本 worktree HEAD）。差分 base = `a49f9e9fdbd19fd40e9374feba77e9360771d173`。

| 項目 | 値 |
| --- | --- |
| Date | `2026-08-15` |
| Intent | `260815-priority-bug-batch-2`（scope `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`） |
| Base commit | `a49f9e9fdbd19fd40e9374feba77e9360771d173` |
| Observed commit | `9ba8170bb03996fb98b497cfcbac3d207795018d` |
| Scan mode | **通常の差分リフレッシュ**（xrev differential 不採用 — 理由は §1） |
| Focus | 優先バグ 4 件（[#3077](https://github.com/amadeus-dlc/amadeus/issues/3077) / [#3074](https://github.com/amadeus-dlc/amadeus/issues/3074) / [#3075](https://github.com/amadeus-dlc/amadeus/issues/3075) / [#3079](https://github.com/amadeus-dlc/amadeus/issues/3079)）+ base..observed の差分全域 |

## 0. Base 選定の実測根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` に現れる 40-hex トークンを全数抽出し、**observed の祖先**であるものだけを距離昇順に並べた。

トークン集合は**追記前の committed tree** から採取した（本スキャンが本ファイルと timestamp に新しい SHA を書くため、作業ツリーから採ると自己参照になる）。

述語（worktree ルート、再実行可能）:

```sh
OBS=9ba8170bb03996fb98b497cfcbac3d207795018d
{ git show HEAD:amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md
  for f in $(git ls-tree --name-only HEAD amadeus/spaces/default/codekb/amadeus/re-scans/); do
    git show "HEAD:$f"
  done
} | grep -ohE '[0-9a-f]{40}' | sort -u > /tmp/shas.txt   # 177 件（`wc -l` 転記）
while read s; do
  git cat-file -e "$s^{commit}" 2>/dev/null || continue
  git merge-base --is-ancestor "$s" "$OBS" || continue
  echo "$(git rev-list --count "$s..$OBS") $s"
done < /tmp/shas.txt | sort -n | head -5
```

出力（上位、逐語）:

| 距離 | commit | 出所 |
| --- | --- | --- |
| **9** | `a49f9e9fdbd19fd40e9374feba77e9360771d173` | `re-scans/260814-open-bug-batch-6.md` の Observed |
| 10 | `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7` | `re-scans/260814-priority-bug-batch.md` の Observed |
| 33 | `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` | 旧 Observed |
| 39 | `cd64486a68c6a1144db50fbe3fde8273f5e18455` | 旧 Observed |
| 41 | `f60b3f4c868f3b7608a06f08393b8e2f10287fad` | 旧 Observed |

→ **base = `a49f9e9fd`**（observed の祖先で距離最小、`cid:reverse-engineering:rescan-base-ancestry`）。`git merge-base --is-ancestor a49f9e9fd $OBS` = exit 0。

**直前 intent の observed が最小でないことに注意**: 時系列で直近の RE は `260814-priority-bug-batch`（observed `d64fd7cac`）だが、その次に走った `260814-open-bug-batch-6` の observed `a49f9e9fd` が `d64fd7cac` の子であるため、距離は後者のほうが小さい（9 < 10）。base は「直前に実行された intent」ではなく「祖先のうち距離最小」で選ぶ規則に従った。

## 1. Scan mode の選択根拠（xrev differential 不採用）

対象 4 Issue のクロスレビューは**本 intent 内で本スキャンと並行して進行中**であり、凍結された review 断面（verdict が宣言する SHA）が存在しない。xrev differential scan mode は「クロスレビュー verdict の凍結断面を起点に差分だけを取り直す」形であるため、起点が存在しない本スキャンでは形式要件そのものが成立しない。したがって通常の差分リフレッシュを採り、全主張を observed 断面で実測した。

`cid:reverse-engineering:xrev-scan-mode-cid-hollowing` が記す「本則が `project.md` 本文から削除され追補だけが Learnings Inbox に残る空洞化」状態は継続している。本スキャンは xrev を採らないため裁定は不要だが、状態が続いていることをここに記録する。

## 2. observed と `origin/main` の関係 — 本スキャン時点で同一ではない

上流の Developer スキャン報告は `git rev-parse HEAD` が `origin/main` と同一値であると記録しているが、**本 Architect 統合の実行時点では一致しない**。実測:

| 述語 | 結果 |
| --- | --- |
| `git rev-parse origin/main` | `0901182c7ca56c2a3d4e10333b6f5c1308839abd` |
| `git merge-base --is-ancestor 9ba8170bb origin/main` | exit 0（observed は `origin/main` の祖先） |
| `git rev-list --count 9ba8170bb..origin/main` | **3** |
| `git diff --name-only 9ba8170bb origin/main -- ':!amadeus/' ':!metrics/'` | **7 ファイル** |

先行する 3 コミットは `0901182c7`（RFC-0001 承認、docs）/ `8409dc5db`（#3026 の model-completeness センサー宣言・配線回復、PR #3086）/ `c021451bc`（RFC-0001 の裁定記録、docs）である。非 `amadeus/` の 7 ファイルは `packages/framework/core/tools/amadeus-graph.ts` / `plugins/formal-model-check/plugin.json` / `plugins/formal-model-check/stages/formal-model-check.md` / `tests/integration/` の 4 件（`t-formal-verif-plugin-lifecycle` / `t-formal-verif-plugin-stage-discovery` / `t3026-plugin-sensor-declaration` / `t450-tla-authoring-stage-e2e`）。

**本 intent の患部 4 件との交差はゼロ**である（選挙 7 モジュール / `amadeus-lib.ts` / `amadeus-utility.ts` / `amadeus-audit.ts` / `t224` / #3075 の 19 テストファイルのいずれも上記 7 ファイルに含まれない）。したがって本記録の file:line は observed 断面で有効であり、実装ステージが `origin/main` へ rebase しても患部の行は動かない見込みだが、**それは本スキャンが実測した事実ではなく上記の非交差からの推論である**。実装時は患部行を再取得すること。

## 3. 患部 4 件の現行成立（observed 実読）

**4 件すべて現行 observed で成立**しており、既修正のものはない。

### P1. #3077 — 全 question 再 tally の commit が構造的に不能（P?/S?）

主張は成立し、**Issue の記述より広い**。単一 question 選挙に限らず、**全 question を再 tally するすべての run** が同じ経路に入る。

不整合は生産側と検証側の 2 点に分かれる:

| 側 | 所在 | 逐語 |
| --- | --- | --- |
| 生産 | `packages/framework/core/tools/amadeus-election.ts:451` | `preservedResultDigest: checked.value.currentTally === null ? null : directive.preservedResultDigest,` |
| 検証 | `packages/framework/core/tools/amadeus-election-store.ts:728-729` | `if (targets.size === definition.questions.length) {` / `return next.preservedResultDigest === null ? ok(undefined) : err("history-mismatch");` |

確定した連鎖（すべて実読、確度 **高**）:

1. `directiveFromSnapshot`（`:148`、digest 決定は `:154-159`）は `currentTally !== null` のとき `ElectionStore.establishedResultsDigest(...)` を digest に入れる。この関数（`amadeus-election-codec.ts:840`）は established 結果のみを payload 化して `canonicalContractValueDigest`（`:868`）でハッシュするため、**established 0 件でも空 payload のハッシュ文字列が返り `null` にならない**。
2. `currentTargets`（`amadeus-election.ts:119-127`）は `currentTally !== null` のとき hold の question 集合を targets にする。question 1 件の選挙でその 1 件が hold になれば targets は全 question を覆う。
3. `tallyElection`（`:424`）は `:451` で 1. の非 null を書き、`commitTally` → `verifyPreservation` が 2. により `null` を要求して `history-mismatch` を返す。
4. リペア経路も救わない — `isCommittedRun`（`:419-420`）は `expectedRunId !== null`（再 tally では `base` `:144` が `currentTally.runId` を入れる）のとき**非 null の digest 一致**を期待する。

**修正方向**: 意味論の側から正しいのは store 側（全 question 再 tally には保存すべき established 結果が存在しない）。最小の是正は `:451` の条件を「`currentTally === null` **または** targets が全 question を覆う」へ広げ、`:419-420` の期待式も同じ述語へ揃えること。**片方だけを直すと commit は通るがリペア経路が落ちる**ため、述語を 1 か所へ括り出して両者から呼ぶ形が正しい。落ちる実証は「1 question・hold → 再 tally」で `history-mismatch` を再現するテストを先に赤で置ける。

**上流報告からの訂正**: 行ピン 2 件がずれている。digest 生産は `:450` ではなく **`:451`**、全 question 分岐は `:727-729` ではなく **`:728-729`**（`grep -n "preservedResultDigest: checked.value.currentTally === null"` / `grep -n "targets.size === definition.questions.length"` で再取得）。

### P2. #3074 — `assertRecomposeAllowed` が phase・swarm を見ない

成立。`packages/framework/core/tools/amadeus-lib.ts:564-573` は autonomy 一値のみの純射影で、doc コメント（`:563`）が逐語で `Pure policy projection; callers own user-visible refusal and mutation ordering.` と宣言する。呼び出しは 1 箇所のみ（`amadeus-utility.ts:5802`、`assertRecomposeStateAllowed` `:5793` 内）。拒否文言（`:5805`）は Construction を名指すが、判定材料に phase が入っていない。

判定材料の可読性（依頼の核心）:

| 軸 | 可否 | 実測根拠 |
| --- | --- | --- |
| **phase** | 追加できる。確度 **高** | 呼び出し側が state 全文 `content` を既に受け取っており、同 tool 内 `:391` に `getField(content, "Lifecycle Phase")` の既存イディオムがある。純関数に引数 1 つを足すだけで新しい読取面は生じない |
| **swarm in-flight** | 純関数へは追加できない。確度 **高**（不在側の実測） | `git grep -nE "[Ss]warm" -- packages/framework/core/tools/amadeus-state.ts` = **5 hit、全てコメント行**。state ファイルにフィールドは 1 件もない。一次記録は監査イベント（`SWARM_UNIT_STARTED` / `SWARM_UNIT_CONVERGED`）側 |

**層境界の実測**（修正方向を規定する）: `amadeus-audit.ts:31` と `amadeus-state.ts` は `amadeus-lib.ts` を **import する側**であり、逆向きの import 文は存在しない（lib 側の `amadeus-state.ts` / `amadeus-audit.ts` へのヒットはすべて散文コメント）。唯一の実行時の抜け道は `emitErrorAuditRow`（`:8066-8076`）の遅延 `require("../otel/audit-emit.ts")`（`:8074`）で、コメント `:8060-8065` が循環回避の理由を逐語で述べる。これは**エラー行 emit 専用の一方向出口であり読取面ではない**。

**修正方向**: phase 軸だけを純関数へ足す（`autonomy === "autonomous" && phase === "CONSTRUCTION"` のときのみ denied）。swarm 軸を要件が必須とする場合は、呼び出し側が監査から導出して第 3 引数で渡す形にすべきで、これは**設計判断としてエスカレーション対象**である。

### P3. #3075 — 時間予算アサーションの全数棚卸し

主張は成立。現存 **24 行 / 19 ファイル**（述語は §3 末尾）。Issue 本文の集計値「27」は Issue 自身の A/B/C 列挙（26 行）とも一致せず、実測とも一致しない。**現存箇所の集合は Issue の列挙と一致しており、ずれているのは集計値だけ**である。t07 の 2 箇所は PR #3076 で消滅済み（現行 `grep -c "toBeLessThan" tests/unit/t07-hook-audit-logger.serial.test.ts` → **0**）。

**上流報告からの訂正（重要）**: `tests/integration/t487-stage-stats.integration.test.ts:426` の `expect(elapsed).toBeLessThan(60)` は **60 ミリ秒ではなく 60 秒**である。`:424` が `const elapsed = (Date.now() - started) / 1000;` で秒へ換算済みで、テスト名も逐語で `scanning the real workspace stays well inside the sixty-second ceiling` と述べる。したがって「60ms は A 群の最短 250ms より一桁厳しいので A へ再分類すべき」という判断は成立せず、実際には**最も余裕のある部類（C 群側）**である。単位を読み違えたまま是正すると正当な上限を不要に撤去する。

**最も重い所見**: 24 行のうち `scaleTestTime` を通るのは `t448-pr-convergence-cli.integration.test.ts:1917` の **1 行だけ**で、残る 23 行は生の定数である。しかも同じファイルが per-test timeout には係数を適用している（`t92` はファイル内 14 使用に対し `:977` は生の `3000`、`t76` は 11 使用に対し `:527` が生の `3000`、`t487` は 5 使用に対し `:426` が生の `60`）。**債務の本体は係数機構の不在ではなく適用面の非対称**であり、`TEST_TIME_FACTOR` を上げても本体予算は縮まないまま timeout だけが伸びる。分類・是正の設計制約は `code-quality-assessment.md` の対応節に記録した。

### P4. #3079 — t224 symlink ケースの timeout 未宣言

成立。主因は明確に判定できた。

**主因はロック取得リトライ予算であり、migrate CLI の spawn 回数ではない。確度 高（実読で一意）。**

対象テストは `tests/integration/t224-upstream-v2-migration-cli.test.ts:1553`（テスト名逐語: `symlink clone-id migration isolates distinct fixture identities that share a lock path`）。`:1577-1582` でロックディレクトリを**意図的に占有**し、`:1584` の `migrateWithEnv` を走らせて `:1597` で `Failed to acquire audit lock` を期待する。つまりこの migrate 実行は**必ず取得予算を完走してから失敗する**設計である。

`packages/framework/core/tools/amadeus-audit.ts:1011-1014` の `lockRetries` 既定は `200`、`lockRetryMs`（`:1015-`）は `100` で **20 秒**。テストが渡す env は `AMADEUS_LOCK_BASE_DIR` のみ（`:1586`）で `AMADEUS_AUDIT_LOCK_RETRIES` を渡していないため既定が適用される。bun 既定 5000ms の 4 倍であり、Issue が観測した SIGTERM 7911ms（取得の途中で殺された形）と整合する。

**修正方向**: Issue AC1 の 2 案のうち「ロックリトライ予算の短縮可能なタイミングシーム化」を推す。既存の `AMADEUS_AUDIT_LOCK_RETRIES` がまさにそのシームとして用意されており、コメント `:1009-1010` が逐語でその用途を宣言する（`lets tests dial this down so the lock-timeout failure path is testable without 20-second waits`）。`:1586` の env に足すだけで失敗経路の意味を保ったまま実時間が 20s → 0.5s に落ちる。ノルム `cid:build-and-test:bt-timeout-verification-shape` に直接整合する。明示 timeout の宣言だけで済ませると 20 秒の実待ちが残るため単独の解としては劣る。per-test timeout を併せて宣言する場合は `scaleTestTime` 経由の形（`tests/integration/t227-codex-migration-walking-skeleton.test.ts:302` の `}, scaleTestTime(15_000));`）を使う。

### 4 Issue に共通する構造

#3075 / #3079 は「テストが実時間を信号に使っているため負荷下で偽陽性を出す」同一クラスで、直前区間で着地した #3035 / #3040 の続きである。#3077 / #3074 は本番ロジックの欠陥であり別クラス — いずれも「複数の面が同じ概念について互いに矛盾する述語を持つ」形（#3077 は生産と検証、#3074 は拒否文言と判定材料）である。

## 4. base..observed の構造変化（9 commits / 10 files）

**構造変化は実質ゼロ**である。パッケージ境界、エンジン、state 機械、プラグイン集合（4）はいずれも無変更で、非 `amadeus/` の実体を動かしたのは PR #3076（test-signal バグ 4 件の修正）と PR #3072（autonomy 修正）の 2 本だけ。残る 7 コミットは record / RFC / metrics / ノルム文書に閉じる。

唯一の新規コンポーネントは `packages/framework/core/tools/amadeus-migrate-git.ts`（**32 行**、`wc -l` と `git log --numstat --diff-filter=A` がともに 32。上流報告の「31 行」は実測と一致しない）。切り出しの理由は coverage 母集団の制御であり、既存ノルム `cid:build-and-test:bt-coverage-universe-inflation` の適用例として `code-structure.md` / `component-inventory.md` に記録した。

ファイル別の増減は `code-structure.md` の対応節（`git diff --numstat` からの転記）に置いた。

## 5. 構造補修 — 直前リフレッシュが残した重複 H2 見出し 15 件

本スキャン開始時、body 8 面のうち 8 面に**隣接する重複 H2 見出し**が存在した。形はいずれも同一で、「元の見出し行」の直後に「同じ見出し + 降格注記を付した行」が**置換ではなく挿入**されており、結果として前者が中身を持たない空節になっていた。直前 intent（`260814-priority-bug-batch`）の降格編集の副作用である。

検出述語（再実行可能）:

```sh
for f in amadeus/spaces/default/codekb/amadeus/*.md; do
  awk -v F="$f" '/^## / && prev ~ /^## / { ka=prev; sub(/（.*$/,"",ka); kb=$0; sub(/（.*$/,"",kb);
    if (ka==kb) printf "%s:%d\n", F, NR-1 } { prev=$0 }' "$f"
done
```

開始時の出力は **15 件**（`api-documentation` 2 / `architecture` 2 / `business-overview` 2 / `code-quality-assessment` 3 / `code-structure` 2 / `component-inventory` 2 / `dependencies` 1 / `technology-stack` 1）。15 件すべてで「先行行は後続行の接頭辞であり、後続行のほうが長い（差は一律 128 文字 = 降格注記）」ことを機械確認したうえで、**情報量の少ない先行行のみを削除**した。本文は 1 行も変えていない — `git diff --stat` が **15 deletions(-) / 0 insertions(+)** であることで確認できる。

補修後の同述語の出力は `reverse-engineering-timestamp.md` の 2 件のみで、これらは**別クラスであり手を付けていない**: `:779` と `:801` は異なる intent slug を持つ空の節見出し（`260801-open-bug-batch-5` と `260731-perf-ci-separation`）で、重複ではなく**中身が失われた孤児見出し**である。削除すると当該 intent の RE が実行された痕跡そのものが消えるため、判断を要する。**次回の RE またはノルム整理で裁定すべき申し送り事項**として残す。

あわせて、observed が `9ba8170bb` でない `現在` マーカー **18 節**を `履歴` へ降格した（`cid:reverse-engineering:c1`）。内訳: `business-overview` 2 / `api-documentation` 2 / `dependencies` 2 / `technology-stack` 2 / `code-structure` 2 / `code-quality-assessment` 2 / `architecture` 2 / `component-inventory` 2 / `reverse-engineering-timestamp` 2。降格後の残存は `grep -rn "^## .*（現在\|^## .*、現在、" *.md` が **0 行 / exit 1**（エラーなく不一致）。

## 6. 更新した codekb artifact（6 面）と、更新しなかった 4 面

| artifact | 更新内容 |
| --- | --- |
| `reverse-engineering-timestamp.md` | 本 intent の実行メタデータ節を先頭へ追記 + 既存 2 節の現在時制マーカーを履歴へ降格 |
| `code-structure.md` | 新規節。区間で動いた 10 ファイルの表、新規モジュール `amadeus-migrate-git.ts`（32 行）と coverage 母集団の関係、患部 4 件の所在 |
| `code-quality-assessment.md` | 新規節。テスト信号偽陽性クラスの債務整理 — 壁時計予算 24 行 / 19 ファイルの全数、構造による下位分類（差分型 1 / 契約由来定数型 3 / 絶対型 20）、`scaleTestTime` 適用が 1/24 である非対称、t487 の単位訂正 |
| `architecture.md` | 新規節。#3077 の `preservedResultDigest` 契約不整合を既知の不変条件違反として記録（生産・検証・codec の 3 モジュール分散）+ `amadeus-lib.ts` の層境界（state/audit → lib の一方向、遅延 require は emit 専用出口） |
| `component-inventory.md` | 新規節。`amadeus-migrate-git.ts` の追加（core/tools 総数 166 → **167**）+ 選挙 7 モジュール（計 4314 行）の責務分担と #3077 との関係 |
| `re-scans/260815-priority-bug-batch-2.md` | 本ファイル（新規） |

**本 intent の節を持たない 4 面**: `api-documentation.md` / `business-overview.md` / `dependencies.md` / `technology-stack.md`。区間に公開契約の変化・業務境界の変化・依存エッジの増減・技術スタックの変化がないためである（`amadeus-migrate-git.ts` は新規ファイルだが、`amadeus-migrate.ts` の内部関数を切り出したもので外部契約は不変であり、消費者も core 内 1 面 + テスト 1 面に閉じる）。

これら 4 面も `git status` 上は modified になるが、**変更は見出し行のみ**（§5 の現在時制マーカー降格と重複見出し削除）で、本文は 1 行も変えていない。実測: `git diff --unified=0` の変更行 **22 行**すべてが `## ` 行であり、非見出し行の変更は **0 行**（述語 `git diff --unified=0 -- <4 面> | grep "^[+-][^+-]" | grep -vc "^[+-]## "` → `0`）。

**申し送り（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）**: これら 4 面は本 intent の節を持たない。後続ステージが上流入力ヘッダにこれらを列挙することはできるが、**そこから本 intent の事実を引くことはできない**。本 intent の事実の出典は上表の 6 面に限られる。

## 7. 述語一覧（再実行可能。すべて worktree ルート）

| ID | 述語 | 結果 |
| --- | --- | --- |
| Q0 | `git rev-parse HEAD` | `9ba8170bb03996fb98b497cfcbac3d207795018d` |
| Q1 | `git merge-base --is-ancestor a49f9e9fd HEAD` | exit 0 |
| Q2 | `git rev-list --count a49f9e9fd..HEAD` | **9** |
| Q2b | `git rev-list --count d64fd7cac..HEAD`（対抗 base） | **10**（劣る） |
| Q3 | `git diff --stat a49f9e9fd HEAD -- ':!amadeus/' ':!metrics/'` | `10 files changed, 332 insertions(+), 67 deletions(-)` |
| Q4 | `git diff --name-status a49f9e9fd HEAD -- ':!amadeus/' ':!metrics/'` | A **1** / M **9** / D **0** |
| Q5 | `git rev-parse origin/main` | `0901182c7ca56c2a3d4e10333b6f5c1308839abd`（observed はその祖先、距離 **3**） |
| Q6 | `git diff --name-only 9ba8170bb origin/main -- ':!amadeus/' ':!metrics/'` | **7 ファイル**（患部との交差ゼロ、§2） |
| Q7 | `wc -l packages/framework/core/tools/amadeus-migrate-git.ts` | **32** |
| Q8 | `git ls-files packages/framework/core/tools \| wc -l` | **167**（前区間 166） |
| Q9 | `wc -l packages/framework/core/tools/amadeus-election*.ts` | codec 908 / store 1232 / CLI 804 / record 651 / question-tally 386 / transport 301 / model 32、**計 4314** |
| Q10 | `grep -n "targets.size === definition.questions.length" amadeus-election-store.ts` | **728**（Issue / 上流報告の 727 は誤り） |
| Q11 | `grep -n "preservedResultDigest: checked.value.currentTally === null" amadeus-election.ts` | **451**（上流報告の 450 は誤り） |
| Q12 | `grep -n "export function assertRecomposeAllowed" amadeus-lib.ts` | **564** |
| Q13 | `grep -n "const recomposeGuard = assertRecomposeAllowed" amadeus-utility.ts` | **5802** |
| Q14 | `git grep -nE "[Ss]warm" -- packages/framework/core/tools/amadeus-state.ts \| wc -l` | **5**（全てコメント行。state フィールドは 0） |
| Q15 | `git grep -n -E "toBeLessThan(OrEqual)?\(" -- 'tests/unit/*.ts' 'tests/integration/*.ts' 'tests/e2e/*.ts' \| grep -E "elapsed\|duration\|Ms\)\|journeyMs\|performance" \| grep -v indexOf` | **24 行 / 19 ファイル**（exit 0。層別 unit 6 / integration 16 / e2e 2） |
| Q16 | Q15 の 24 行に対する `grep -c scaleTestTime` | **1**（`t448-pr-convergence-cli.integration.test.ts:1917` のみ） |
| Q17 | `grep -c "toBeLessThan" tests/unit/t07-hook-audit-logger.serial.test.ts` | **0**（#3035 は着地済み） |
| Q18 | `sed -n '424p' tests/integration/t487-stage-stats.integration.test.ts` | `const elapsed = (Date.now() - started) / 1000;` → `:426` の 60 は**秒** |
| Q19 | `grep -n "AMADEUS_AUDIT_LOCK_RETRIES" packages/framework/core/tools/amadeus-audit.ts` | `:1009`（コメント）/ `:1012`（既定 `200` の読取。`lockRetries` は `:1011-1014`） |
| Q20 | 隣接重複 H2 の awk 述語（§5） | 開始時 **15** → 補修後 **0**（`reverse-engineering-timestamp.md` の別クラス 2 件を除く） |
| Q21 | `grep -rn "^## .*（現在\|^## .*、現在、" amadeus/spaces/default/codekb/amadeus/*.md` | 降格後 **0 行 / exit 1** |
| Q22 | base 候補トークンの母集団（`grep -ohE '[0-9a-f]{40}' \| sort -u \| wc -l`、committed tree 採取） | **177** |

**grep exit code の注意**（`cid:reverse-engineering:c6-absence-predicate-exit-code`）: Q21 の空出力は **exit 1**（エラーなく不一致）であり exit 2（エラー）ではないことを確認済み。`cid:reverse-engineering:c6-ugrep-word-boundary` に従い `\b`（語境界）を含む述語は使っていない。

## 8. 未検証の面

- **#3075 の負荷下倍率**: 各予算が実際の並行負荷下でどれだけの余裕を持つかは測っていない。§3 P3 と `code-quality-assessment.md` の分類は、構造（相対/契約由来/絶対、`scaleTestTime` 適用の有無、単位）の実読のみに基づく。Issue の A/B/C 確定にはこの測定が別途要る。
- **#3074 の swarm 導出可能性**: 監査シャードから in-flight を導出できるかは、イベント名を持つファイルの特定までで、実際に読める形になっているかは未確認。
- **既存テストスイートのベースライン**: 本スキャンは読取専用でフルスイートを実行していない。
- **`origin/main` への rebase 後の患部行**: §2 の非交差からの推論であり実測ではない。

## 9. Verification

- 選定 base = `a49f9e9fdbd19fd40e9374feba77e9360771d173`（observed の祖先で距離 **9**、Q1 / Q2 の実測による）
- git 状態変更（commit / branch / checkout / stash / merge）: **ゼロ**
- GitHub への書込: **ゼロ**（`gh` の実行自体ゼロ）
- engine / state ツール（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）の実行: **ゼロ**
- `bun run build` の実行: **ゼロ**
- 書き込み先: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（record dir への書込なし）
- scratch スクリプト（§5 の補修、base 候補列挙）は repo 外（`/private/tmp/claude-501/.../scratchpad`）に置いて実行
