# Code Generation Plan — evidence-revision-rebind

## 計画条件

- Unit: `evidence-revision-rebind`
- Scope: `self-fix`
- Depth: Minimal
- Test Strategy: Comprehensive
- Project Type: Brownfield
- 実装言語／実行環境: TypeScript／Bun
- 入力の縮退: `user-stories`、`application-design`、`units-generation`、各 Construction design stage は scope により SKIP されている。このため、各 Step は承認済み `requirements.md` の FR／NFR／AC と Reverse Engineering の実測へ直接トレースする。欠落 artifact の内容は推測しない。
- 非対象: API endpoint、データベース、frontend、IaC、配布生成物は本 Unit に存在しない。`dist/` と self-install 面は正本でなく、変更しない。

## 実装対象候補

| 区分 | ファイル | 予定する責務 |
| --- | --- | --- |
| 既存正準ロジック | `tests/no-silent-drop/repository-adoption-evidence.ts` | `canonicalBinding()` と artifact digest 計算を、validator と rebind が同じ定義から利用できる純粋 helper として切り出す。既存 schema v1 の検証意味論は変更しない。 |
| 新規ドメイン | `tests/no-silent-drop/evidence-rebind.ts` | 3層 bundle の parse、決定的変換、件数集計、候補 bundle の完全検証、共通 JSON envelope を実装する。GitHub／push は扱わない。 |
| 新規 adapter | `scripts/no-silent-drop-evidence-adapter.ts` | Git object／clean worktree／tree／remote tip の検査、全 page の関連 PR 取得、`refs/pull/<number>/head` 取得、隔離候補の書込みと rollback、commit／fast-forward push を port として実装する。 |
| 新規 CLI | `scripts/no-silent-drop-evidence.ts` | `rebind` と `reconcile` の引数、trust 境界、状態遷移、stdout／stderr、exit code を統括する。 |
| 新規 workflow | `.github/workflows/no-silent-drop-evidence-reconcile.yml` | `main` push ごとに既存 GitHub App credential で reconciliation を直列実行し、job summary と失敗状態を残す。`CI Success` へ依存させない。 |
| Unit test | `tests/unit/t427-no-silent-drop-evidence-rebind.test.ts` | 3層計算、件数、digest、不変 envelope、冪等性、tamper／schema／I/O failure を検証する。 |
| Integration test | `tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts` | 一時 Git repository と fake GitHub adapter で pure rebind、関連 PR 解決、2段階 tree 証明、競合、commit／push を検証する。 |
| Workflow contract test | `tests/integration/t427-no-silent-drop-evidence-workflow.integration.test.ts` | workflow を `Bun.YAML.parse` し、main-only、独立起動、最小権限、有限 timeout、直列化、許可 path、loop／stale guard を構造で検証する。 |
| 現行 bundle | `tests/no-silent-drop/adoption-evidence.json`、`tests/no-silent-drop/adoption-evidence-manifest.json`、`tests/no-silent-drop/evidence/adoption-runs.json` | 実装・試験 commit の clean HEAD へ pure rebind し、後続の evidence-only commit に3ファイルだけを含める。 |

## 実装手順

### Step 1: 正準 digest／schema 計算を単一化する

- [x] `repository-adoption-evidence.ts` の既存 `canonicalBinding()`、artifact byte digest、manifest／run／receipt の schema 検査を、既存 validator と新規 rebind の双方が呼ぶ純粋 helper に整理する。
- [x] 別の digest 定義、第4の台帳、固定件数を制御ロジックへ追加しない。
- [x] 既存 `validateEvidenceRegistry()`／`evidenceDigestForReceipt()` の結果を変更しない回帰テストを置く。
- トレース: FR-1、FR-3、NFR-1、NFR-3、AC-3、AC-4。

### Step 2: pure rebind の決定的・原子的な3層変換を実装する

- [x] 書込み前に target が40桁 lowercase SHA、local commit object、`git rev-parse HEAD` と完全一致し、index／working tree が clean であることを確認する。祖先 SHA、detached object、dirty index、dirty working tree、未解決 SHA は、3ファイルを変更する前に型付き error／非0で拒否する。
- [x] schema から全対象を列挙し、現行 bundle の revision field **24／24／25**、manifest artifact **25件**、receipt **23件**を回帰 fixture で固定する。件数は実行判定へハードコードしない。
- [x] `adoption-runs.json` の全 `testedRevision`、その実バイト sha256 を参照する manifest artifact、manifest の全 `testedRevision`、registry の top-level／全 receipt `currentRevision`、正準 `evidenceDigest` の順に候補 bytes を構築する。
- [x] 候補3ファイルを隔離領域で完全検証してから一括適用し、parse／schema／参照／digest／revision／I/O の失敗時は元 bytes へ rollback して、push可能な部分更新を残さない。変更可能 path は3ファイルの昇順 allowlist だけにする。
- [x] 同じ target／bundle の再実行は byte-identical、`status=no-op`、`code=REBIND_NOOP`、exit 0 とする。
- トレース: FR-1〜FR-5、NFR-1、NFR-3、AC-1〜AC-5、AC-10、AC-11。

### Step 3: reconcile の判定と2段階 identity proof を実装する

- [x] event revision と checkout HEAD の完全一致を先に検査し、既存 binding のまま event revision に対する到達性・digest・鮮度がすべて有効なら、`binding !== event` でも `status=no-op`／`targetRevision=null` とする。
- [x] binding の到達不能だけが失敗原因である場合に限り、landing commit に関連する Pull Request を全 page から列挙し、base=`main`、merged、`merge_commit_sha === event revision` の一意な1件へ解決する。
- [x] 永続 ref `refs/pull/<number>/head` を取得し、binding revision が最終 PR head の祖先であることを検査する。
- [x] **binding revision → 最終 PR head** は、recursive repository tree から派生3ファイルだけを除いた全 entry の path、object type、Git mode、object ID が一致するときだけ通す。
- [x] **最終 PR head → landing** は、除外なしの root tree object ID が一致するときだけ通す。Pull Request Files API の changed-file 集合、ローカル推測 path、`t413` の鮮度 path spec を identity proof の正本にしない。
- [x] PR 0件／複数、pagination 不完了、base／merge SHA 不一致、PR ref 取得不能、祖先不一致、非派生差分、base drift、rename／mode／object type／1 byte 不一致をすべて fail-closed とし、rebind／commit／push を行わない。
- トレース: FR-2、FR-6、FR-7、NFR-1、NFR-3、AC-6〜AC-8、AC-12。

### Step 4: 安定した CLI／JSON envelope と Git 操作境界を実装する

- [x] `rebind --target-revision <sha>` と `reconcile --event-revision <sha> --repository <owner/name>` を責務分離し、両者の rebind 計算は Step 2 の同じ関数を呼ぶ。
- [x] 全 status で `schemaVersion`、`operation`、`status`、`code`、`eventRevision`、`bindingRevision`、`targetRevision`、`changed`、`counts`、`paths`、`validation`、`error` の field／型を固定する。
- [x] stdout は UTF-8 JSON object 1行+末尾LFだけ、進捗／診断は stderr だけとし、`changed`／`no-op`／`superseded` は exit 0、`error` は非0にする。`REBIND_OK`、`REBIND_NOOP`、`REBIND_SUPERSEDED` と入力／検証／I/O／credential／push競合を区別する安定 code を実装する。
- [x] commit 前に focused validator と回帰試験を実行し、staged／working diff が派生3ファイルだけであることを再検査する。Conventional Commit の1 commitを event revision の子孫として作る。
- [x] push直前に remote `main` tip を再取得し、event revision から進んでいれば commit を pushせず `superseded` とする。force、non-fast-forward、無条件 retry、credential fallback を禁止する。
- トレース: FR-3、FR-4、FR-6〜FR-8、NFR-2〜NFR-4、AC-5〜AC-10。

### Step 5: main-only reconciliation workflow を追加する

- [x] `.github/workflows/no-silent-drop-evidence-reconcile.yml` を `push` の `main` だけで起動し、PR workflow と `CI Success` の `needs`／成功条件へ結合しない。rebind commit 自身の push も起動対象に残す。
- [x] 安定 concurrency key、`cancel-in-progress: false`、有限 timeout を設定する。CLI の remote-tip guard と併せ、古い run は pushせず、最新 runだけが fast-forwardで収束するようにする。
- [x] workflow既定は `contents: read` とし、write は既存 `METRICS_BOT_CLIENT_ID`／`METRICS_BOT_PRIVATE_KEY` から発行する短命 GitHub App token の `contents: write` と、関連 PR 読取りに必要な最小権限だけへ限定する。個人 token、追加 secret、新しい bypass 主体を導入しない。
- [x] GitHub App identity を設定し、CLI の1行 envelope を job summary へ残す。validation／credential／checkout／commit／push／競合の error は job 非成功とし、`continue-on-error`、`|| true`、空 catch を置かない。
- トレース: FR-6〜FR-8、NFR-2、NFR-4、AC-6〜AC-10。

### Step 6: Comprehensive unit tests を実装する

- [x] 全 entry 列挙、revision 24／24／25、artifact 25、receipt 23、artifact／receipt digest 再計算、byte再現性、no-opを検証する。
- [x] malformed schema、missing artifact、I/O failure、revision-only tamper、artifact bytes tamper、manifest digest tamper、receipt digest tamperを注入し、各ケースが実際に赤くなり成功扱いされないことを検証する。
- [x] 4 statusすべての envelope field／型、単一 stdout 行、末尾LF、stderr分離、path昇順、exit code対応、secret非露出を検証する。
- [x] 各主要componentにhappy pathと最低2つのerror／edge caseを置き、production codeへtest専用分岐を追加しない。
- トレース: テスト要件1、4、5、NFR-1〜NFR-3、AC-1〜AC-5。

### Step 7: 一時 Git repository による Comprehensive integration tests を実装する

- [x] clean HEADだけを受理し、ancestor target、dirty index、dirty working tree、未解決 targetを変更前に拒否する pure rebind trust test を実装する。
- [x] 3段階不整合、部分書込み failure injection、rollback後の元bytes一致、再実行収束、3ファイル以外の差分拒否を検証する。
- [x] fake GitHub全page応答と実Git tree fixtureで、唯一のmerged PR、binding祖先、3派生fileだけの差分、PR head／landing root tree一致のhappy pathを検証する。
- [x] 0件／複数PR、pagination欠落、base／merge SHA不一致、祖先不一致、非派生差分、base drift、rename、mode、object type、1 byte差分、PR ref取得不能を個別に注入し、変更なし／fail-closedを検証する。
- [x] rebind commit push後は `status=no-op`／`code=REBIND_NOOP`／`targetRevision=null`／追加commitなし、近接pushの古いrunは`superseded`、credential／push失敗はremote main不変となることを検証する。
- トレース: テスト要件2、6、7、AC-2、AC-5〜AC-12。

### Step 8: workflow contract と既存 test runner の配線を検証する

- [x] workflow test は `Bun.YAML.parse` を用い、main-only trigger、GitHub App token、`CI Success`失敗から独立した起動、許可3ファイル限定、concurrency、finite timeout、loop guard、stale tip guardを構造で検査する。
- [x] `tests/run-tests.ts` の既存自動検出を使い、unit／integration testを通常の `bun run test:ci` へ載せる。別の Vitest／Jest config や別枠 QA suite は新設しない。
- [x] `tsconfig.json` が `scripts/**/*.ts`、`tsconfig.tests.json` が `tests/**/*.ts` を既に含むことを確認し、既存 `package.json` の `test:ci`／`coverage:ci`／`typecheck`／`lint` をそのまま test configuration として利用する。変更が不要なら設定ファイルを触らない。
- トレース: テスト要件3、8、NFR-3、NFR-4、AC-6〜AC-10。

### Step 9: 現行 bundle を clean HEAD へ復旧し、全回帰を実測する

- [ ] 実装・unit／integration／workflow testを先にcommitし、clean branch HEADを実測してから、そのHEADをtargetにCLIのpure rebindを実行する。
- [ ] 生成差分が `adoption-evidence.json`、`adoption-evidence-manifest.json`、`evidence/adoption-runs.json` の3ファイルだけであることを確認し、後続のevidence-only commitへ含める。JSON個別手編集を正規手順にしない。
- [ ] `validateEvidenceRegistry(...).ok === true`、`t413` **10 pass／0 fail**、`bun tests/no-silent-drop-gate.ts check --base-revision <trusted-base>` の `NO_SILENT_DROP_OK` を実測する。
- [ ] focused unit／integration／workflow tests、no-silent-drop repository adoption tests、`bun run lint`、`bun run typecheck`、`bun run test:ci` を実行する。coverageは単独所有で `bun run coverage:ci` を実行し、追加行の未被覆を確認する。
- [ ] PR内ではAC-6をfixture／workflow contractで再現し、着地後の実runで最新main tipの `CI Success` とbot rebind commitを最終受け入れ証拠として確認する。
- トレース: FR-5〜FR-8、NFR-1〜NFR-4、AC-1〜AC-12、テスト要件8。

## 完了判定

- 全Stepのチェックが完了し、許可されたコード・workflow・test・3台帳以外に意図しない変更がない。
- 要件の件数、2段階tree比較、main-only収束、fail-closed述語を縮小していない。
- 未解決 BLOCKER はない。CLI名、内部配置、独立workflow採用は、上記の推奨構成で確定する。
