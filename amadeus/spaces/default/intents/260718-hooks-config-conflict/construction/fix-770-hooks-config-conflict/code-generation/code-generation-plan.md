# Code Generation Plan — hooks-config-conflict（Issue #770）

上流入力（consumes全数）: `inception/requirements-analysis/requirements.md`（FR-1〜FR-4、NFR-1〜NFR-6、制約、E-770-RA裁定）

bugfix スコープのため units-generation / design は SKIP（consumes_absent expected）。要件の所有境界を一つの Bolt / 一つの PR で閉じる。通常CIの hermetic 検証と実 agmsg / Codex monitor の live acceptance は別ゲートとし、前者がgreenでも後者が未成立なら完了扱いにしない。

実装中に、self移行のpreflightをtest内だけへ置くとfixture自身を検証する循環になることが判明したため、planの逸脱停止条項に従って実装前に停止した。E-770-CG1（2026-07-18、e1 / e3 / e4の3/3全会一致）でA案を採用し、共有 `amadeus-codex-hooks.ts` にself専用 `migrate-self --target-ref` production seamを追加する。read-only preflight、repository外backupとSHA照合、fast-forward、復元、postcheckを製品境界とし、consumerのGit index操作とは分離する。

Iteration 1のarchitecture reviewで、helperを`packages/framework/core/tools/`へ置くと全harnessへ投影され、Codex限定スコープとcore中立性に反することが判明した。E-770-CG2（2026-07-18、leader裁定）でA案を採用し、helperを`packages/framework/harness/codex/tools/`へ移設してCodex manifestだけから配布する。core utilityはstatic importせず、Codex doctor分岐からproject-local helperの`doctor --json`をsubprocess起動して固定schemaだけを読む。E-770-CG1のproduction migration seam意味論は変更しない。

## 成功条件

- tracked canonical は `.codex/hooks.json.example` だけとし、local active `.codex/hooks.json` は untracked / ignored のまま writer 再適用後も Git clean を保つ。
- fresh 起動経路は writer / Codex 起動より前に active を一度だけ活性化し、既存 active を上書きしない。
- doctor は canonical と active の Amadeus adapter tuple multiset を意味比較し、非Amadeus追加・順序・minify差を許容しつつ、欠落・誤配置・重複・obsolete・invalid を秘密情報なしで区別する。
- self repository と packaged consumer の移行契約を実 Git fixture で検証し、setup / launcher / doctor は consumer の Git index を操作しない。
- 実装後、手動 inbox poller を停止した状態で実 monitor の起動・人手再起動・一意pingのpush配送・leaderへの返信を実証する。

## 実装順序

1. [x] **REDとfixture seamを先に固定する**
   - 新規 `tests/integration/t-codex-hooks-ownership.test.ts` に fresh activation、writer初回 / 再適用、canonical 9 hooks、Git clean、active不在のloud failure、意味doctorの正負ケースを追加する。
   - 新規 `tests/integration/t-codex-hooks-migration.test.ts` に旧tracked activeでwriter後dirtyとなるRED control、self fast-forward移行、packaged consumer移行と拒否ケースを追加する。
   - `tests/integration/t-team-up-codex-resume.test.ts` を拡張し、fake delivery writerが呼ばれる時点でactiveが存在することを観測する。`run-codex.sh` はfake shimで同じ順序を観測する。
   - production変更前に対象testを実行して非0を記録し、修正後に同じtestをgreenへ反転する。

2. [x] **canonical / active の所有境界と共有activationを実装する**
   - `packages/framework/harness/codex/tools/` に新runtime dependencyを持たないCodex専用 hooks helperを置き、active不在時だけexampleをbyte copyする。example不在・parse不能・copy失敗は区別して非0、既存activeはbyte不変とする。
   - `scripts/run-codex.sh` はagmsg shimより前、`scripts/team-up.sh` はdelivery writerより前に同じhelperを呼ぶ。
   - root `.gitignore` と `packages/framework/harness/codex/dot-gitignore` にactiveを追加し、root `.codex/hooks.json`を追跡解除する。`.codex/hooks.json.example`のgeneratorは変更しない。

3. [x] **doctorの意味契約を実装する**
   - Codex専用helperにJSON parseとAmadeus adapter tuple `(event, matcher|null, type, command)` のmultiset比較を純粋seamとして実装する。
   - `packages/framework/core/tools/amadeus-utility.ts` はCodex doctor分岐でproject-local helperの`doctor --json`をsubprocess起動し、固定schemaだけを読む。Codex専用moduleをstatic importしない。
   - 診断は不足 / 余剰tupleと非破壊の復旧案内だけを返し、active全文、非Amadeus command、秘密値、local絶対pathを出さない。

4. [x] **二つの移行契約を隔離Gitで閉じる**
   - self fixtureではrepository外退避とSHA-256照合、`git merge --ff-only`、byte復元、untracked / ignored / clean、unmerged 0、stash増分0、doctor PASSを検証する。
   - unrelated dirty / staged / unmerged、target契約不足、non-fast-forwardはactive移動前に失敗し、HEADとbytesを変えないことを検証する。通常pull、更新前`git rm --cached`が安全な代替にならないREDも保持する。
   - packaged consumer fixtureではpackage updateがactive bytes / indexを変更しないこと、consumer自身の`git rm --cached -- .codex/hooks.json`とcommit後に契約が成立することを検証する。fixtureがsetup専用分岐や製品用migration CLIを必要と実証した場合は、実装を止めてleaderへ逸脱報告する。

5. [x] **配布面と文書面を同期する**
   - Codex manifestの`harnessFiles`でhelperをCodexだけへ投影し、`bun scripts/package.ts` と `bun run promote:self` でroot / distを正本から再生成する。distを手編集せず、他harnessにhelperを配布しない。E-770-CG2で変更するshared core utilityのbytesは全harnessへ同期するが、Codex以外の分岐動作は変更しない。
   - `README.md`、Codex guide日英、`docs/amadeus-files.md`日英、`docs/reference/14-claude-features.md`日英へcanonical / active所有者、fresh activation、doctor、self / consumer別migration、trust確認を反映する。
   - self手順に通常pullや更新前`git rm --cached`を案内せず、tracked面にmachine / clone固有絶対pathを残さない。

6. [x] **品質・回帰ゲートを通す**
   - 対象test、`bun run typecheck`、`bun run lint`、`bash tests/run-tests.sh --ci`、`bun run dist:check`、`bun run promote:self:check`を実行する。
   - deslop review後に `bun run coverage:ci` とpatch coverage gateを実行し、diff追加行の未カバーを0にする。
   - 別agentの `amadeus-architecture-reviewer-agent` で最大2 iteration、その後さらに独立した2名のレビューを受ける。指摘反映後に全ゲートを再実行してpush / PR作成へ進む。

7. [x] **実monitorのlive acceptanceを行う**
   - 手動 inbox pollerを停止し、実際の `./scripts/run-codex.sh` から新規セッションを起動する。
   - 最初のturn後にdelivery mode `monitor` とbridge `alive`を確認する。
   - 人間がセッションを再起動して1 turn送り、leaderから一意pingを送信する。手動`inbox.sh`なしでpush表示され、その返信がleaderへ届くことを確認する。
   - agmsg / Codex version、mode、bridge status、ping識別子、送受信時刻をevidenceへ記録する。失敗または未実施ならCode Generation / Issueを完了しない。
   - 2026-07-18T10:59:28Z、第3回nonce `LIVE-ACCEPT-3RD-20260718T105813Z-7129-770`のauto-push受信とverbatim返信到達をleaderが確認した。bridgeはPID `29624`でalive、leader側の2秒間隔process監視で受信窓内の`inbox.sh` / `history.sh`実行0件を独立実測した。第1回の手動取得は証拠から除外し、第2回の曖昧な成立宣言はP2に従い撤回した経緯を`code-summary.md`へ記録した。

## 実装規律

- 作業は検証済みBolt worktree `bolt-hooks-config-conflict` 内だけで行い、ユーザー所有のmain cloneのdirty active / 旧intent state / auditへ触れない。
- application / test変更は `amadeus-developer-agent` へ委譲し、plan承認後に開始する。レビューagentは実装agentと分離する。
- 本番コードへtest専用env・分岐を追加せず、setupへCodex専用Git-index操作を追加しない。
- 外部agmsg 1.1.7のwriter path / mode設計と`.codex/agmsg-delivery-mode`は変更しない。Codex専用helperを他harnessへ配布せず、shared core utility更新でもCodex以外の分岐動作を変更しない。
- PR mergeはユーザーの明示承認後にleaderが執行する。

## トレーサビリティ

| 工程 | 要件 |
| --- | --- |
| 1 | AC-1c / AC-1d / AC-3b〜3d / AC-4a〜4c |
| 2 | AC-1a〜1c / AC-2a / AC-3a / NFR-1〜5 |
| 3 | AC-1d / AC-4a / NFR-2 / NFR-6 |
| 4 | AC-1e / AC-2d〜2e / AC-4f〜4g |
| 5 | AC-1b / AC-1f / AC-2a〜2c / AC-3e |
| 6 | AC-2b / AC-4b / 制約 |
| 7 | AC-3d / AC-4d〜4e |

## レビュー

- 実装reviewer: `amadeus-architecture-reviewer-agent`（max 2 iterations）。
- PR前reviewer: 実装と独立した2名。
- live acceptanceは通常review / CIで代替せず、最終evidenceをleaderへ報告する。
