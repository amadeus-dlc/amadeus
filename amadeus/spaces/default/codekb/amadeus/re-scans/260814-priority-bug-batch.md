# RE スキャン記録: 260814-priority-bug-batch

**観測 ref**: observed = `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7`（本 worktree HEAD）。差分 base = `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780`。

| 項目 | 値 |
| --- | --- |
| Date | `2026-08-15` |
| Intent | `260814-priority-bug-batch`（scope `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`） |
| Base commit | `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` |
| Observed commit | `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7` |
| Scan mode | **通常の差分リフレッシュ**（xrev differential scan 不採用 — 理由は §1） |
| Focus | 優先バグ 4 件（[#3065](https://github.com/amadeus-dlc/amadeus/issues/3065) / [#3034](https://github.com/amadeus-dlc/amadeus/issues/3034) / [#3040](https://github.com/amadeus-dlc/amadeus/issues/3040) / [#3035](https://github.com/amadeus-dlc/amadeus/issues/3035)）+ base..observed の差分全域 |

## 0. Base 選定の実測根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` に現れる 40-hex トークンを全数抽出し、**observed の祖先**であるものだけを距離昇順に並べた。

トークン集合は**追記前の committed tree** から採取した（本スキャンが本ファイルと timestamp に新しい SHA を書くため、作業ツリーから採ると自己参照になる）。

述語（worktree ルート、再実行可能）:

```sh
OBS=d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7
{ git show HEAD:amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md
  for f in $(git ls-tree --name-only HEAD amadeus/spaces/default/codekb/amadeus/re-scans/); do
    git show "HEAD:$f"
  done
} | grep -ohE '\b[0-9a-f]{40}\b' | sort -u > /tmp/shas_head.txt   # 168 件（`wc -l` 転記）
while read s; do
  git cat-file -e "$s^{commit}" 2>/dev/null || continue
  git merge-base --is-ancestor "$s" "$OBS" || continue
  echo "$(git rev-list --count "$s..$OBS") $s"
done < /tmp/shas_head.txt | sort -n | head -4
```

出力（上位、逐語）:

| 距離 | commit | 出所 |
| --- | --- | --- |
| **23** | `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` | `re-scans/260814-park-provenance.md:10` の Observed |
| 29 | `cd64486a68c6a1144db50fbe3fde8273f5e18455` | 旧 Observed |
| 31 | `f60b3f4c868f3b7608a06f08393b8e2f10287fad` | 旧 Observed |
| 33 | `d7ffaa5442266508d8e67babc3e0b947fb4c1637` | 旧 Observed |

→ **base = `1d08374cd`**（observed の祖先で距離最小、`cid:reverse-engineering:rescan-base-ancestry`）。`git merge-base --is-ancestor 1d08374cd $OBS` = exit 0。

**observed と `origin/main` の関係**: `origin/main` = `a49f9e9fdbd19fd40e9374feba77e9360771d173` で、observed は**その祖先、距離 1**（`git merge-base --is-ancestor d64fd7cac origin/main` = exit 0、`git rev-list --count d64fd7cac..origin/main` = 1）。差分の 1 コミット `a49f9e9fd`（PR #3069、push-first のノルム変更）が触るのは `amadeus/spaces/default/memory/project.md` のみで、`git diff --name-only d64fd7cac origin/main -- ':!amadeus/' ':!metrics/'` = **0 件**。すなわち**非 `amadeus/` ツリーは observed と `origin/main` でバイト等価**であり、以下の file:line はすべて worktree 実読で採取して差し支えない（`cid:reverse-engineering:c2-observed-mainline-commit`）。

**base..observed の規模**: 23 コミット（`git rev-list --count 1d08374cd..HEAD`）、185 files / +14769 −6942（`git diff --stat 1d08374cd HEAD -- ':!amadeus/'`）。

## 1. Scan mode の選択根拠（xrev differential 不採用）

対象 4 Issue（#3065 / #3034 / #3040 / #3035）は**いずれもクロスレビュー2名の凍結 SHA を持たない**。xrev differential scan mode は「クロスレビュー verdict の凍結断面を起点に差分だけを取り直す」形であり、起点が存在しない本スキャンでは形式要件そのものが成立しない。したがって通常の差分リフレッシュを採り、全主張を observed 断面で実測した。

なお `cid:reverse-engineering:c5-xrev-currency-schema-migration` が引く本則 `cid:reverse-engineering:c1-xrev-scan-mode` は 2026-08-12 のノルム蒸留（PR #2919、`bd567fd1b`）で `project.md` 本文から削除されており、追補だけが Learnings Inbox に残る「空洞化」状態にある（`cid:reverse-engineering:xrev-scan-mode-cid-hollowing`）。本スキャンは xrev を採らないため裁定は不要だが、状態が継続していることをここに記録する。

## 2. 患部 4 件の現行成立（observed 実読）

**4 件すべて現行 HEAD で成立**しており、既修正のものはない。患部ファイルは base..observed でいずれも無変更である。

### P1. #3065 — subprocess stdout の 8192B 読み取り境界（P2/S3）

NUL 終端ガードは `scripts/no-silent-drop-evidence-adapter.ts:166-172`。フォレンジック文字列（`bytes=` / `nulCount=` / `endsNul=` / `bytesAfterLastNul=`）は同ファイル `:149-164` の `treeForensics` が生成し、Issue 本文の逐語ログと一字一致する。上流 `#2397` のコメント（`:145-148`）が「並行負荷下で `git ls-tree -z` が exit 0 のまま stdout を切り詰めるのを観測済み」と既に述べており、本 Issue は**診断可能化はされたが読み取り側は未修正**という位置づけ。

読み取りユーティリティは同ファイル `:62-76` の `systemCommandRunner`。`COMMAND_MAX_BUFFER_BYTES = 8 * 1024 * 1024`（`:26`）であるため **8192 は maxBuffer ではない**（`git grep -n "8192" -- '*.ts'` → **0 行 / exit 1**）。`normalizeSpawnOutcome`（`:45-60`）は `result.error` が立てば非ゼロ status へ潰す fail-closed だが、本ケースは error が立たないため素通りする。

**契約の非対称（新規所見）**: `packages/framework/core/tools/amadeus-migrate.ts` の `git()`（`:439-455`）は `result.status === 0` だけで ok を決め、`result.error` を一切見ない。`systemCommandRunner` が持つ `normalizeSpawnOutcome` 相当の正規化がここには**ない**。負荷時の spawn エラー（status = null）が無音で `ok: false` になり、preflight checks が全 pass のまま migration が失敗判定 → rollback → 非ゼロ exit という t224 の観測に整合する。Issue 本文は t224 を「同族の説明が立つ」と仮説どまりにしているが、実読で具体的な欠落（error 未検査）まで特定できた。

検証面: `tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts:599`（失敗ケース、期待文字列 `differ on proven evidence paths` は `:609` の `landingDrift: "freshness"`）、同ファイル `:232-238` の `captures a two-megabyte command output`（2MB drain が通常は成功することを固定 = drain 機構自体は動くが負荷時に部分読みへ退行する）。t224 側は `tests/integration/t224-upstream-v2-migration-cli.test.ts:293-317` の `expectMigrationExit` が `:301` で逐語 `"migration subprocess exit status mismatch"` を出す。

**一次仮説（確度高）**: Bun 1.3.13 の `node:child_process` spawnSync が負荷時に stdout を EOF まで drain しない部分読み。8192B 境界・error 未設定・exit 0 の 3 観測が一致する。

### P2. #3034 — t2851 の clean doctor が live repo を検査（P2/S3）

**原因は仮説でなく確定**。fixture が live spawn ラッパである以上、`cwd` では隔離できない。

- ラッパ: `tests/integration/t2851-doctor-self-install-freshness.serial.test.ts:78-87` の `repositoryCheckFixture` が `join(REPO_ROOT, "scripts", "promote-self.ts")` を `Bun.spawnSync` する
- clean 前提の assert: 同ファイル `:221-222`（`handleDoctor(...)` の `exitCode` が 0）
- doctor 側: `packages/framework/core/tools/amadeus-utility.ts:1589-1602` の `selfInstallProjectionDoctorChecks` が `Bun.spawnSync(["bun", promoteSelf, "--check"], { cwd: projectDir, ... })`
- 入口: `isSelfDevWorkspace`（同 `:1017-1019`）は `existsSync(join(workspaceDir, "scripts", "promote-self.ts"))` だけを見るため、fixture を置いた瞬間に live 検査経路へ入る
- **cwd 無効の根拠**: `scripts/promote-self.ts:57` の `const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");` — 自ファイル位置から repo root を解決するため `cwd: projectDir` は構造的に無効

他ケース（`:158-200`）が使う `strictCheckFixture`（`:66-76`）は exit code をハードコードした自己完結スクリプトで正しく隔離されており、壊れているのは最終ケース 1 件のみという Issue の切り分けも正しい。`PROJECTED_ROOTS`（`:30`）は `scripts/promote-self.ts:64-71` の 6 面（`.claude` / `.codex` / `.agents` / `.cursor` / `.opencode` / `.kimi-code`）で、`projectionDigest()`（`:89-110`）がその全域を live repo に対してハッシュするため、テスト自体が live ツリーへ強く結合している。`:248` の `scaleTestTime(300_000)` が示すとおり、既に極端に長いタイムアウトを持つ重いテストでもある。

### P3. #3040 — t-pi-child-driver の settled one-shot RPC close（P3/S4）

テストは `tests/integration/t-pi-child-driver.integration.test.ts:177-184`、assert は `:185`（Issue の行番号と一致）。当該ケースの `timeoutMs` は `scaleTestTime(1_000)`。

`wait-for-eof` の意味は fixture `tests/fixtures/pi-driver/fake-pi.ts:60` の `if (command.message !== "wait-for-eof") setTimeout(() => process.exit(0), 10);` — つまり**この子プロセスは自発的に exit しない**。green になる唯一の経路は「guardian が `agent_settled` を観測 → child の stdin を閉じる → child が EOF で終了 → guardian が exit envelope を出して自身も close」という多段のプロセスイベント連鎖である（駆動点は `packages/framework/harness/pi/drivers/amadeus-pi-guardian.ts:321` の `completion.acceptLine(rpcLine, () => child?.stdin.end());`、settle 判定は同 `:82-87`）。

driver 側の期限は `packages/framework/harness/pi/drivers/amadeus-pi-driver.ts:541-546`（`termination = "timed-out"`）と `:554-557` の `cleanupTimer`。`CLEANUP_WAIT_MS = 2_000`（同 `:30`）は**定数で `scaleTestTime` を通らない**。`:558` の `Promise.race([done, cleanupDeadline])` が両者を競わせる。

**仮説（確度高）**: 1 秒の予算が 4 回以上のプロセス往復を覆わねばならず、フルスイート並行負荷下でこれを超える。Issue の実測 2133ms は、1000ms で timeout が発火した後に close が遅れて着地した形と整合する。

### P4. #3035 — t07 skip-path の 300ms 予算（P3/S4）

`tests/unit/t07-hook-audit-logger.serial.test.ts:401-406`。logging path 側は `:393-399` で 500ms。計測は `fire()`（`:183-198`）が `Bun.spawnSync` の前後を `performance.now()` で挟む純粋な壁時計で、**bun のコールドスタートを含む**（`:396-397` のコメントが逐語で `The .sh measured bun cold-start + the logging path` と述べる）。**このファイルは `scaleTestTime` を一切使っていない**（`grep -c "test-time-factor"` = **0**）。両予算とも生の定数である。

**行ずれの帰属**: Issue 本文の `:395-400` は現在 `:401-406` へ 6 行ずれている。原因は `05da1758c`（PR #3052、plugin.settings）がこのファイルへ `amadeus-plugin-settings.ts` の fixture コピー 6 行を足したため（`git show --numstat 05da1758c -- <file>` → `6 0`）。主張の実体は不変。

### 4 Issue に共通する構造

#3065 / #3040 / #3035 はいずれも「負荷下のプロセス境界イベントを実時間の固定予算で待つ」形が壊れているという同一クラスであり、project.md § Testing Posture の `bt-timeout-verification-shape` に照らして構造的な逸脱である。#3034 だけが性質の違う隔離破れ。

## 3. base..observed の構造変化（23 commits / 185 files）

| # | 変化 | 所在 | 規模・根拠 |
| --- | --- | --- | --- |
| 1 | **選挙 CLI の多問化**（PR #3036） | `packages/framework/core/tools/amadeus-election*.ts` | 新規 `amadeus-election-codec.ts` 908 行 / `amadeus-election-question-tally.ts` 386 行。`amadeus-election-model.ts` は 32 行へ縮小。`scripts/amadeus-election-migrate.ts` と `tests/helpers/arbitraries/election.ts` を削除。旧テスト 7 件を削除し 13 件を新設 |
| 2 | **プラグイン rename**（PR #3051） | `plugins/pr-convergence/` → `plugins/github-pr-convergence/` | 13 ファイルまるごとの移動（`git diff --name-status -M` が `R080`〜`R100`）。ツール名・ディレクトリ内構造は不変 |
| 3 | **新規プラグイン git-drift**（PR #3055） | `plugins/git-drift/` | 4 ファイル（`git ls-files plugins/git-drift`）。`stages: []` の tool-only。`code-generation` / `build-and-test` の sensors seam へ追加。`git-drift-detect.ts` 249 行 + `amadeus-sensor-git-drift.ts` 147 行 |
| 4 | **plugin.settings 機構**（PR #3052） | `packages/framework/core/tools/amadeus-plugin-settings.ts` | 274 行（新規）。3 レイヤ override（project → space → intent）、fail-closed 解決 |
| 5 | **blocking sensor の script-error fail-closed 化**（PR #3045、`c064f9705`） | `amadeus-state.ts` `evaluateBlockingSensors` | 拒否形が 2 → 4（`never-fired` / `unresolved` / `stale` / `script-error`）。`amadeus-sensor-schema.ts` のコメントも `verifyBlockingSensors` → `evaluateBlockingSensors` へ同期 |
| 6 | その他の fix | PR #3053（autonomous park の human-turn provenance、`t3016-park-provenance.integration.test.ts` +290）/ PR #3039（Unit 失敗時の solo auto-election 経路） | — |
| 7 | 台帳 | `tests/.coverage-patch-allowlist.json` ±379（選挙改修に伴うセレクタ再アンカー）/ `metrics/` に 9 スナップショット | — |

### プラグイン数の実測

`ls plugins/` は 4 ディレクトリ（`coverage-patch-quick` / `formal-model-check` / `git-drift` / `github-pr-convergence`）を返し、`amadeus/config.json` の `plugin.activation.names` も同じ 4 要素（順序一致）。前区間の 3 から **+1**（rename は数に影響しない）。

### 選挙テストファイルの再計数

**30 件（unit 9 / integration 20 / e2e 1）**。述語: `git ls-files 'tests/**' | grep -E '/[^/]*election' | grep -vE 'selection'`。

`selection` の除外は必須である — 部分文字列一致のため `tests/integration/t415-plugin-optin-selection.integration.test.ts` と `tests/unit/t171-intent-selection.test.ts` の 2 件が混入する（いずれも選挙とは無関係）。既存 codekb の「21 ファイル（unit 7、integration 13、e2e 1）」は述語が記録されていないため、30 との差は実際の増減と述語差の合成であり、単純な増分としては読めない。

## 4. plugin 投影経路の再実測 — 履歴節の PROVEN 所見が解消している（新規所見）

`architecture.md` の `## plugin 配布の二経路と非対称なトークン置換器（…observed df1c874cf）` が N-1 / N-4 として記録した所見を、rename 後のパスで再実測したところ**結論が逆になっていた**。

| 述語（再実行可能） | 当時（`df1c874cf`） | 本スキャン（`d64fd7cac`） |
| --- | --- | --- |
| `diff -r plugins/github-pr-convergence dist/plugins/github-pr-convergence/<h>/plugins/github-pr-convergence` を 8 harness へ適用 | 旧パスで 8/8 IDENTICAL（`transform()` が no-op） | **8/8 DIFFERS** |
| `grep -rn "amadeus-sensor.ts\|bun plugins/\|bun \.claude" plugins/ --include="*.md"` | 12 行 | **0 行 / exit 1** |
| `grep -rln "{{HARNESS_DIR}}" plugins/` | — | **8 ファイル**（token 総数 21） |
| `find dist/<h> -maxdepth 3 -name plugins` を 8 harness へ適用 | 8/8 で 0 hit | 7 harness で 0、**opencode のみ 1**（`dist/opencode/.opencode/plugins`） |

DIFFERS の中身は `{{HARNESS_DIR}}` トークンの harness 別展開であり（例: `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md:4` の `bun {{HARNESS_DIR}}/plugins/.../amadeus-sensor-pr-convergence-report-format.ts` が claude 導入バンドルでは `bun .claude/plugins/...`）、drift ではない。

**測定条件の明示**: `dist/` と self-install ツリーは gitignore 対象のローカル生成物であり、上表はスキャン時点の作業ツリーに存在する build 出力を対象とした実測である。追跡ファイルからは再導出できない。

## 5. blocking sensor 在庫の再実測

述語: `for f in $(git ls-files | grep -E '(^|/)sensors/.*\.md$') tests/fixtures/blocking-sensor/amadeus-blocking-probe.md; do grep -m1 '^default_severity:' "$f"; done`。対象は追跡済み sensor manifest 全 14 件 + fixture 1 件。

**shipped の blocking は 2 件で件数は不変、パスが 1 件変わった**:

| manifest | severity |
| --- | --- |
| `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md:5` | `blocking`（旧 `plugins/pr-convergence/sensors/...`） |
| `tests/fixtures/blocking-sensor/amadeus-blocking-probe.md:5` | `blocking`（fixture） |

残る 13 件（core 11 + `plugins/formal-model-check/sensors/amadeus-model-completeness.md` + `plugins/git-drift/sensors/amadeus-git-drift.md`）はすべて `advisory`。**新設の git-drift sensor は blocking ではない**。

## 6. 旧パス literal の扱い — 履歴節では保存する（方針の明示）

`grep -rn "plugins/pr-convergence" amadeus/spaces/default/codekb/amadeus/*.md` は本スキャン開始時に **55 hit**（内訳: `code-structure` 21 / `architecture` 10 / `component-inventory` 9 / `api-documentation` 7 / `reverse-engineering-timestamp` 4 / `code-quality-assessment` 2 / `dependencies` 2）。

このうち**履歴節（`履歴` ラベル + observed 宣言を持つ節）に属する hit は書き換えていない**。`cid:reverse-engineering:c1` が「履歴節の file:line はその節が宣言する observed commit で照合する」と定めるとおり、rename 以前の観測断面を宣言する節では旧パスが**正しい記述**であり、これを新パスへ書き換えると当該 observed 断面では再導出できない記述になる（履歴の改竄にあたる）。

書き換えたのは現在断面を記述する節のみ:

| artifact | 更新した節 | 件数 |
| --- | --- | --- |
| `dependencies.md` | `## Internal Dependency Graph`（日付なし = 現行構造） | 2 |
| `code-structure.md` | `## Repository Organization` + `## Focus Area: PR Convergence`（いずれも日付なし = 現行構造） | 11 |

更新後の総数は **49 hit** で、内訳は次のとおり（`awk` で各 hit の直近 H2 を採り、見出しに `履歴` を含むかで分類。予測値ではなく実行出力からの転記）:

| 分類 | 件数 | 内容 |
| --- | --- | --- |
| 履歴節に属する | **42** | rename 以前の observed 断面を宣言する節。上記の理由により保存する |
| 本 intent の新規節に属する | **7** | すべて「旧 `plugins/pr-convergence/` → 新 `plugins/github-pr-convergence/`」という **rename の説明として旧パスを名指す散文**（`api-documentation:2021` / `architecture:5261` / `code-quality-assessment:3631` / `code-structure:268` `:270` / `component-inventory:2724` / `reverse-engineering-timestamp:13`）。現行パスの誤記ではない |

したがって「旧パス literal 残存ゼロ」という機械条件は本スキャンでは**意図的に満たしていない**。満たすには履歴節の改竄か、rename の説明そのものの削除が必要になり、いずれも `cid:reverse-engineering:c1` と `cid:requirements-analysis:mechanism-cite-verify-at-draft` に反する。**現行構造を記述する節に旧パスが残っていないこと**が正しい検査条件であり、上表がそれを満たすことを示す。

あわせて、observed が `d64fd7cac` でない `現在` マーカー **17 節**を `履歴` へ降格した（`cid:reverse-engineering:c1`）。内訳: `business-overview` 2 / `dependencies` 1 / `api-documentation` 2 / `code-structure` 2 / `code-quality-assessment` 3 / `technology-stack` 1 / `architecture` 2 / `component-inventory` 2 / `reverse-engineering-timestamp` 2。

## 7. 更新した codekb artifact（9 面）

| artifact | 更新内容 |
| --- | --- |
| `business-overview.md` | 新規節「優先バグ 4 件の業務影響」。プラグイン数 4、選挙の多問化、plugin.settings を利用者視点で一文ずつ記述 |
| `technology-stack.md` | 新規節。プラグイン 4 の実測、選挙モジュールの行数実測（前区間の「model 550 / store 719 / CLI 853 / migration 580」が失効）、plugin.settings |
| `dependencies.md` | `## Internal Dependency Graph` のパス 2 件を rename 反映 + 新規節（plugin.settings の依存エッジ図、git-drift の依存） |
| `code-structure.md` | `## Repository Organization` にプラグイン 4 行 + `## Focus Area: PR Convergence` の 10 行を rename 反映 + 新規節（プラグイン配置表、選挙モジュール表、テスト再計数 30、患部 4 件の所在） |
| `api-documentation.md` | 新規節。選挙 CLI の 9 verb（不変）と戻り値型の多問化、codec / question-tally / plugin-settings の全エクスポート面、rename 後の CLI パス |
| `architecture.md` | 新規節。plugin.settings のレイヤ解決機構（図 + テキストフォールバック）、plugin 投影 2 経路の再実測（§4）、患部 4 件のアーキテクチャ境界 |
| `component-inventory.md` | 新規節。codec / question-tally / plugin-settings / git-drift の追加、削除面（migrate script、旧テスト 8 件、arbitraries）の履歴降格 |
| `code-quality-assessment.md` | 新規節。blocking sensor 在庫の再実測（§5）、script-error fail-closed 化の 4 拒否形、実時間予算に依存する検証面の債務整理 |
| `reverse-engineering-timestamp.md` | 本 intent の実行メタデータ節を先頭へ追記 + 既存 2 節の現在時制マーカーを履歴へ降格 |

## 8. 述語一覧（再実行可能。すべて worktree ルート）

| ID | 述語 | 結果 |
| --- | --- | --- |
| Q0 | `git rev-parse HEAD` | `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7` |
| Q1 | `git merge-base --is-ancestor 1d08374cd HEAD` | exit 0 |
| Q2 | `git rev-list --count 1d08374cd..HEAD` | **23** |
| Q3 | `git diff --stat 1d08374cd HEAD -- ':!amadeus/'` | `185 files changed, 14769 insertions(+), 6942 deletions(-)` |
| Q4 | `git merge-base --is-ancestor d64fd7cac origin/main` / `git rev-list --count d64fd7cac..origin/main` | exit 0 / **1** |
| Q5 | `git diff --name-only d64fd7cac origin/main -- ':!amadeus/' ':!metrics/'` | **0 件** |
| Q6 | `ls plugins/` | **4**（`coverage-patch-quick` / `formal-model-check` / `git-drift` / `github-pr-convergence`） |
| Q7 | `amadeus/config.json` の `plugin.activation.names` | 同じ **4 要素**（順序一致） |
| Q8 | `git ls-files 'tests/**' \| grep -E '/[^/]*election' \| grep -vE 'selection' \| wc -l` | **30**（unit 9 / integration 20 / e2e 1） |
| Q9 | `wc -l packages/framework/core/tools/amadeus-election*.ts` | codec 908 / store 1232 / CLI 804 / record 651 / question-tally 386 / transport 301 / model 32 |
| Q10 | `wc -l packages/framework/core/tools/amadeus-plugin-settings.ts` | **274** |
| Q11 | `git ls-files plugins/git-drift` | **4 ファイル** |
| Q12 | `git grep -n "8192" -- '*.ts'` | **0 行 / exit 1**（エラーなく不一致） |
| Q13 | `grep -c "test-time-factor" tests/unit/t07-hook-audit-logger.serial.test.ts` | **0** |
| Q14 | `grep -rn "amadeus-sensor.ts\|bun plugins/\|bun \.claude" plugins/ --include="*.md"` | **0 行 / exit 1** |
| Q15 | `grep -rln "{{HARNESS_DIR}}" plugins/` | **8 ファイル**（token 総数 21） |
| Q16 | `default_severity: blocking` を持つ manifest（追跡済み sensor 14 + fixture 1 が母数） | **2 件** |
| Q17 | `git ls-files packages/framework/core/tools \| wc -l` | **166** |
| Q18 | `git diff --name-status -M 1d08374cd HEAD -- ':!amadeus/' ':!metrics/' \| grep -E '^(A\|D)'` | A **31** / D **9** |
| Q19 | `grep -rn "plugins/pr-convergence" amadeus/spaces/default/codekb/amadeus/*.md \| wc -l` | 開始時 **55** → 更新後 **49**（履歴節 42 + rename 説明の散文 7。現行構造を記述する節での残存は **0**。§6） |
| Q20 | `git show --numstat 05da1758c -- tests/unit/t07-hook-audit-logger.serial.test.ts` | `6 0`（#3035 の行ずれ帰属） |

**grep exit code の注意**（`cid:reverse-engineering:c6-absence-predicate-exit-code`）: Q12 / Q14 の空出力はいずれも **exit 1**（不一致）であって exit 2（エラー）ではないことを確認済み。`cid:reverse-engineering:c6-ugrep-word-boundary` に従い `\b`（語境界）を含む述語は使っていない。

## 9. Verification

- 選定 base = `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780`（observed の祖先で距離 **23**、Q1 / Q2 の実測による）
- git 状態変更（commit / branch / checkout / stash / merge）: **ゼロ**
- GitHub への書込: **ゼロ**
- engine / state ツール（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）の実行: **ゼロ**
- `bun run build` の実行: **ゼロ**（§4 の `dist/` 実測はスキャン時点で既に存在した build 出力を読んだだけ）
- 書き込み先: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（record dir への書込なし）
- scratch ファイルは repo 外（`/private/tmp/claude-501/.../scratchpad`）で実行
