# Requirements Analysis — Issue #2018 plugin projection parity

## Intent analysis

GitHub Issue [#2018](https://github.com/amadeus-dlc/amadeus/issues/2018) の未達を修復する。利用者が選択したpluginを起動時に初めて生成するのではなく、Amadeus自身のリポジトリではClaude Code面と同様に、各self-installハーネスの決定的なplugin投影をversion管理する。fresh worktreeで最初のセッションより前からpluginを利用でき、通常のセッション開始後もGit worktreeがcleanであることを完成条件とする。

本対応は `self-fix` である。PR #2049で導入された起動時の検証・修復能力は補助経路として維持するが、正常系の配布経路にはしない。

## Upstream inputs

- `business-overview.md`: Amadeusのplugin供給、配布、ハーネス横断dogfoodという事業・利用目的
- `architecture.md`: authoring source、package projection、self promotion、startup compose、runner generationの所有境界
- `code-structure.md`: `scripts/plugin-projection.ts`、`scripts/package.ts`、`scripts/promote-self.ts`、plugin runtime、各harness manifestの配置
- `re-scans/260802-plugin-projection-parity.md`: Claude面のtracked precedent、他面の欠落、Codexの誤った `.codex/skills` 生成、テスト空白
- `requirements-analysis-questions.md`: ユーザーによるゴール訂正と0問判断

## Definitions

- **self-install面**: `scripts/plugin-projection.ts` の `SELF_INSTALL_HARNESSES` が列挙するClaude、Codex、Cursor、OpenCode、Kimi。Amadeusリポジトリ直下へ自己昇格する対象。
- **package面**: 配布物を生成するClaude、Codex、Cursor、OpenCode、Kimi、Kiro CLI、Kiro IDE。Kiro CLIとKiro IDEは同じ `.kiro` 名を使うが、別packageとして検証する。
- **決定的なplugin投影**: authoring sourceと選択設定が同じならbyte-identicalに再生成できる、ハーネス別のplugin source、合成物、合成記録、compiled graph、およびネイティブのstage entry surface。
- **stage entry surface**: ハーネスがformal-model-check stageを発見・起動するためのrunner skillまたは同等のcommand。配置は各harness manifestとemitterを正本とする。
- **起動時修復**: コミット済み投影が欠損または古い場合だけ、現在のハーネスを正規状態へ戻す補助経路。

## Functional requirements

### FR-1: self-repositoryのplugin選択を正本化する

1. Amadeus self-repositoryでは、project rootの `amadeus/config.json` にある `plugins` が選択状態の正本でなければならない。
2. `formal-model-check` が選択されている現在のself-repositoryでは、5つのself-install面すべてに必要な決定的投影がversion管理されなければならない。
3. `plugins/<name>/` の存在だけで未選択projectへpluginを有効化してはならない。

### FR-2: 決定的なself-install投影を生成・コミットする

1. authoring sourceから5つのself-install面へ、ハーネス別plugin source、合成されたplugin資産、決定的な合成関係ファイル、compiled stage graph、およびstage entry surfaceを生成できなければならない。
2. Claude面でversion管理されている `.amadeus-plugin-src`、`plugins/formal-model-check`、plugin関係JSON、compiled graph、runnerを意味上の基準とする。ただし各面の物理配置はharness manifestとemitterに従い、Claudeのパスを機械的に複製してはならない。
3. session ID、lock、一時recovery、clone-local audit shard、TLC実行結果など実行観測に依存する状態は決定的投影へ含めてはならない。
4. self-install投影は通常の変更と同様にGitへコミットされ、fresh worktreeへcheckoutされなければならない。

### FR-3: ハーネス固有の正規配置を守る

1. Codexのformal-model-check runnerはproject-root `.agents/skills/amadeus-formal-model-check/SKILL.md` に配置しなければならない。
2. Codex向け生成処理は `.codex/skills/amadeus-formal-model-check/SKILL.md` を生成してはならない。既存の非正規 `.codex/skills` は正規投影の入力やversion管理対象として扱わない。
3. Cursor、OpenCode、Kimi、Claudeのstage entry surfaceは、各manifestの `skipRunnerGen` と各emitterの発見方式を尊重しなければならない。
4. Kiro CLIとKiro IDEはpackage-onlyの境界を維持し、self-repository直下へ新しい `.kiro` dogfood投影を追加してはならない。

### FR-4: 起動時処理をverify-or-repairに限定する

1. コミット済み投影が選択設定とauthoring sourceに一致するとき、通常のセッション開始処理はtracked fileを作成・更新・削除してはならない。
2. fresh worktreeで最初のセッションを開始した後の `git status --porcelain --untracked-files=all` は空でなければならない。
3. 現在のハーネスの決定的投影が欠損または古いときだけ、起動時処理は現在のハーネスを修復できなければならない。
4. 1つのハーネスの起動時処理から、他ハーネス面を変更してはならない。
5. 修復失敗時は部分投影を残さず、既存の診断契約に従ってplugin名、ハーネス、失敗箇所を表示しなければならない。

### FR-5: packageとself-installの境界を維持する

1. package面は、plugin payloadを配布可能にしつつplugin未選択の基準状態を維持しなければならない。
2. self-repositoryの `formal-model-check` 選択を、配布先projectの `amadeus/config.json` へ暗黙に移してはならない。
3. Kiro CLIとKiro IDEを含む7つのpackage面は、neutral plugin bundleとharness別payloadの既存生成契約を維持しなければならない。
4. package面のplugin未選択状態と、5つのself-install面の選択済み投影を同じ生成処理内で明示的に区別しなければならない。

### FR-6: generation ownerとdrift guardを閉じる

1. `scripts/plugin-projection.ts` はpackage面とself-install面の閉じた集合、およびそれぞれの投影先を提供する正本でなければならない。
2. `scripts/promote-self.ts` は選択済みpluginのself-install投影を生成するownerとなり、既存ファイルを温存するだけで不足投影を見逃してはならない。
3. `promote:self:check` は、5つのself-install面で必要なファイルの欠落、byte drift、orphan、誤配置を非0で検出しなければならない。
4. `scripts/package.ts --check` は、7つのpackage面とneutral bundleの既存drift契約を維持しなければならない。
5. runner generationはharness-awareな配置を使い、genericな `<harness>/skills` 推測をCodexへ適用してはならない。

### FR-7: 既存の補助機能を退行させない

1. PR #2049で導入された選択設定、明示的なinstall/drop/compose、doctor、stale判定、現在ハーネスだけの修復を維持しなければならない。
2. 起動時修復はpluginの利用可能化までとし、TLCなどの形式検査を自動実行してはならない。
3. plugin未選択projectでは、起動・package・promotionに新しいplugin投影や警告を発生させてはならない。

## Non-functional requirements

### NFR-1: 決定性と冪等性

- 同じauthoring source、project選択、harness manifestから得る投影はbyte-identicalでなければならない。
- 生成を繰り返してもGit差分、重複登録、timestamp-only変更を発生させてはならない。
- 決定的な関係ファイルにwall-clock、session ID、clone IDなど機械固有値を含めてはならない。

### NFR-2: Git cleanliness

- fresh worktree、通常起動1回目、通常起動2回目の各時点で、意図した事前コミット以外のtracked/untracked差分は0件でなければならない。
- cleanlinessの判定はテストfixture内の実Git repositoryで `git status --porcelain --untracked-files=all` を実行して検証する。

### NFR-3: 安全性

- 投影先はauthoring pluginとharness manifestが所有する閉じたパスに限定する。
- 未管理ファイル、別plugin、別harness面を上書き・削除してはならない。
- 生成前検証に失敗した場合はwrite-0、生成途中に失敗した場合は対象pluginの開始前bytesへrollbackする。

### NFR-4: 移植性

- Bun-only TypeScript構成を維持し、macOS、Linux、native Windows PowerShellで外部Unix専用ツールを要求しない。
- Codex、Cursor、OpenCodeなど発見方式が異なる面を共通パスへ押し込まず、manifest-drivenに処理する。

### NFR-5: 保守性と検証可能性

- package projection、self promotion、runtime repairの責務を分離し、同じdestination matrixを手書きで重複させない。
- すべての新しい判断分岐にunit testを置き、filesystemとGitを使う検証はintegrationまたはE2E層へ置く。
- 既存のtypecheck、lint、full CI、distribution、coverage、package、promotion drift guardを維持する。

## Verification requirements

テスト戦略は **Comprehensive** とする。

1. 7つのpackage面と5つのself-install面の集合、harness directory、stage entry destinationをtable-driven unit testで固定する。
2. authoring sourceから各self-install面へ必要な投影集合が決定的に生成され、2回目がbyte-identicalになることをunit/integration testで検証する。
3. Codexではrunnerが `.agents/skills` にのみ生成され、`.codex/skills` が生成されないことを回帰テストする。
4. 5つのself-install面をそれぞれ独立したfresh Git fixtureへ展開し、最初の通常起動前にformal-model-checkを発見できることを検証する。
5. 前項の各fixtureで通常起動を2回実行し、各回後の `git status --porcelain --untracked-files=all` が空であることを検証する。
6. tracked projectionのファイルを1つ欠損・改変したfixtureで、現在ハーネスだけが修復され、他面がbyte-identicalであることを検証する。
7. plugin未選択fixtureでは、package・promotion・通常起動の前後でplugin投影が増えずGitがcleanであることを検証する。
8. Kiro CLIとKiro IDEは別package fixtureで検証し、self-install対象へ入らないことを固定する。
9. `bun scripts/package.ts --check`、`bun run promote:self:check`、`bun run distribution:check`、`bun run typecheck`、`bun run lint`、`bun run test:ci` を通す。
10. 既存のplugin compose、selection、install/drop、doctor、activation checkpointのテストを維持する。

## Acceptance criteria

### AC-1: fresh worktreeで初回から利用できる

Given `formal-model-check` が選択済みのself-repositoryをfresh worktreeへcheckoutした状態  
When Claude、Codex、Cursor、OpenCode、Kimiのいずれかで最初のセッションを開始する前にplugin stageを照会する  
Then そのharnessの正規entry surfaceからformal-model-checkを発見できる。

### AC-2: 通常起動がGitを汚さない

Given committed projectionがauthoring sourceと選択設定に一致するfresh worktree  
When 同じharnessで通常のセッション開始処理を1回目と2回目に実行する  
Then 両方の実行後にGit porcelain出力は空であり、tracked fileのbytesは変わらない。

### AC-3: Codexの配置が正しい

Given Codex向けself-install投影を生成した状態  
When formal-model-check runnerの出力集合を検査する  
Then `.agents/skills/amadeus-formal-model-check/SKILL.md` が存在し、`.codex/skills/amadeus-formal-model-check/SKILL.md` は存在しない。

### AC-4: 欠損時だけ修復する

Given 現在harnessのcommitted projectionを1ファイルだけ欠損させ、他harness面を変更していない状態  
When 起動時修復を実行する  
Then 現在harnessの欠損だけが正規bytesへ戻り、他harness面はbyte-identicalのままである。

### AC-5: packageの未選択基準状態を維持する

Given pluginを選択していない配布先project  
When 7つのpackage面を生成し、通常起動する  
Then plugin payloadは配布可能でもproject選択は追加されず、self-repository固有のdogfood投影は強制されない。

### AC-6: drift guardが欠落を検出する

Given 5つのself-install面の必要投影から任意の1ファイルを削除または改変した状態  
When `promote:self:check` を実行する  
Then 非0で終了し、対象harnessと不足またはdriftしたpathを表示する。

## Constraints

- `dist/` と昇格後のroot生成物は手編集せず、framework sourceと生成scriptから再生成する。
- 既存の5 self-install面と7 package面の閉じた集合を拡大しない。
- 新しいplugin marketplace、外部取得、依存解決、lockfile仕様は追加しない。
- root `.kiro` self-installは追加しない。
- plugin選択設定のspace/intent継承は追加しない。
- TLCの自動実行は追加しない。

## Assumptions

- `amadeus/config.json` の `plugins: ["formal-model-check"]` はself-repositoryの選択状態として正しい。
- 各harness manifest/emitterの現在の発見方式を正規契約として利用できる。
- PR #2049のruntime repairは欠損・stale状態の補助経路として再利用できる。
- Claude面のtracked plugin surfaceは、投影の意味上のprecedentとして利用できる。

## Out of scope

- plugin機能そのもの、formal-model-checkの検査ロジック、TLA+モデルの変更
- plugin marketplaceやremote registry
- 用語定義問題 [#2029](https://github.com/amadeus-dlc/amadeus/issues/2029) と用語正本統一 [#2030](https://github.com/amadeus-dlc/amadeus/issues/2030) の実装
- Kiro CLI/Kiro IDEのproject-root self-install化
- 既存のmachine-local実行履歴をGitへ追加すること

## Open questions

なし。物理destinationは要件段で新しく選ばず、既存のharness manifest/emitterから導出する。

## Traceability

| Requirement | Source | Verification |
|---|---|---|
| FR-1〜FR-2 | ユーザーのゴール訂正、Issue #2018、business-overview | projection set test、fresh fixture |
| FR-3 | architecture、code-structure、RE差分スキャン | destination matrix、Codex regression test |
| FR-4 | ユーザーのGit clean要求、PR #2049補助経路 | startup twice + Git porcelain、repair test |
| FR-5 | package/self-install境界のユーザー承認学習 | package fixture、Kiro negative test |
| FR-6 | REのownership断線分析 | package/promote-self drift guards |
| FR-7 | 既存PR #2049契約 | existing plugin regression suites |
| NFR-1〜NFR-5 | inception rules、project testing posture | unit、integration、E2E、full CI |


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T00:15:51Z
- **Iteration:** 1
- **Scope decision:** none

実行環境にRead/Grep/Glob相当ツールが公開されておらず、禁止された手段を使わず指定6ファイルを読めないため、成果物レビューを完了できなかった。

### Findings

- BLOCKER | 指定された6ファイルの内容をreviewer contextへ渡すか、対象を6パスに限定したRead相当ツールを有効化する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T00:19:55Z
- **Iteration:** 2
- **Scope decision:** none

成果物はstage契約の必須構成を満たし、訂正済みゴールと3つの上流成果物に整合している。5つのself-install面と7つのpackage面の境界、Codex固有のrunner配置、fresh checkoutでの初回利用、startup時のGit cleanliness、repair経路、未選択baselineが明確で、開発・QAが実装および合否判定を開始できる粒度に達している。0問判断にもsix dimensionsと根拠があり、例外条件を満たす。

### Findings

- FOLLOW-UP | FR-4/NFR-3の失敗時診断・rollback・unmanaged file保護、およびFR-6のorphan/misplacement検出を、Verification requirementsの列挙テストへ明示的に追加すると、要求からテストへの追跡がさらに容易になる。現状でも各要求本文に観測可能な合否条件があるため、着手を妨げない。
