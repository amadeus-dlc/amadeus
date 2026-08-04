# Requirements — ハーネス横断 live E2E

Intent: `260803-harness-live-e2e`  
Scope: `self-feature` / Depth: Standard / Test Strategy: Comprehensive  
入力正本: `intent-statement`、`scope-document`、`business-overview`、`architecture`、`code-structure`、`team-practices`、[Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)

## Intent Analysis

Amadeus のハーネス配布面を保守する開発者が、実CLI・実モデル・実認証を使う短いjourneyを安全かつ再現可能に実行し、`skip`、`timeout`、実失敗を区別できるようにする。現在 `tests/harness/codex-exec-live.ts` に集中する安全保証を共通policy/lifecycleへ抽出し、起動方法・transport・認証・設定隔離・終了条件は `harness × transport` adapterへ残す。

`business-overview` が示す保守者価値、`architecture` が示す既存driver/fixture境界、`code-structure` が示す正本→配布物の生成構造を維持する。transport統一や共通契約の弱体化は行わない。

### 完了の定義

- Phase 1〜3の全対象面が、共通policyへ接続されるか、実測結果・阻害要因・推奨seam・受け入れ条件を備えた後続Issueへ接続される。
- 対応済みadapterはfake integrationだけでなく、実CLI・実モデルによる最小live journeyのgreen証拠を持つ。
- 全 `harness × transport` のcapability matrixと実行台帳に最終live green SHAまたは根拠付き非対応状態が記録される。

## Functional Requirements

### FR-1 共通起動ポリシー

優先度: Must  
出典: Issue #1717「共通 contract」、`scope-document` M1/M2、ユーザー回答Q1=A

システムは、全live pathに同一の起動判定を適用しなければならない。

opt-inはadapter別の専用環境変数で宣言し、許可値は文字列 `"1"` のみとする。未設定、空文字、`"0"`、`"true"`、その他の値はすべて未opt-inとして扱う。複数の変数を指定しても各変数は対応adapterだけを有効化し、全adapterを一括許可する共通変数は設けない。

| Harness / transport | 専用opt-in環境変数 | 状態 |
|---|---|---|
| Codex / exec | `AMADEUS_CODEX_EXEC_LIVE` | 既存契約を維持 |
| Claude Code / headless print | `AMADEUS_CLAUDE_PRINT_LIVE` | 新設 |
| Claude Code / Agent SDK | `AMADEUS_CLAUDE_SDK_LIVE` | 共通policy接続時に新設 |
| Claude Code / tmux TUI | `AMADEUS_TUI_LIVE` | 既存名を維持し、自動設定を廃止 |
| Kimi Code / print | `AMADEUS_KIMI_PRINT_LIVE` | 既存契約を維持 |
| Kiro CLI / ACP | `AMADEUS_KIRO_ACP_LIVE` | 既存契約を維持 |
| Kiro CLI / TUI | `AMADEUS_KIRO_TUI_LIVE` | 既存契約を維持 |
| Kiro IDE / GUI | `AMADEUS_KIRO_IDE_LIVE` | 既存契約を維持 |
| Cursor / 実測で成立したtransport | `AMADEUS_CURSOR_LIVE` | adapter実装時だけ新設 |
| OpenCode / 実測で成立したtransport | `AMADEUS_OPENCODE_LIVE` | adapter実装時だけ新設 |

受け入れ基準:

1. Given 専用opt-inがない、When 任意のlive pathを要求する、Then ハーネスprocessを起動せずcanonical skip reasonを返す。
2. Given 専用opt-inがある、And `GITHUB_ACTIONS=true`、When 任意のlive pathを要求する、Then ハーネスprocessを起動せずCI hard deny理由を返す。
3. Given Claude Code TUIを `--all` または `--release --debug` で実行する、And 専用opt-inがない、When runnerが対象testを選ぶ、Then `AMADEUS_TUI_LIVE=1`を自動設定せずskipする。
4. Given opt-inまたはCI deny判定を無効化する違反を注入する、When contract testを実行する、Then テストが赤くなる。
5. Given `GITHUB_ACTIONS=true` と未opt-inが同時に成立する、When 起動判定する、Then CI hard denyを優先し、環境変数の値にかかわらずprocessを起動しない。

### FR-2 canonical skip reasonと結果分類

優先度: Must  
出典: Issue #1717「機械可読なskip reason」「赤の3分類」、`scope-document` M1

システムは、adapterごとの自由文ではなく単一定義の理由コードを返し、未実行と実行失敗を機械判別可能にしなければならない。

canonical codeは定数prefix `AMADEUS_LIVE_E2E` と次の安定集合で構成する。人間向け診断文は追加できるが、code識別子をadapterごとに変更してはならない。

| Machine code | Result | 意味 |
|---|---|---|
| `AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN` | `skip` | GitHub Actions hard deny |
| `AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED` | `skip` | 専用変数が未設定または値が `"1"` 以外 |
| `AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING` | `skip` | 必須CLI executableを解決できない |
| `AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED` | `skip` | 検出versionがadapter契約外 |
| `AMADEUS_LIVE_E2E:SKIP:DIST_MISSING` | `skip` | 必須配布物がない、または不整合 |
| `AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE` | `skip` | 認証preflightを満たさない |
| `AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED` | `skip` | 実測した必須capabilityが成立しない |
| `AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT` | `timeout` | journey予算内に完了しない |
| `AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED` | `failure` | CLIが非timeoutの実行失敗を返す |
| `AMADEUS_LIVE_E2E:FAIL:ASSERTION_FAILED` | `failure` | 決定的アンカーが不成立 |
| `AMADEUS_LIVE_E2E:PASS:SUCCESS` | `success` | journeyと全アンカーが成立 |

複数のpreflight不成立が同時にある場合は、`CI_FORBIDDEN` → `OPT_IN_REQUIRED` → `BINARY_MISSING` → `VERSION_UNSUPPORTED` → `DIST_MISSING` → `AUTH_UNAVAILABLE` → `CAPABILITY_UNSUPPORTED` の順で主codeを1つ選ぶ。副次的な診断は付加してよいが、主codeはこの順序で決定する。

受け入れ基準:

1. Given opt-in不足、CI deny、binary不足、version不適合、配布物不足、認証不足、capability不足のいずれか、When preflightを実行する、Then canonical schemaの理由コードと診断文を返す。
2. Given journeyが終了する、When 結果を記録する、Then `success`、`skip`、`timeout`、`failure`を区別し、failureでは元のassertion文を改変せず保持する。
3. Given 未登録のskip reasonをadapterが返す、When contract testを実行する、Then テストが赤くなる。
4. Given 複数のpreflight不成立、When 結果を生成する、Then 定義済み優先順位で主codeを一意に選ぶ。

### FR-3 preflightとadapter capability宣言

優先度: Must  
出典: Issue #1717「preflight」「adapterに残すもの」、`architecture`

各adapterは、binary、対応version、配布物、認証方式、project-local設定、sensitive env key、source auth/config path、起動コマンド、終了アンカーを宣言し、共通層は実行前に検査しなければならない。

受け入れ基準:

1. Given 必須capabilityが不足する、When preflightを実行する、Then process起動前に該当skip reasonを返す。
2. Given capabilityが充足する、When preflightを実行する、Then adapter固有の起動仕様を共通lifecycleへ渡す。
3. Given CLI flagやversion意味論を根拠にする、When adapterを対応済みと判定する、Then 実測したversionとhelp/behavior証拠を記録する。

### FR-4 認証・設定・child environment隔離

優先度: Must  
出典: Issue #1717「child environmentの隔離」、`scope-document` M1/M3/M5

共通層はadapter宣言に基づいてchild environmentを最小化し、source側の認証情報・設定・ユーザーhooksをscratch projectへコピーまたは漏洩してはならない。

受け入れ基準:

1. Given adapterがsensitive env keyとsource pathを宣言する、When child environmentを構築する、Then 許可された認証参照以外を除去し、source pathをchildへ渡さない。
2. Given sensitive keyまたはsource auth/config pathの漏洩を注入する、When contract testを実行する、Then テストが赤くなる。
3. Given Claude headless journey、When `claude -p`を起動する、Then `--setting-sources project`を使用し、ユーザー設定・ユーザーhooksを読まず、`--bare`は使用しない。
4. Given Codex adapter、When 共通層へ移行する、Then 既存の認証隔離契約を維持する。

### FR-5 scratch lifecycle、cleanup、debug保持

優先度: Must  
出典: Issue #1717「scratch project lifecycle」、`architecture`、`code-structure`

共通lifecycleはscratch projectと一時homeの作成、対象 `dist/<harness>` の配置、journey実行、cleanupを所有し、debug要求時だけ診断可能な一時領域を保持しなければならない。

受け入れ基準:

1. Given journey開始、When lifecycleを実行する、Then fresh scratch projectと分離されたhomeを作り、対象配布物だけを配置する。
2. Given successまたは通常failure、When lifecycleが終了する、Then scratch資源をcleanupする。
3. Given debug保持が明示される、When lifecycleが終了する、Then 保持pathを結果に記録し、既存fixture側の保持責務を二重実装しない。
4. Given fake executable/dist、When adapter integration testを実行する、Then 作成→実行→cleanupの順序と失敗時cleanupを検証できる。

### FR-6 timeout、決定的アンカー、retry、直列実行

優先度: Must  
出典: Issue #1717「時間・非決定性・コストの契約」、`scope-document`「品質・安全境界」

各journeyは、モデル出力の完全一致ではなく決定的アンカーで成否を判定し、明示timeoutと限定retryを持ち、live実行を直列化しなければならない。

受け入れ基準:

1. Given journey定義、When contract validationを実行する、Then exit code、構造化出力schema、ファイルまたは状態のうち1つ以上の決定的アンカーが宣言されている。
2. Given journey timeout、When 実行予算を検証する、Then Bun既定値や内部待機予算との同値衝突がなく、timeoutを性能SLOとして扱わない。
3. Given 初回failure、When retry条件を判定する、Then 既定0回、負荷起因と実証された場合だけ最大1回とする。
4. Given 複数live journey、When suiteを実行する、Then 同時実行せず直列に処理する。

### FR-7 CodexとClaude CodeのPhase 1接続

優先度: Must  
出典: Issue #1717 Phase 1、`scope-document` M3/M4

Codex既存journeyを共通seamへ移行し、Claude Code headlessを追加し、Claude SDK/TUIを共通policyへ接続しなければならない。

Codex execとClaude Code headlessは本Intentでの実live greenが必須であり、ローカルCLIまたは認証情報の不足を後続Issueで代替してはならない。Claude SDK/TUIは「共通policyへ接続して実live green」または「capability上の阻害要因を実測した根拠付き後続Issue」の二択とする。

受け入れ基準:

1. Given Codex adapter移行、When既存live E2Eをopt-in実行する、Then 既存workspace・認証隔離・終了判定が維持されgreenになる。
2. Given Claude Code headless、When `dist/claude`をscratchへ配置して短いno-state status promptを `claude -p`で実行する、Then 決定的アンカーが成立しgreenになる。
3. Given Claude Agent SDKまたはTUI、When既存live pathを評価する、Then 共通policyへ接続する。接続不能なら実測結果・阻害要因・推奨seam・受け入れ条件を備えた後続Issueを作成してlinkする。
4. Given Claude TUI専用opt-inがない、When runnerを起動する、Then runnerフラグだけではlive processを起動しない。

### FR-8 Kimi CodeとKiro系のPhase 2接続

優先度: Must  
出典: Issue #1717 Phase 2、`scope-document` M5

Kimi print、Kiro CLI ACP/TUI、Kiro IDE GUIの各面を個別に評価し、共通policyへ接続するか根拠付き後続Issueへ接続しなければならない。

Kimi printは本Intentでの共通policy接続と実live greenが必須であり、CLIまたは認証情報の不足を後続Issueで代替してはならない。Kiroの各transportは「接続して実live green」または「capability上の阻害要因を実測した根拠付き後続Issue」の二択とする。

受け入れ基準:

1. Given Kimi print、When adapterを実行する、Then credential symlink、設定home、child envの境界がadapter内に閉じ、contract testとopt-in live journeyがgreenになる。
2. Given Kiro CLI ACP/TUIまたはKiro IDE GUI、When capabilityを実測する、Then 各transport単位で接続または根拠付き後続Issue linkのいずれかを完了する。
3. Given capability matrixへの「要調査」記載だけ、When Phase 2完了を判定する、Then 未完了として扱う。

### FR-9 CursorとOpenCodeのPhase 3 capability spike

優先度: Must  
出典: Issue #1717 Phase 3、`scope-document` M6

CursorとOpenCodeについて、非対話実行、project-local設定、ユーザー設定隔離、認証、終了条件、CI deny/opt-in、packaging conformanceを実機で測定しなければならない。

受け入れ基準:

1. Given CursorまたはOpenCode、When capability spikeを行う、Then CLI/version、実行コマンド、観測結果、再現手順を記録する。
2. Given 必須capabilityが成立する、When adapterを追加する、Then fake integrationと最小opt-in live journeyを追加してgreenを記録する。
3. Given 必須capabilityが成立しない、When対象面を完了扱いする、Then 実測結果、阻害要因、推奨seam、独立して検証可能な受け入れ条件を持つ後続Issueを作成してlinkする。
4. Given matrixへの記録のみ、When Phase 3完了を判定する、Then 未完了として扱う。

### FR-10 adapter contract testと落ちる実証

優先度: Must  
出典: Issue #1717「共通 contract」、`scope-document` M2、`team-practices` Testing Posture

共通policyは純粋なunit test、adapterはfake executable/distを使うintegration testで固定し、新規guardはTDDと違反注入で実際に赤くなることを証明しなければならない。

受け入れ基準:

1. Given 共通判定関数、When unit testを実行する、Then opt-in、CI deny、skip taxonomy、timeout/retry判定を実processなしで検証する。
2. Given fake executable/dist、When adapter integrationを実行する、Then 引数、env、cwd、設定隔離、lifecycle、結果分類を検証する。
3. Given CI deny、opt-in gate、env隔離の実行時分岐へ違反を注入する、When 対応testを実行する、Then それぞれ赤くなる。
4. Given 新しい実行時挙動、When 実装する、Then 合意済みseamにRedを先に追加し、最小実装でGreenにするvertical sliceを反復する。

### FR-11 capability matrix、実行台帳、運用トリガー

優先度: Must  
出典: Issue #1717「運用サイクル」、`scope-document` M7

repository内に全 `harness × transport` のcapability matrixとversioned実行台帳を持ち、配布面変更Intentの完了前に該当live journeyを実行する運用契約を文書化しなければならない。

受け入れ基準:

1. Given capability matrix、When確認する、Then harness、transport、opt-in、CI deny、設定/認証隔離、決定的アンカー、対応状態、最終live green SHAまたは後続Issue linkを追跡できる。
2. Given live journey実行、When結果を記録する、Then 実行日時、Git SHA、adapter、検出version、結果を台帳へ残す。
3. Given `dist/<harness>`、driver、installerのいずれかを変更したIntent、When完了判定する、Then 該当adapterのlive journeyをローカルで1回実行した証拠がある。
4. Given 通常のGitHub Actions、When CIを実行する、Then live processは起動せず、unit/fake integrationだけを実行する。

## Non-Functional Requirements

### NFR-1 安全性

- opt-in不足またはGitHub Actionsでは、全live pathでprocess起動回数が0であること。
- sourceの認証・設定・hooksをscratchへコピーせず、宣言外sensitive keyをchild envへ渡さないこと。
- 課金を伴う処理は明示opt-in境界の内側だけで実行すること。

### NFR-2 診断可能性と信頼性

- `success`、`skip`、`timeout`、`failure`を機械可読に区別すること。
- assertion実文、保持scratch path、adapter、検出version、Git SHAを診断証拠として保存できること。
- 非決定な自然言語の完全一致を避け、journeyごとに決定的アンカーを定義すること。

### NFR-3 実行時間とコスト

- 各journeyは1〜数プロンプトの短いシナリオとし、直列で実行すること。
- timeout値は性能保証ではなく安全予算とし、内外の待機予算を実測して設定すること。
- retryは既定0回、負荷起因を確認した場合だけ1回を上限とすること。

### NFR-4 保守性

- 共通層はpolicy/lifecycleだけを所有し、harness/transport固有分岐をadapterへ閉じ込めること。
- `codex-exec-live.ts`を多ハーネス条件分岐の巨大helperへ拡張しないこと。
- canonical skip reason、結果型、capability宣言は単一正本を持つこと。

### NFR-5 テスト容易性と配布整合性

- 共通policyはprocess非依存のunit test、adapterはfake executable/distによるintegration testで検証可能であること。
- 正本は `packages/framework/` または適切なhand-authored test/docs面へ置き、`dist/`を直接編集しないこと。
- packaging conformance、`bun run dist:check`、`bun run promote:self:check`を維持すること。
- TypeScript/Bunの既存runnerとComprehensive戦略に従い、関連unit/integration/liveおよび現行CI blocking集合で検証すること。

### NFR-6 互換性

- Codex既存live E2Eのworkspace保持、認証隔離、opt-in/CI deny、終了判定を後退させないこと。
- 既存Claude SDK/TUI、Kimi、Kiroのtransport固有価値を維持し、共通化のためにtransportを変更しないこと。
- 最小対応versionと実測versionをadapterまたはmatrixへ記録し、未実測versionの互換性を主張しないこと。

## Constraints

1. 実装言語とテスト基盤はTypeScript/Bunを使用する。
2. Amadeus自己開発のため `self-feature` を維持する。
3. Phase 1の共通seam確立後にPhase 2、Phase 3へ進む。
4. 通常のGitHub Actionsではlive processを起動しない。
5. `dist/`は生成物であり直接編集しない。正本変更後にpackage/promoteのdrift guardを通す。
6. 接続不能な面の後続Issue作成は、実測結果、阻害要因、推奨seam、受け入れ条件をすべて含む場合だけ完了として認める。
7. 外部の特定日期限はないが、MustをCouldより優先し、Couldは安全契約と最小journeyを遅らせない。

## Assumptions

| ID | 仮定 | 状態 | 検証責任 |
|---|---|---|---|
| A-1 | Codex、Claude Code、Kimi、Kiroの既存live pathは現行HEADでもRE記録どおり存在する | 確認済み | Reverse Engineering |
| A-2 | Claude Codeの `--setting-sources project` は実測versionでproject設定だけを読み、`--bare`なしでheadless journeyを構成できる | 実装前再確認 | Phase 1担当 |
| A-3 | Codex exec、Claude Code headless、Kimi printの実live検証に必要なCLIと認証がローカルで利用できる | 未確認 | 各adapter担当。利用不能なら本IntentのBLOCKERとして扱い、後続Issueで代替しない |
| A-4 | Cursor/OpenCodeの必須capabilityは静的推測せず、実機spikeで確定できる | 未確認 | Phase 3担当 |
| A-5 | capability matrixと台帳の具体パス・schemaはApplication Designで決められる | 未確認だが要件非阻害 | Architect |

## Out of Scope

1. Agent SDK、headless CLI、TUI、ACP、GUIのtransport統一。
2. 全ハーネスの単一PR一括移行。
3. capability不足を隠す共通contractの弱体化。
4. 通常GitHub Actionsでのlive process実行。
5. モデル自然言語出力の完全一致。
6. 完了済み `swarm-driver-migration` Intentの再開・変更。
7. 全OS・全CLI version組み合わせの網羅。

## Open Questions

要件を阻害する未解決事項はない。以下は要件ではなくApplication Designで確定する設計判断である。

- 共通policy/lifecycle moduleとadapter interfaceの具体的なファイル配置・型形状。
- capability matrixとversioned実行台帳の具体的なパス・schema・表示方法。
- 既存fixtureからdebug保持責務を移す際の互換API。

## Traceability Matrix

| Req ID | Source | Priority | Design Ref | Unit Ref | Test Ref |
|---|---|---|---|---|---|
| FR-1 | M1/M2・Q1=A | Must | Application Designで割当 | Units Generationで割当 | FR-1 contract/negative tests |
| FR-2 | M1 | Must | Application Designで割当 | Units Generationで割当 | FR-2 taxonomy/result tests |
| FR-3 | M1 | Must | Application Designで割当 | Units Generationで割当 | FR-3 preflight tests |
| FR-4 | M1/M3/M5 | Must | Application Designで割当 | Units Generationで割当 | FR-4 isolation/negative tests |
| FR-5 | M1/M3 | Must | Application Designで割当 | Units Generationで割当 | FR-5 lifecycle integration tests |
| FR-6 | M1 | Must | Application Designで割当 | Units Generationで割当 | FR-6 timeout/retry/serial tests |
| FR-7 | M3/M4 | Must | Application Designで割当 | Units Generationで割当 | Codex regression + Claude live tests |
| FR-8 | M5 | Must | Application Designで割当 | Units Generationで割当 | Kimi/Kiro contract + live evidence |
| FR-9 | M6 | Must | Application Designで割当 | Units Generationで割当 | Cursor/OpenCode spike evidence |
| FR-10 | M2 | Must | Application Designで割当 | Units Generationで割当 | Red→Green + violation injection |
| FR-11 | M7 | Must | Application Designで割当 | Units Generationで割当 | ledger/matrix/trigger tests |
| NFR-1〜6 | 品質・安全境界・team-practices | Must | Application/NFR Designで割当 | Units Generationで割当 | Build and Testで確定 |

### NFR / Constraint Upstream Traceability

| Item | Upstream source |
|---|---|
| NFR-1 安全性 | M1、M2、M3、Issue「共通 contract」 |
| NFR-2 診断可能性と信頼性 | M1、M2、Issue「赤の3分類」 |
| NFR-3 実行時間とコスト | M1、Issue「時間・非決定性・コストの契約」 |
| NFR-4 保守性 | M1、Issue「設計方針」 |
| NFR-5 テスト容易性と配布整合性 | M2、M7、team-practices Testing Posture |
| NFR-6 互換性 | M3〜M6、scope-document W1/W3 |
| Constraints 1〜7 | scope-document 品質・安全境界、段階完了条件、Out of Scope、project/team practices |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T10:47:27Z
- **Iteration:** 1
- **Scope decision:** none

範囲とQ&A反映は概ね良好だが、opt-in外部契約、live greenの代替条件、canonical result codeが一意でなく実装・QAを開始できない。

### Findings

- BLOCKER | FR-1は専用環境変数による明示opt-inを要求するが、各live pathの変数名、許可値、共通かadapter別か、GHA hard-denyとの優先順位が未定義である。
- BLOCKER | M3/FR-7およびM5/FR-8のlive green必須条件と、CLI・認証 unavailable時にfollow-up Issueを適用するAssumptionsが矛盾するため、transport別の完了条件を確定する必要がある。
- BLOCKER | FR-2はcanonical codeの逐語一致とunknown codeの失敗を要求するが、安定したcode識別子、結果との対応、複数失敗時の優先順位が未定義である。
- FOLLOW-UP | NFR-1〜NFR-6とConstraintsにもM1〜M7への明示的な上流トレーサビリティを追加する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-03T10:50:18Z
- **Iteration:** 2
- **Scope decision:** none

前回の全BLOCKERが解消され、顧客安全契約、完了条件、結果分類、上流トレーサビリティが実装・試験可能な状態になった。

### Findings

- None
