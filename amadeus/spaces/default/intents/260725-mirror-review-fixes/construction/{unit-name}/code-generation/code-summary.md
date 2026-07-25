# コード生成サマリー

## 実装結果

承認済み計画の13 Stepを実行し、Mirrorレビューで指摘された6件を正本、テスト、配布物へ反映した。今回の変更範囲に属するfocused test、Mirror全suite、complexity gate、typecheck、lint、distribution/self-install drift checkは成功している。

## 要件別の変更とTDD証跡

### FR-1: lifecycle CLIの終了コード

- Red: `ask`がexit 0となり、未完了outcomeを呼び出し側が成功と誤認することを再現した。
- Green: `completed`だけをexit 0とし、`ask`、`pending`、`safety-blocked`、`suppressed`、`skipped`をexit 1、usageを2、runtime errorを1とした。JSON outcomeは維持した。

### FR-2: prompt answer binding

- Red: `ask` outcomeに保存済み`bindingId`がなく、回答を永続promptへ安全に結び付けられないことを再現した。
- Green: `answer approve|skip --binding-id`を公開し、保存済みpromptからeventとoperationを導出する単一のfail-closed照合経路を追加した。誤り、欠落、消費済み、別eventへの転用はstate/GitHub副作用なしで拒否し、approve/skip後の再回答も拒否する。

### FR-3: legacy mutationの安全境界

- Red: legacy `create|sync|close`が`--instance`なしで直接mutation handlerへ到達できることを再現した。
- Green: mutation verbに`--instance`を必須化し、lifecycleの`manual create|sync|close`へ一対一委譲した。instanceをinvocation IDとして使用し、`status`のread-only契約とcompleted時の既存stdoutを維持した。

### FR-4: Cursor/OpenCode coverage正規化

- Red: Cursor/OpenCodeのself、dist、temp packageがcore正本へ統合されず、LCOVが3 source entryへ分裂することを再現した。
- Green: `.cursor`、`.opencode`と対応するdist/temp familyを正準化対象に追加した。temp pathは許可`tempRoots` containmentとharness/directoryの組を検証し、core/Cursor/OpenCodeのLCOVを単一entryへ統合した。

### FR-5: Mirror設定読み込みのTOCTOU

- Red: containment確認後/open前のsymlink差し替え、inode差し替え、最終component symlinkを決定的seamで再現した。
- Green: 最終componentを`lstat`で検証し、`O_NOFOLLOW`で元pathをopenして、open前後のdevice/inodeとread前後のsize/mtime/device/inodeを照合した。root外または差し替え済み内容は採用しない。

### FR-6: state codecの未エスケープC0

- Red: raw U+0000が文字列として受理されることを再現した。
- Green: raw U+0000〜U+001Fを全拒否し、エスケープ済み`\t`、`\n`、`\u0000`と既存round tripは維持した。

## 主な設計判断

- prompt回答では呼び出し側のoperation指定を受けず、永続化済みpromptを唯一のevent/operation根拠にした。
- legacy CLIは公開互換性を維持する薄いadapterとし、mutation判断と冪等性をlifecycleへ集約した。
- TOCTOU対策はpath再解決ではなく、非追跡open済みdescriptorのidentityを検証した。
- CCN gateで検出された2関数はbaseline例外へ追加せず、`openConfigFile`、`readConfigDescriptor`、`parseAnswerArgs`へ局所分割した。
- 生成投影は直接編集せず、repositoryのpackaging/promote手順で再生成した。

## 変更ファイル

### 正本

- `packages/framework/core/tools/amadeus-mirror.ts`
- `packages/framework/core/tools/amadeus-mirror-config.ts`
- `packages/framework/core/tools/amadeus-mirror-coordinator.ts`
- `packages/framework/core/tools/amadeus-mirror-lifecycle.ts`
- `packages/framework/core/tools/amadeus-mirror-policy.ts`
- `packages/framework/core/tools/amadeus-mirror-presentation.ts`
- `packages/framework/core/tools/amadeus-mirror-state-codec.ts`
- `tests/lib/coverage-source-path.ts`

### テスト

- `tests/smoke/t05-run-tests-parallel.test.ts`
- `tests/unit/t232-amadeus-mirror.test.ts`
- `tests/integration/t232-amadeus-mirror.integration.test.ts`
- `tests/integration/t257-amadeus-mirror-config.integration.test.ts`
- `tests/unit/t268-amadeus-mirror-policy.test.ts`
- `tests/integration/t268-amadeus-mirror-contract-policy.integration.test.ts`
- `tests/unit/t274-amadeus-mirror-state-codec.test.ts`
- `tests/unit/t280-amadeus-mirror-coordinator.test.ts`
- `tests/unit/t281-amadeus-mirror-presentation.test.ts`
- `tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`
- `tests/fixtures/formal-verif-ci-baseline.sha256`

### 生成投影

上記Mirror正本7ファイルを、6つのdistribution surface（Claude、Codex、Cursor、Kiro CLI、Kiro IDE、OpenCode）と4つのself-install surface（Claude、Codex、Cursor、OpenCode）へ再生成した。

### 実装記録

- `amadeus/spaces/default/intents/260725-mirror-review-fixes/construction/{unit-name}/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260725-mirror-review-fixes/construction/{unit-name}/code-generation/code-summary.md`

## 検証結果

- 初期baseline: 対象6ファイル、110 pass / 0 fail。
- FR別Red: 6件すべてで修正前の失敗を確認。
- focused統合: 8ファイル、161 pass / 0 fail。
- CCN局所分割後focused: 4ファイル、70 pass / 0 fail。
- Mirror unit/integration/e2e: 31ファイル、392 pass / 0 fail、1,158 assertions。
- complexity gate: 35 pass / 0 fail。
- `bun run typecheck`: 成功。
- `bun run lint`: exit 0（既存を含むwarning 287件、info 18件）。
- `bun run dist:check`: 6 surfaceすべて成功。
- `bun run promote:self:check`: 4 self-install surfaceすべて成功。
- `team-up.sh`: 内容SHA-256 `36522902661d0fef8f269ffbe54d040b2a093786ae898e123b642b19c72d645b`を維持。
- formal workflow focused test: 3 pass / 0 fail。
- repository-native full CI: 545ファイル、7,509 assertions、failed 0、`RESULT: PASS`。
- AWS credentialsが無効または期限切れのため、runner既定動作によりlive SDK/substrate testsはskipされた。
- wall-clock drift 2件はadvisoryであり、CIの成功判定には影響しなかった。

## 計画差異と残件

- FR-1〜FR-6の実装計画差異はない。
- 統合上の計画差異として、ユーザー指示の最新`origin/main` rebaseにより、[PR #1469](https://github.com/amadeus-dlc/amadeus/pull/1469)の既存Mirror CIジョブとmainのformal baselineが衝突したため、NFR-3のrepository-native full CI成功を満たす目的で`tests/fixtures/formal-verif-ci-baseline.sha256`を正規化更新した。この変更はFR実装ではなく、NFR-3とrebase統合へ追跡される。
- 未解決事項はない。
