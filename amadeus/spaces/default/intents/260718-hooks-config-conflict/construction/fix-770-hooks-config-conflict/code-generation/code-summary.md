# Code Summary — hooks-config-conflict（Issue #770 / 工程1〜7）

上流入力（consumes全数）: `code-generation-plan.md`、`../../../inception/requirements-analysis/requirements.md`（FR-1〜FR-4、NFR-1〜NFR-6、制約、E-770-RA裁定）、E-770-CG1（agmsg裁定 2026-07-18T02:02:48Z、self移行 production seam=A）、E-770-CG2（Codex helper配置=A: harness専用sourceからproject-local `.codex/tools/`へ投影）

## 現在の判定

工程1〜7の実装、最新`origin/main`統合、配布同期、独立レビュー、deslop、focused / full回帰、local lcovとpatch coverage gate、branch push、Draft PR [#1212](https://github.com/amadeus-dlc/amadeus/pull/1212)の作成は完了した。tracked canonical `.codex/hooks.json.example` とignored per-clone active `.codex/hooks.json` の所有境界、起動前activation、意味doctor、self / packaged consumer別の移行契約を実装・検証済みである。

実agmsg / Codex monitorのlive acceptanceは、第1回の手動取得を不採用、第2回の曖昧な証跡を撤回したうえで、第3回にleaderの独立process監視付きで **PASS** した。`amadeus/codex-1` bridgeからこのthreadへ一意nonceが自動pushされ、verbatim返信がleaderへ到達した。通常CIとは別の必須live gateとして成立しており、残りはCI是正を含むPR ready化とConstruction phase boundaryである。

## 実monitor live acceptance証跡（AC-4d / AC-4e）

実行環境はagmsg `1.1.7`、Codex CLI `0.144.5`、delivery mode `monitor`、identity `amadeus/codex-1`、bridge `alive`（PID `29624`）である。

| 時刻（UTC） | 観測 | 判定 |
| --- | --- | --- |
| 2026-07-18T10:53:54Z | leaderが第1回nonceを送信したが、こちらが明示的に`inbox.sh`を実行して取得した。受信方法を`manual`と申告した。 | 自動pushの証拠から除外 |
| 2026-07-18T10:55:12Z〜10:57:51Z | 第2回nonceの自動pushと返信は成立したが、別用途のcoverage processに対する`write_stdin`待機をユーザーが「ポーリング」と観測した。`write_stdin`はagmsg inbox取得ではないものの、P2に従い曖昧な成立宣言を撤回した。 | 不採用 |
| 2026-07-18T10:58:13Z | leaderが第3回nonce `LIVE-ACCEPT-3RD-20260718T105813Z-7129-770`を送信し、2秒間隔のprocess連続サンプリングを開始した。 | 検証開始 |
| 2026-07-18T10:58:47Z | nonceをこのCodex threadの`agmsg delivered`自動pushだけで受信し、verbatim引用と`受信方法=auto-push`を`send.sh`で返信した。送信から返信まで34秒。 | push受信・返信成立 |
| 2026-07-18T10:59:28Z | leaderが返信到達と、監視窓内の`inbox.sh` / `history.sh`実行0件を独立確認し、AC-4d成立を宣言した。 | **PASS** |

第1回の手動取得と第2回の撤回も失敗証跡として残す。第3回はleader側のprocess連続サンプリングを加えたため、こちらの自己申告だけに依存しない。別identity `codex-2`のprocessは本acceptanceの受信経路ではなく、成立判定は`amadeus/codex-1` bridgeとnonceを受信したこのthreadに限定した。

## 実装内容

| 区分 | パス | 内容 |
| --- | --- | --- |
| 新規 | `packages/framework/harness/codex/tools/amadeus-codex-hooks-contract.ts` | activation、canonical / activeの構造検査、adapter tuple multiset比較、秘匿済みdoctor契約を実装 |
| 新規 | `packages/framework/harness/codex/tools/amadeus-codex-hooks-migration.ts` | self専用`migrate-self --target-ref`のpreflight、private backup、fast-forward、復旧、postconditionを実装 |
| 新規 | `packages/framework/harness/codex/tools/amadeus-codex-hooks.ts` | `activate` / `doctor [--json]` / `migrate-self`のCLIと公開APIを実装 |
| 変更 | `packages/framework/harness/codex/manifest.ts` | 上記3モジュールをCodex限定でproject-local `.codex/tools/`へ投影 |
| 変更 | `packages/framework/core/tools/amadeus-utility.ts` | project-local helperを`doctor --json` subprocessとして呼び、固定schema・reason・exit codeを検証して意味doctorへ接続。Codex CLI不在時はversion probeを起動せず、doctorの`codex CLI on PATH`失敗行へ正規化 |
| 変更 | `scripts/run-codex.sh` | agmsg Codex shimより前にactiveを活性化し、helper不在・活性化失敗をloud failureにする |
| 変更 | `scripts/team-up.sh` | delivery writer / Codex member起動より前に各worktreeのactiveを活性化する |
| 変更 | `.gitignore`、`packages/framework/harness/codex/dot-gitignore` | mutable activeをignore対象へ追加 |
| 追跡解除 | `.codex/hooks.json` | local fileは保持したままGit indexから削除し、tracked canonicalを`.example`へ一本化 |
| 新規 | `tests/integration/t-codex-hooks-ownership.test.ts` | fresh activation、writer再適用、起動順、非上書き、意味doctorの正負ケース |
| 新規 | `tests/integration/t-codex-hooks-migration.test.ts` | self fast-forward移行、外部private backup、復旧、postcheck、拒否条件、危険な代替手順のRED control |
| 新規 | `tests/integration/t-codex-hooks-packaged-consumer.test.ts` | 実setup upgradeでactive bytes / SHA / indexを保持し、consumer-owned移行後の契約を検証 |
| 新規 | `tests/integration/t-run-codex-project-target.test.ts` | 15種のCodex project指定を通じ、shimとactivationが同じproject rootを解決することを検証 |
| 変更 | `tests/integration/t-team-up-codex-resume.test.ts` | delivery writer時点でactiveが先に存在することを検証 |

## 主要な契約

- activationはactive不在時だけcanonicalをbyte copyする。既存activeは意味的に正しければbyte不変、stale / invalidなら上書きせず非0で停止する。
- doctorは`(event, matcher|null, type, command)`のmultisetを比較する。順序、minify、非Amadeus hook追加を許容し、JSON不正・構造不正・tuple mismatchをreason codeで区別する。tuple差分は秘匿済みの`missing` / `extra`診断で示し、active全文、非Amadeus command、秘密suffix、未知event / matcher / type、local絶対pathを出さない。
- self移行はlocal target refをSHAへ解決し、read-only preflight、repository / Git common dir外へrealpath解決した0700 directory / 0600 backup、SHA-256照合、`merge.autoStash=false`の`git merge --ff-only`、復元、index / HEAD / stash / ignore / doctor postcheckを行う。暗黙fetch・reset・stashは行わない。
- targetのignore契約は隔離した一時Git repositoryで`git check-ignore --no-index`を実行して判定する。root / nested ignoreの順序意味を保ち、global / system / XDG / HOME / `GIT_CONFIG_*`由来のambient excludesを無効化する。
- merge前失敗はHEAD / index / activeを変えない。merge command失敗後にHEADが進んだ場合もactiveをbackupから復元し、自動resetせず`RECOVERY_REQUIRED`とbackup pathを返す。
- rename成功後のpermission / hash finalization例外はactiveを構造的に復元し、backupを保持して専用reasonを返す。Git path診断はNUL-delimited bytesから解析し、制御文字をJSON escape、不正UTF-8をhex表現する。
- packaged consumerではsetup / launcher / doctorがGit indexを操作しない。package upgrade後、consumer自身がactiveを追跡解除してcommitする。

## TDD証跡

- ownership RED: writer適用後にtracked `.codex/hooks.json`が`M`となることを観測。修正後はactivationとwriter二回適用後もclean。
- `run-codex.sh` RED: fake shimが`active hooks missing before shim`でexit 42。修正後はshimより前にactiveが存在。
- `team-up.sh` RED: fake delivery writer時点でactive不在。修正後はwriterより前にactiveが存在。
- migration RED: `migrate-self`未実装時にusage failure。修正後は成功系と拒否・復旧系33件がgreen。
- ignore隔離 RED: 後続negation、nested `.codex/.gitignore`、`GIT_CONFIG_PARAMETERS`、XDG default ignoreで誤受理を再現。意味的`check-ignore`とambient設定隔離後は全件green。
- recovery RED: merge失敗後にHEADだけ進むケースでactive消失、rename後permission finalization失敗でactive消失を再現。いずれもbackupからactiveを復元し、resetなし・backup保持へ修正。
- diagnostic RED: command suffix、未知event / matcher / type、改行を含むGit path、固定JSON schemaの余剰field受理を再現。秘匿・escape・厳密schema検証後はgreen。
- Linux CI RED: Codex CLI未導入環境で既存の`Bun.spawnSync(["codex", "--version"])`がthrowし、ownership 3件が`13 pass / 3 fail`となることを`PATH`隔離で再現した。`Bun.which("codex")`の存在確認と決定的spy回帰を追加し、同じ環境で`17 pass / 0 fail`へ反転した。
- patch coverage gate RED: `handleDoctor`のin-process駆動追加により失効条件を満たした既存allowlist 2件のうち、移動前行番号`979`がstaleとして検出された。行番号を付け替えず2件とも削除し、対象行が実測coverageを持つことと`allowlisted 0 / uncovered 0`を確認した。
- unsafe controls: dirty tracked activeへの直接merge、autostash付きpull、更新前`git rm --cached`が安全な代替にならないことを保持。

## 検証結果

- focused 6ファイル合算: **138 pass / 1 skip / 0 fail / 2562 assertions**
- `bun test tests/integration/t-codex-hooks-ownership.test.ts`: **17 pass / 0 fail / 221 assertions**
- `bun test tests/integration/t-codex-hooks-migration.test.ts`: **48 pass / 1 skip / 0 fail**（macOSが不正UTF-8 filenameを作成できないためLinux専用1件のみskip）
- `bun test tests/integration/t-codex-hooks-packaged-consumer.test.ts`: **2 pass / 0 fail / 76 assertions**
- `bun test tests/integration/t-team-up-codex-resume.test.ts`: **46 pass / 0 fail / 436 assertions**
- `bun test tests/integration/t-run-codex-project-target.test.ts`: **15 pass / 0 fail / 60 assertions**
- `bun test tests/unit/t150-codex-packaging.test.ts`: **10 pass / 0 fail**
- `bun run coverage:ci`（最新`origin/main` `9835c59cd`統合後）: **380 test files / 5421 assertions / 0 fail / RESULT: PASS**
- staged production diff × focused LCOV: **1001 measured / 1001 covered / 0 allowlisted / 0 uncovered**
- staged diff × full LCOV: **857 measured / 857 covered / 0 allowlisted / 0 uncovered**
- `bun run typecheck`: **PASS**
- `bun run lint`: **exit 0**（既存complexity warningのみ、新規errorなし）。新規helper / manifest / focused testのBiome checkはwarning 0。
- `bun run dist:check` / `bun run promote:self:check`: **PASS**（全harness / self-install同期）
- `bun tests/gen-coverage-registry.ts --check`: **PASS**
- `bash -n scripts/run-codex.sh scripts/team-up.sh`: **PASS**
- `git diff --check` / staged diff check: **PASS**
- architecture review Iteration 2: **READY**、migration / security独立cross-review: **APPROVE**、deslop: **APPROVE（blocking 0）**

## 未完了ゲート

- Draft PR [#1212](https://github.com/amadeus-dlc/amadeus/pull/1212)のready化、ユーザー明示承認後のmerge、公開・統合に伴う後続工程
- Construction phase boundaryへ進む個別delegate（常任グラント対象外）

live acceptanceは独立実測付きで成立済みである。残るPR ready化・CI・phase boundaryも省略せず、[Issue #770](https://github.com/amadeus-dlc/amadeus/issues/770)を先行して完了扱いしない。

## Review

**判定:** READY
**日付:** 2026-07-18
**Iteration:** 2

Iteration 1のMajorはすべて解消された。Codex専用helperはharness sourceへ分離され、3責務のmodule境界、project-local doctorの固定schemaと秘匿、consumer backupのrepository外検証と限定stage、`run-codex.sh`のproject解決、merge / filesystem失敗時のactive復元が実装・テストされている。focused再実測は108 pass / 1 OS依存skip / 0 fail / 2019 assertionsだった。非Codex 5 packageの`--check`はhelper漏洩0で、各harnessの既知の`amadeus-utility.ts`差分1件だけを報告した。Codex dist / selfのdriftはreview承認後の正本再生成待ちであり、source architectureの不備ではない。

### Findings

| # | 重要度 | 場所 | 指摘 | 推奨対応 |
| --- | --- | --- | --- | --- |
| 1 | Minor | `code-summary.md`「主要な契約」 | 「欠落・余剰・誤配置・重複をreason codeで区別する」という記述は実装より強い。実装ではこれらを`TUPLE_MISMATCH`へ集約し、`missing` / `extra`診断で区別している。秘匿と判定能力に支障はなく、blockingではない。 | 後続artifact更新時に「JSON / 構造 / tuple mismatchをreason codeで区別し、tuple差分は秘匿済みmissing / extra診断で示す」と記述を合わせる。 |

### Live acceptance追補

実agmsg / Codex monitorのlive acceptanceは、第3回nonce `LIVE-ACCEPT-3RD-20260718T105813Z-7129-770`で**PASS**した。leaderが送信から返信までの34秒と、同じ監視窓内の`inbox.sh` / `history.sh`実行0件を独立実測している。hermetic testで代替せず、実bridgeのauto-push受信と返信到達を証拠にした。
