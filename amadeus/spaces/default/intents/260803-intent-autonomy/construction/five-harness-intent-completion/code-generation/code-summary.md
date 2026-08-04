# Code Summary — five-harness-intent-completion

## 実装結果

U5 `five-harness-intent-completion`（Issue #2067）は、現行5 harnessのcredential-attested receiptを検証するharness-neutralなopt-in適合性機構として実装した。receipt cohortの完全一致はlive verification evidenceの条件であり、CoreのIntent completion条件ではない。credentialまたはnative capabilityが不足する場合はliveを理由付きskipとし、通常のworkflow completionを妨げない。

## 主な変更

- `packages/framework/core/tools/amadeus-harness-registry.ts` と `packages/framework/harness/registry.ts`
  - Claude Code、Codex、Cursor、OpenCode、Kimi Code、Kiro、Kiro IDEのcanonical registryを追加した。
  - package / self-install / live cohortを同じrowから導出し、hard-coded cohortの重複を除去した。
- `packages/framework/core/tools/amadeus-intent-completion.ts`
  - credential-attested authorization、reconcile-first reservation、single-use dispatch permit、canonical dispatch claim、native idempotency receipt検証を実装した。
  - auth / audit / Judge / automatic decision evidenceを検証し、missing、duplicate、skip、forgery、revision / binding mismatchをfail-closedにした。
  - all-five live verification evidence、検証transaction、memory ledger、snapshot reload、idempotent replay、U4 completed review seedを実装した。Core terminal pathはこのevidenceをimportしない。
- `packages/framework/core/tools/amadeus-loop-monitor-runtime.ts`、`amadeus-intent-autonomy.ts`、`amadeus-intent-autonomy-runtime.ts`
  - live authorization metadataを後方互換で拡張し、terminal projectionとしてworkflow / current grantのclearを合法化した。
  - terminal live completion capabilityを有効化した。
- `packages/framework/core/tools/amadeus-audit.ts`、`packages/framework/core/otel/event-registry.ts`、`packages/framework/core/knowledge/amadeus-shared/audit-format.md`、`docs/reference/12-state-machine.md`
  - `INTENT_COMPLETION_TRANSACTION_COMMITTED` をcanonical 86件目のaudit eventとして同期した。
  - typed repository event constructionもemitter drift guardが認識するようにし、U4 / U5のtaxonomy追従を検証した。
- `tests/unit/t434-intent-completion.test.ts`
  - registry、authorization absence、single-use dispatch、all-five happy path、terminal atomicity / replay、U4 continuation、missing / duplicate / skip / forged / mismatch / partial transaction拒否を検証した。
- `tests/integration/t434-intent-completion-five-harness-projection.integration.test.ts`
  - 現行5 harnessの配布物が同一registry / completion Core bytesを持つことを検証した。
- `tests/integration/t434-intent-completion-live-seam.integration.test.ts`
  - 5 harnessすべての明示的live attestationが存在する場合だけ動くopt-in seamを追加した。
- package generatorにより全7配布treeを同期し、現行5 self-install harnessへ共通Coreをpromoteした。

## 安全境界

- credential / attestation metadataがないauthorizationは `PROVENANCE_REQUIRED` で拒否する。
- receiptはimplementation revision、package digest、registry revision、scenario revision、Intent / grant、native operation / attemptへ束縛する。
- 5 harnessのどれか1件でも欠落・重複・不一致ならlive verification transactionを開始しない。
- live verification transactionは部分receiptを成功として返さず、event identitiesとprojection revisionの完全一致を要求する。
- PR / GitHub / merge、外部runner / supervisor、credential管理はCoreへ含めていない。

## 検証結果

- focused U5 unit: 6 tests / 33 expects、全件pass。
- five-harness projection: 5 tests / 10 expects、全件pass。
- U4 / U5 focused suite: 15 pass / 1 live skip、失敗0。
- Event Registry / coverage focused suite: 58 tests / 1,832 expects、全件pass。
- `bun run typecheck`: pass。
- 対象Biome check: warning / errorともに0。
- `bun run lint`: exit 0。repository既存baselineの398 warnings / 23 infosがあり、新規U5 fileのwarningは0。
- integration verbose再実行: 404 test files / 4,787 assertions、失敗0。
- 最終focused regression: 52 pass / 1 live skip / 0 fail、632 expects。
- `bun tests/gen-coverage-registry.ts --check`: pass。
- `bun scripts/package.ts --check`: 全7生成treeでpass。
- `bun run promote:self:check`: 現行5 self-install harnessでpass。
- `git diff --check`: pass。

## 全体CIと再実行

初回 `bun run test:ci` は768 test filesを完走し、4 files / 5 assertionsが失敗した。確認できた決定的失敗は、U4 / U5で追加された2監査イベントが `docs/reference/12-state-machine.md` とtyped repository emitter検出へ未反映だった `t48-audit-event-emitters` と、そのmeta-testである `t52-drift-meta-validation` だった。taxonomyとdrift guardを修正後、両ファイルは22 tests / 41 expectsで全件passした。

初回出力で名称を保持できなかった残り2ファイルは、全integrationをverboseで再実行しても再現せず、404 / 404 filesがpassした。重い既知suiteもtimeoutせずpassしており、U5回帰は確認されなかった。AWS credentialsは無効または期限切れのため、runner規則によりlive SDK / substrate testはskipされた。

## Live verification

実live verificationは0件である。`AMADEUS_INTENT_COMPLETION_LIVE=1` とnative command設定がそろっていないため、U5 live seamは1件skipした。

- `AMADEUS_CLAUDE_LIVE_ATTESTATION`
- `AMADEUS_CODEX_LIVE_ATTESTATION`
- `AMADEUS_CURSOR_LIVE_ATTESTATION`
- `AMADEUS_OPENCODE_LIVE_ATTESTATION`
- `AMADEUS_KIMI_LIVE_ATTESTATION`

このskipはlive passではないが、Core Intent completionのblockerでもない。test double以外のreceiptやattestationは生成していない。

## 残作業

実credential-attestationを利用したall-five live receiptの取得は環境依存の任意検証として残る。Core Intent completionとは独立して後から実行できる。
