# Business Logic Model — harness-hook-correctness

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U07はFR-4 items 13–15をC6 Harness and Reviewer Adaptersの既存choke pointへ適用する。対象は、adapterがcore hookを再起動するruntime選択、Kiro IDE固有contextの正規化、Claude settingsのproject path quotingである。host固有payloadをcoreへ渡さず、通常hookのstdout契約、既存audit順序、advisory hookのfail-open性を維持する。

一次設計根拠はupstream `ff7c15b8078fecea75aa693ed655fd261a281540`、`300b640`、`6f597ce9a5053a448e2861802825613aadd47a87`。Amadeusでは6 harness sourceと生成projectionの所有境界へADAPTし、`dist/`を手編集しない。U08 reviewer protocol、U09 plugin projection、core hook本体の一般refactorは本Unitに含めない。

## Public seamとownership

公開面は`component-methods.md`の正準3関数だけであり、各flowはこの入出力へ写像する。

```ts
function spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult;
function parseKiroIdeHookContext(payload: unknown): HookContextResult;
function renderClaudeHookCommand(projectDirVariable: "$CLAUDE_PROJECT_DIR", hook: HookSpec): string;
```

`spawnHookWithRuntime`はFlow Aのruntime/cwd/stdin/stdout/stderr/exit契約、`parseKiroIdeHookContext`はFlow Bのhost payload分類とcanonical context、`renderClaudeHookCommand`はFlow Cの11 hook command文字列を所有する。`KiroIdeEventClassifier`、path/identity抽出、drop記録、settings再帰走査は内部helperであり、追加public APIではない。

## Flow A: runtime child spawn

1. 各authored harness adapterのchild-spawn siteを構造検索し、hook/utilityを再起動する実在siteだけをinventory化する。
2. `spawnHookWithRuntime(args, input)`がadapter自身を起動したBunの絶対pathである`process.execPath`をargv[0]に使い、受領`args`を後続要素として渡す。
3. stdin、stdout、stderr、cwd、exit codeの既存契約は変更しない。特にworktree-aware adapterはpayloadから解決済みのproject directoryをchild cwdとして維持する。
4. PATHからbunを解決できないfixtureでadapterを絶対runtimeから起動し、child core hookまで完走したことをobservable outputで確認する。
5. 6 harness source/projectionを全数検査するが、実在しないspawn siteを埋めるためのwrapperは追加しない。bare-name runtimeが残る該当siteだけを失敗とする。

## Flow B: Kiro IDE context normalization

1. `parseKiroIdeHookContext(payload)`はIDE adapterの`USER_PROMPT`由来payloadだけを一度parseし、stdinを読まない。空値またはmalformed JSONはfailureを隠さない`HookContextResult`へ閉じ、adapterが空contextのadvisory経路へ薄く投影する。この空contextでno-opになるのはwrite/subagent等のpayload依存分類だけであり、runtime compile/state syncのpayload-free targetは後述のaudit-tail経路を継続する。
2. `toolName`、`toolArgs`、`toolResult`、`toolSuccess`を`KiroIdeHookContext`へ取り込む。`toolArgs`が空であるIDE契約を前提に、write pathは成功時の`toolResult`既知文型からだけ抽出する。
3. write系toolをcanonical `Write` / `Edit`へ写像する。`toolSuccess === false`はaudit/sensorへ転送しない。成功したwrite系toolなのにpathを抽出できない場合はhook-dropへ理由を残し、推測pathで進めない。
4. workspace-relative pathは解決済みproject root基準の絶対pathへ変換し、core audit hookとsensor hookへ同一payloadをaudit-first順で渡す。
5. payload-free eventは`USER_PROMPT`の有無・妥当性に依存せずaudit tailを正本にする。runtime compileはIDE専用source markerを付け、core側のtransition/idempotency guardに判定を委ねる。state syncは最新の未完了`STAGE_STARTED`だけをforward-onlyに反映し、completed/parked stateを巻き戻さない。
6. delegated agent identityはresult先頭8行の`Reviewer` / `Agent` markerから抽出し、見つからなければ`unknown`。failed toolや未知toolは成功artifact eventへ読み替えない。
7. debug logは環境変数またはworkspace markerによる明示opt-in時だけappendし、通常stdoutには一切出さない。debug write失敗はhook動作を壊さない。

## Flow C: Claude project path quoting

1. authored `packages/framework/harness/claude/settings.json.example`を唯一の編集元とする。
2. `renderClaudeHookCommand("$CLAUDE_PROJECT_DIR", hook)`が承認済み11 hook commandのproject directory/script pathだけをdouble quoteする。statuslineとtool permission globは本Unitの変更対象に含めない。
3. JSONをparseして11 hook commandを列挙し、変数を含む未引用hook commandを0件にする。対象外のstatusline/permission文字列を同じ変換へ巻き込まない。
4. 空白入り絶対pathのtemp workspaceでshipped settingsを使い、同じ11 hook wiringが正しいscript pathへ解決されることを確認する。
5. package generatorでClaude projectionを再生成し、source/projection drift checkを通す。

## Failure decisions

- runtime childのnon-zero、signal、stdout/stderrは既存adapter契約のまま返し、成功へ変換しない。
- Kiro IDEの未知tool result文型はpath推測をせずvisible dropにする。malformed `USER_PROMPT`はpayload依存targetではadvisory no-opとし、payload-free runtime/state targetではaudit-tail self-gateだけを許してpayload由来mutationを起こさない。
- Claude commandのJSON parse失敗、未引用出現、空白path fixture失敗は生成前またはtestでloud failureにする。
- source変更後にpackage/checkが不一致ならprojectionを正とせず、generatorから再生成する。

## 検証シナリオ

- PATHからbunを除外した上で、Codex、Kiro CLI、Kiro IDEと、inventoryで該当したAmadeus固有adapterのcore childが起動する。
- Kiro IDEのcreate/replace/append、相対/絶対path、trailing newline/occurrence suffix、payloadなし、malformed JSON、failed tool、unknown wordingをpositive/negative controlで固定する。
- audit→sensor順、runtime compileのaudit-tail gate、state syncのforward-only、subagent identity、debug off時の出力/ファイル不変を検証する。
- Claude settingsは11 hook command内の`$CLAUDE_PROJECT_DIR` quote、空白path、全hook path実在、件数不変、statusline/permission bytes不変、package projection一致を検証する。

## Review — Iteration 1

- Reviewer: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T14:54:08Z`
- Verdict: **NOT-READY**

### Findings

1. **MAJOR — 正準公開seamのsignatureが成果物へ復元されていない。** `unit-of-work.md` と `component-methods.md` は U07 の公開面を `spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult`、`parseKiroIdeHookContext(payload: unknown): HookContextResult`、`renderClaudeHookCommand(projectDirVariable: "$CLAUDE_PROJECT_DIR", hook: HookSpec): string` に固定している。しかし3成果物はこれらの関数名・引数・戻り値を一度も設計契約として示さず、Flow A/C はadapterやsettingsを直接変更する手順、Flow Bは `KiroIdeHookContext` / `CanonicalHookForward` / `HookDrop` という内部構造だけを記述している。このままでは実装者が正準seamを迂回するか、独自signatureを具体化できるため、3関数を正準signatureどおり明記し、各flow/rule/entityをその入出力または明示的な内部helperへ対応付けること。
2. **MAJOR — Claude quotingの変更対象が承認済みQ&Aの範囲を越えている。** `functional-design-questions.md` の承認範囲は「全11 hook command」である一方、Flow CとBR-U07-10はstatuslineおよびtool permission globまで変更対象に含めている。`requirements.md` のFR-4 item 15も全hook commandを受け入れ境界としており、追加2面を変更する判断は指定consumesから機械導出できない。11 hook commandだけへ閉じるか、追加面を必要とする正本根拠と承認を得てQ&Aへ反映すること。

### Confirmed checks

- 必須3成果物と質問正本は実在し、UIを持たないU07で`frontend-components.md`を省略する条件は妥当。
- 3成果物はいずれも2個以上のH2を持ち、consumes 6ファイルを明記しているため、`required-sections`と`upstream-coverage`の文書形状を満たす。
- PATH除去、payload absence、failed tool、agent identity、空白path、source/projection driftの検証観点はFR-4、FR-7、NFR-3〜NFR-6と整合する。

## Review — Iteration 2

- Reviewer: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T15:06:43Z`
- Verdict: **READY**
- Finding severity: **BLOCKER 0 / MAJOR 0 / MINOR 0**

### Iteration 1 findings再評価

1. **RESOLVED — 正準3 signatureと内部helper境界。** `spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult`、`parseKiroIdeHookContext(payload: unknown): HookContextResult`、`renderClaudeHookCommand(projectDirVariable: "$CLAUDE_PROJECT_DIR", hook: HookSpec): string`が3成果物へ同一形で復元され、Flow A/B/C、rule、entityが各public operationへ対応付けられている。event分類、path/identity抽出、drop、settings走査は内部helperと明示され、追加public APIはない。
2. **RESOLVED — Claude quoting対象の閉包。** 変更対象は承認済み11 hook commandだけに縮退し、statuslineとpermission globは対象外かつbefore/after bytes不変の検証対象になった。questionsのE-OC1分類、Flow C、BR-U07-10、entity、verification ruleに矛盾はない。

### Architecture verification

- PATHからBunを除外したruntime起動、Kiro IDEのpositive/negative classification、payload absence、failed tool、unknown result wording、agent identity、audit-first/forward-only、debug-off不変、空白pathでの11 hook起動をfixture化できる具体性がある。
- Claude検証はauthored settingsと生成projectionをparseし、hook件数不変、未引用0、path実在、statusline/permission bytes不変、projection driftを対照検証するため、FR-4とNFR-3〜NFR-6を実装可能な形で満たす。
- UI entityを持たないため`frontend-components.md`省略は妥当であり、C6 ownership、6 harness projection、`dist/`非正本、self-install非拡張の境界も維持されている。

### Sensors

- `required-sections`: **PASS** — 必須3成果物はいずれもH2見出しを2個以上持つ。
- `upstream-coverage`: **PASS** — 4成果物すべてがconsumes 6ファイルを全数明記する。
- `answer-evidence`: **PASS** — questionsの承認回答と、3成果物の正準signature・11 hook限定・対象外bytes不変が一致する。
