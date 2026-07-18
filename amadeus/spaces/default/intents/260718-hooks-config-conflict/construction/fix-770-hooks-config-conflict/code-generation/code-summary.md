# Code Summary — hooks-config-conflict（Issue #770 / 工程1〜6）

上流入力（consumes全数）: `code-generation-plan.md`、`../../../inception/requirements-analysis/requirements.md`（FR-1〜FR-4、NFR-1〜NFR-6、制約、E-770-RA裁定）、E-770-CG1（agmsg裁定 2026-07-18T02:02:48Z、self移行 production seam=A）、E-770-CG2（Codex helper配置=A: harness専用sourceからproject-local `.codex/tools/`へ投影）

## 現在の判定

工程1〜6の実装、最新`origin/main`統合、配布同期、独立レビュー、deslop、focused / full回帰、local lcovとpatch coverage gate、branch push、Draft PR [#1212](https://github.com/amadeus-dlc/amadeus/pull/1212)の作成は完了した。tracked canonical `.codex/hooks.json.example` とignored per-clone active `.codex/hooks.json` の所有境界、起動前activation、意味doctor、self / packaged consumer別の移行契約を実装・検証済みである。

一方、実agmsg / Codex monitorのlive acceptanceは **PENDING** である。2026-07-18T02:28:59Zの実測ではdelivery modeは`monitor`、Codex app-serverは起動していたが、bridgeは旧名`codex`に結び付いたままで、登録済み`amadeus/codex-1`と`amadeus/codex-2`はいずれも`not running`だった。人間による再起動、最初のturn、一意pingのpush受信、leaderへの返信が未成立であるため、本Issue / Code Generationを完了扱いにしない。

## 実装内容

| 区分 | パス | 内容 |
| --- | --- | --- |
| 新規 | `packages/framework/harness/codex/tools/amadeus-codex-hooks-contract.ts` | activation、canonical / activeの構造検査、adapter tuple multiset比較、秘匿済みdoctor契約を実装 |
| 新規 | `packages/framework/harness/codex/tools/amadeus-codex-hooks-migration.ts` | self専用`migrate-self --target-ref`のpreflight、private backup、fast-forward、復旧、postconditionを実装 |
| 新規 | `packages/framework/harness/codex/tools/amadeus-codex-hooks.ts` | `activate` / `doctor [--json]` / `migrate-self`のCLIと公開APIを実装 |
| 変更 | `packages/framework/harness/codex/manifest.ts` | 上記3モジュールをCodex限定でproject-local `.codex/tools/`へ投影 |
| 変更 | `packages/framework/core/tools/amadeus-utility.ts` | project-local helperを`doctor --json` subprocessとして呼び、固定schema・reason・exit codeを検証して意味doctorへ接続 |
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
- unsafe controls: dirty tracked activeへの直接merge、autostash付きpull、更新前`git rm --cached`が安全な代替にならないことを保持。

## 検証結果

- focused 6ファイル合算: **137 pass / 1 skip / 0 fail / 2556 assertions**
- `bun test tests/integration/t-codex-hooks-ownership.test.ts`: **16 pass / 0 fail**
- `bun test tests/integration/t-codex-hooks-migration.test.ts`: **48 pass / 1 skip / 0 fail**（macOSが不正UTF-8 filenameを作成できないためLinux専用1件のみskip）
- `bun test tests/integration/t-codex-hooks-packaged-consumer.test.ts`: **2 pass / 0 fail / 76 assertions**
- `bun test tests/integration/t-team-up-codex-resume.test.ts`: **46 pass / 0 fail / 436 assertions**
- `bun test tests/integration/t-run-codex-project-target.test.ts`: **15 pass / 0 fail / 60 assertions**
- `bun test tests/unit/t150-codex-packaging.test.ts`: **10 pass / 0 fail**
- `bun run coverage:ci`（最新`origin/main`統合後）: **380 test files / 5413 assertions / 0 fail / RESULT: PASS**
- staged production diff × focused LCOV: **1001 measured / 1001 covered / 0 allowlisted / 0 uncovered**
- staged diff × full LCOV: **852 measured / 852 covered / 0 allowlisted / 0 uncovered**
- `bun run typecheck`: **PASS**
- `bun run lint`: **exit 0**（既存complexity warningのみ、新規errorなし）。新規helper / manifest / focused testのBiome checkはwarning 0。
- `bun run dist:check` / `bun run promote:self:check`: **PASS**（全harness / self-install同期）
- `bun tests/gen-coverage-registry.ts --check`: **PASS**
- `bash -n scripts/run-codex.sh scripts/team-up.sh`: **PASS**
- `git diff --check` / staged diff check: **PASS**
- architecture review Iteration 2: **READY**、migration / security独立cross-review: **APPROVE**、deslop: **APPROVE（blocking 0）**

## 未完了ゲート

- Draft PR [#1212](https://github.com/amadeus-dlc/amadeus/pull/1212)のready化、ユーザー明示承認後のmerge、公開・統合に伴う後続工程
- 実monitorの人手再起動後live acceptance（bridge alive、一意ping push受信、返信到達）
- Construction phase boundaryへ進む個別delegate（常任グラント対象外）

これらは通常のhermetic testで代替しない。特にlive acceptanceが成立するまで[Issue #770](https://github.com/amadeus-dlc/amadeus/issues/770)は完了不可とする。

## Review

**判定:** READY
**日付:** 2026-07-18
**Iteration:** 2

Iteration 1のMajorはすべて解消された。Codex専用helperはharness sourceへ分離され、3責務のmodule境界、project-local doctorの固定schemaと秘匿、consumer backupのrepository外検証と限定stage、`run-codex.sh`のproject解決、merge / filesystem失敗時のactive復元が実装・テストされている。focused再実測は108 pass / 1 OS依存skip / 0 fail / 2019 assertionsだった。非Codex 5 packageの`--check`はhelper漏洩0で、各harnessの既知の`amadeus-utility.ts`差分1件だけを報告した。Codex dist / selfのdriftはreview承認後の正本再生成待ちであり、source architectureの不備ではない。

### Findings

| # | 重要度 | 場所 | 指摘 | 推奨対応 |
| --- | --- | --- | --- | --- |
| 1 | Minor | `code-summary.md`「主要な契約」 | 「欠落・余剰・誤配置・重複をreason codeで区別する」という記述は実装より強い。実装ではこれらを`TUPLE_MISMATCH`へ集約し、`missing` / `extra`診断で区別している。秘匿と判定能力に支障はなく、blockingではない。 | 後続artifact更新時に「JSON / 構造 / tuple mismatchをreason codeで区別し、tuple差分は秘匿済みmissing / extra診断で示す」と記述を合わせる。 |

### 未完了の必須ゲート

実agmsg / Codex monitorのlive acceptanceは引き続き**PENDING**である。`scripts/run-codex.sh`からの人手再起動後に、monitor processの起動、新identityでのbridge接続、一意pingのpush受信、leaderへのreply到達を実測するまで、本IssueおよびCode Generationを完了扱いにしてはならない。このlive gateはhermetic testで代替しない。
