# Code Generation Plan — U4-engine-boundary

## 計画の前提

- 対象Unitは`U4-engine-boundary`、対応要件は`FR-5` / `FR-6`。変更はphase-check対象のideation / inception / construction境界と、auto-sync専用pending Receiptの再処理に限定する。
- `amadeus-orchestrate.ts next`の「状態から検証済みdirectiveを1件だけ返す」契約を維持する。新しいdirective kindは追加せず、askは既存`ask`、auto-syncは既存`print`を使う。
- `MirrorBoundaryDecision`は`ask | auto-sync`の2値とする。発火済み、invalid config、破損Receiptは導出前の外側guardで処理し、到達不能variantを型へ追加しない。
- Receiptの単一正本はstateの`Mirror Boundary Receipts`フィールドとし、canonical phase slugをキー、値を`pending | completed`とする。`pending`はauto-syncだけを表し、askは回答処理後に直接`completed`へ遷移する。
- state更新は既存の原子更新経路へ委譲し、`next`内部で直接ファイルを書かない。auto-syncの成功通知とask回答は、対象phaseと期待状態を相関できる専用のengine/state境界で処理し、成功が確認できないpendingをcompletedへ推測しない。
- 自動副作用は固定コマンド`bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts sync`だけとする。create / closeは自動実行せず、設定値、Receipt、Issue本文、stderrからverbやshell文字列を生成しない。
- active test strategyはstate記載の**Comprehensive**。unit / integration / E2E相当を用意し、性能・security NFR、障害注入、全3境界、4象限、既存consumer回帰まで検証する。目安は本componentで10〜15件以上だが、ケース数合わせの重複テストは作らない。
- 本UnitはBrownfieldのengine変更であり、無関係なrouting、directive schema、U1 mirror動作、U3 config解決、既存state fieldとaudit eventの意味、state templateは変更しない。一方、境界処理の再試行を保持するruntime-only `Mirror Boundary Receipts` fieldは追加する。

## 変更ファイル候補

| 区分 | ファイル | 予定変更 |
|---|---|---|
| engine正本 | `packages/framework/core/tools/amadeus-orchestrate.ts` | Receipt外側guard、pending再発行、U3 resolve接続、4象限決定、ask/print生成、回答・成功通知の相関 |
| state原子更新 | `packages/framework/core/tools/amadeus-state.ts` | `Mirror Boundary Receipts`のparse/serializeと、期待状態を検査するpending/completed原子遷移 |
| U3接続 | `packages/framework/core/tools/amadeus-mirror-config.ts` | 原則変更なし。公開済みresolve型をそのまま消費し、不足が実測された場合だけ互換なexport調整 |
| Unit test | `tests/unit/t265-engine-boundary.test.ts`（実装開始時に未使用番号を再確認） | 純粋decision、Receipt parse/serialize、canonical順、invalid/破損、固定command |
| Integration test | `tests/integration/t265-engine-boundary.integration.test.ts` | 3境界×4象限、ask回答、auto-sync成功/失敗、Receipt原子遷移、consumer出力契約 |
| E2E相当 | `tests/e2e/t265-engine-boundary.test.ts` | 生成済みCLIの`next`→ask/print→成功通知→再`next` journeyと再開時pending回復 |
| 既存回帰 | `tests/unit/t114-orchestrate-next.test.ts`、`tests/unit/t-batch3-orchestrate-seam.test.ts`、`tests/unit/t-phase-check-gate-seam.test.ts` | 原則変更なし。必要なfixture追随だけを行い、通常routing・phase-check gate・stdout JSON契約を維持 |
| 配布生成物 | `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/tools/`および自己導入面 | core正本から再生成。手編集禁止 |

> テスト番号`t265`は現時点の候補である。実装開始直前に`tests/`を再走査し、共有作業で使用済みならunit / integration / E2Eを同じ次番号へ変更する。

## 実装計画

- [x] **Step 1: U4変更面と既存consumerのbaselineを固定する**  
  `handleNext` / `handleReport`、phase-check境界、directive validator、state原子更新、U3 resolve公開型を追跡する。`amadeus-orchestrate next`のstdout/stderrを読むtests、tools、skillsをrepo全体で棚卸しし、既存の「stdoutは単一directive JSON、stderrはadvisory」契約を表にする。  
  **検証:** 対象既存テスト`t114`、`t-batch3-orchestrate-seam`、`t-phase-check-gate-seam`、U3`t257`が変更前green。列挙したtest pathの全実在とrunnerの実行ファイル数を照合する。  
  **Trace:** U4、FR-5受け入れ基準、BR-U4-1/4、PD-U4-1、N-4、C-08。

- [x] **Step 2: Mirror Boundary Receiptの型・parser・canonical順序をREDで固定する**  
  canonical phase集合は既存`PHASE_CHECK_REQUIRED_PHASES`と同じ定義から導出し、ideation→inception→construction順を別の手書き集合として増やさない。field不在は空集合、既知phase×`pending | completed`だけを受理し、未知phase、未知状態、重複、構文破損を型付きerrorとするunit testを先に追加する。  
  **検証:** 正常round-trip、空、3 phase、未知key、未知status、重複、malformedの各caseが実装前RED。parser後は無効状態を後段へ渡さない。  
  **Trace:** U4、BR-U4-1/5、Business Logic Model Receipt契約、PD-U4-2、NFR reviewer I1-003 / I2-002。

- [x] **Step 3: Receiptの原子状態遷移をstate toolへ実装する**  
  既存`writeStateFile`/lock経路を再利用し、`absent → pending`、`pending → completed`、ask回答時の`absent → completed`を対象phaseと期待元状態つきで実装する。completedの再完了は冪等no-op、pending以外からのauto-sync成功通知、破損field、競合snapshotはfail-safeに拒否する。`Last Updated`以外の無関係fieldやauditを変更しない。  
  **検証:** state全体のbefore/after比較で対象field以外の不変、失敗時byte-for-byte不変、同一通知の冪等、競合時拒否をunit/integrationで確認する。  
  **Trace:** U4、BR-U4-5、Business Logic Model、PD-U4-2、NFR reviewer I1-001〜003。

- [x] **Step 4: 2値MirrorBoundaryDecision純関数をTDDで実装する**  
  入力をU3の検証済み`autoMirror`とMirror Issueフィールド有無に限定し、off/未設定→ask、on×作成済み→auto-sync、on×未作成→includeCreate付きaskを返す純関数を追加する。invalid configやReceipt状態を関数内へ混ぜない。  
  **検証:** 4象限（off×有/無、on×有/無）をtable test化し、on×未作成がcreate自動実行でなくaskへ降格すること、decision unionが2値だけであることを固定する。  
  **Trace:** U4、FR-5、FR-6、BR-U4-2/3、Domain Entities、E-MPRRA2裁定A。

- [x] **Step 5: next共通入口へauto-sync pending回復を接続する**  
  通常routingより前のactive-workflow共通入口でReceiptを1回だけ読み、pendingをcanonical順で検索する。1回の`next`では最古の1件だけに固定sync print directiveを再発行し、他Receiptやworkflow routingを変更しない。pendingがなければ既存経路へそのまま進む。  
  **検証:** 1件pending、複数pending、先頭失敗、先頭成功後の次回処理をfixture化する。失敗時は全Receipt不変、成功時は相関phaseだけcompleted、次回`next`で次phaseを処理する。  
  **Trace:** U4、FR-6、BR-U4-5、Business Logic Model共通入口、PD-U4-2、NFR reviewer I1-001 / I2-002。

- [x] **Step 6: phase-check対象3境界だけへ外側guardを挿入する**  
  `PHASE_CHECK_REQUIRED_PHASES`を通過し、次phaseへ進む直前の既存経路に限定して処理する。Receiptがcompletedならdecision導出・config read・directive追加をせず既存flowへ戻る。operation完了、通常の同一phase`next`、single-stage、read-only utility、workspace navigationには発火させない。  
  **検証:** ideation / inception / construction各境界で初回だけ発火し、operation・非境界・completed境界では0件。非境界ではU3 reader呼出し0回、state Receipt read以外の追加I/O 0をspyで固定する。  
  **Trace:** U4、FR-5、BR-U4-1/5、PD-U4-1/2、E-MPRRA1裁定A。

- [x] **Step 7: U3 resolveのfail-closed接続と4象限directiveを実装する**  
  境界guard通過後だけU3 resolveを呼び、invalidなら層名と全errorsを含む既存error directiveをstdoutへ厳密な単一JSONとして返して停止する。stderrは空、または非規範advisoryだけとする。askは「ミラー同期しますか?」を示し、未作成時だけcreate選択肢を含める。auto-syncはReceiptをpendingへ原子遷移した後、固定syncのrun-then-continue printを1件だけ返す。  
  **検証:** invalid Global/Space/Intent各層、複数invalid、4象限、Mirror Issue空白/不在をintegrationで固定する。既存invalid configテストはstdoutを単一JSONとしてparseし、`kind: "error"`、stderr空、Receipt/state byte不変を検証する。設定readは境界初回で最大3回。  
  **Trace:** U4、FR-5/6、BR-U4-2/3/4、SD-U4-2、PD-U4-1。

- [x] **Step 8: ask回答とauto-sync成功通知の相関境界を実装する**  
  ask回答は対象phaseと提示済み選択肢を検証し、「実行しない」は直接completed、sync/create選択は当該固定操作の成功確認後に直接completedとする。ask経路ではpendingを作らない。auto-syncはpending phaseに対する成功通知だけをcompletedへ遷移し、失敗・通知欠落・phase不一致はpendingを維持する。既存ask/report語彙を再利用し、新directive kindを追加しない。  
  **検証:** skip/sync/create回答、未提示verb、close、自由文、phase不一致、二重回答、sync成功/失敗、Receipt更新失敗を障害注入する。回答やtool出力中の文字列からverbを推測しない。  
  **Trace:** U4、FR-5/6、BR-U4-2/5、Business Logic Model、SD-U4-1、NFR reviewer I2-001。

- [x] **Step 9: 固定コマンドとdirective trust boundaryをsecurity testで固定する**  
  auto-sync printが正確に`bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts sync`を名指しし、create/close、設定値、Issue本文、Receipt値、stderrをコマンドへ補間しないことを検査する。生成directiveは既存validatorを必ず通し、stdoutへJSON以外を混ぜない。  
  **検証:** shell metacharacterを含むinvalid設定/error/detail相当の入力でもcommandが不変またはfail-closed。`eval`、shell展開、動的verb生成、create/close自動実行が0件。  
  **Trace:** U4、FR-6、BR-U4-3/4、SD-U4-1/2、C-05/C-08。

- [x] **Step 10: Comprehensive integration/E2E journeyを完成させる**  
  integrationで3境界×4象限（12セル）、冪等再実行、invalid、ask回答、pending回復、複数pendingを実CLI/state fixtureで検証する。E2E相当では生成済みClaude面を代表として、`next`→ask/print→操作結果通知→再`next`のjourney、session再開後のpending再発行、成功後の通常routing復帰を確認する。  
  **検証:** unit/integration/E2Eの3 test fileが実在し、runner出力のファイル数と一致。各componentで10〜15件以上を目安に、happy pathと最低2つのerror/edge caseを満たす。spawn-only盲点は純関数/state portのin-process seamで補完する。  
  **Trace:** U4、FR-5/6受け入れ基準、N-2、Comprehensive test strategy、Construction Testing Standards。

- [x] **Step 11: 既存routing・性能・配布回帰を検証する**  
  `t114`、`t-batch3-orchestrate-seam`、`t-phase-check-gate-seam`を再実行し、read-only、jump、parked、single、通常run-stage、phase-check artifact gateが不変であることを確認する。非境界reader 0回、境界最大3 config read、同境界completed後directive 0件を測る。core変更から6 harnessとself-installを再生成する。  
  **検証:** 対象回帰green、performance spy green、`bun run dist` / `bun run promote:self`後に`dist:check` / `promote:self:check` green。生成物への手編集なし。  
  **Trace:** U4、BR-U4-1/4、PD-U4-1/2、N-3/4、FR-5 consumer非影響。

- [x] **Step 12: coverage・静的品質・差分監査を完了する**  
  U4対象testをcoverage付きで実行し、新規decision、Receipt parse/transition、invalid、pending順序、成功/失敗通知の実行行0-hitをなくす。TypeScript、Biome、全CI、dist/self drift guardを実行し、package/lockfile、directive kind集合、U1/U3契約に不要な変更がないことを確認する。  
  **検証:** `bun run typecheck`、`bun run lint:check`、`bun tests/run-tests.ts --ci --coverage --coverage-dir <temp>`、`bun run dist:check`、`bun run promote:self:check`がgreen。複数test path実行前後でpath実在数とrunnerの実行file数を照合し、数値は実コマンド出力だけを記録する。  
  **Trace:** U4、FR-5/6、N-2/3/4、Testing Posture、Code Style。

## Comprehensiveテスト配分

| 層 | 主対象 | 必須ケース |
|---|---|---|
| Unit | decision / Receipt / command生成 | 4象限、2値union、parse round-trip、未知key/status、重複、canonical pending順、期待状態付き遷移、固定sync command |
| Integration | engine×state×U3境界 | 3境界×4象限、invalid各層、ask回答、auto-sync成功/失敗、Receipt更新失敗、複数pending、stdout/stderr分離 |
| E2E相当 | 生成済みCLI journey | ask/print round-trip、run-then-continue、session再開pending、成功後通常routing、6 harness配布一致 |
| Performance | read回数・非境界cost | 非境界config read 0、境界最大3 read、Receipt 1 read、completed再実行directive 0、network/audit走査0 |
| Security | 自動verb・入力境界 | sync以外の自動変更0、動的shell生成0、invalid fail-closed、自由文非実行、create/closeはaskのみ |

## 完了条件

- ideation / inception / constructionの3境界だけで、4象限どおりaskまたはauto-sync printが1件発行される。
- on×ミラー未作成はcreate自動実行でなく、create選択肢を含むaskへ降格する。
- Receiptはcanonical phase→`pending | completed`の最小形式でstateへ原子保存され、破損・競合・不一致をfail-safeに拒否する。
- pendingはauto-sync専用で、askは回答処理後completedへ直接遷移する。
- 複数pendingはcanonical順に1件ずつ処理され、成功した対象だけcompletedになる。
- sync失敗、成功通知欠落、Receipt更新失敗後もpendingが残り、後続`next`またはsession再開で安全に再発行される。
- 自動実行commandは固定syncだけで、create/closeや自由文由来commandを生成しない。
- 通常routing、phase-check gate、stdout directive / stderr advisory、U1/U3公開契約が不変。
- Comprehensiveのunit / integration / E2E / performance / security検証、coverage、typecheck、Biome、全CI、dist/self drift guardがgreen。

## レビュー対応 — Iteration 2

- [x] 3 phase × auto on/off × Mirror Issue有無の12セルを、生成済みCLIを起動するintegration tableへ拡張した。全セルでdirective kind、固定sync、create提示有無、state byte不変、stdout単一JSON、stderr空を検証する。
- [x] sync失敗後のpending再発行、Receipt更新失敗後の再試行、複数pendingのcanonical進行、session再開、phase不一致、未提示create、自由文、二重回答、skipの`absent → completed`を実行journeyとして追加した。
- [x] E2Eを静的配布比較だけでなく、生成済みClaude CLIの別process起動、pending再開、completed後の通常`run-stage`復帰まで拡張した。
- [x] completed Receipt有無の両方でstdout単一JSONとstderr分離を検証し、通常routingへの復帰を固定した。
- [x] 境界追加でaskが割り込んだ既存fixture 6件へ、通過済みphaseのcompleted Receiptを追随させた。
- [x] coverage registry / ratchetとcomplexity baselineを正規generatorで更新した。
- [x] 正規CIを全対象で再実行し、478 files、6888 assertions、0 fail、`RESULT: PASS`を確認した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:24:43Z
- **Iteration:** 1
- **Scope decision:** none

成果物間にinvalid config出力契約とReceipt状態モデルの矛盾が残る。

### Findings

- CG-U4-FORMAL-I1-001 MAJOR: invalid configはstdout単一error directiveとstderr非規範advisoryへ統一する。
- CG-U4-FORMAL-I1-002 MAJOR: Receiptを正式entityとして記載し、workflow stage状態追加なしへ限定する。
- CG-U4-FORMAL-I1-003 MINOR: 既存field/template不変とruntime-only Receipt field追加を区別する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:27:57Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の3 findingsはすべて解消され、成果物間契約は一貫している。

### Findings

- RESOLVED CG-U4-FORMAL-I1-001: invalid config出力をstdout単一error directive JSONへ統一。
- RESOLVED CG-U4-FORMAL-I1-002: MirrorBoundaryReceiptsを正式entityとして定義。
- RESOLVED CG-U4-FORMAL-I1-003: template不変とruntime-only field追加を区別。
- VERIFIED: U4 49 tests/205 assertions、全CI 478 files/6888 assertions、0 fail。
