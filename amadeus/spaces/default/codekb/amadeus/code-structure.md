# コード構造

## harness port 開放性の観測面(intent 260715-opencode-cursor-harness、2026-07-16、最新)

opencode / Cursor harness port(Issue #626)のフォーカス面。出典は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260715-opencode-cursor-harness.md`(file:line は observed HEAD `6a23b0ec` 直読)。diff-refresh base `cf3dc88`→observed `6a23b0ec`(距離65、祖先性実測済み)でフォーカス面のハーネス開放性契約は全て不変(下記温存判定参照)。

### open-set(自動発見)3層 — 新ハーネスが「編集ゼロ」で乗る面

| 層 | seam | 所在(file:line) | 開放機構 |
| --- | --- | --- | --- |
| build ターゲット発見 | `discoverHarnessNames()` | `scripts/package.ts:68-73` | `packages/framework/harness/` を `readdirSync` し `manifest.ts` を持つ dir のみ返す(sort 済み)。ハーネス集合はハードコードされていない(:63-67 コメント)。既定ターゲット=`discoverHarnessNames()`(:764)、manifest 実在フィルタ(:769) → `harness/opencode/manifest.ts` + `harness/cursor/manifest.ts` を置けば package.ts 無編集で両者をビルド。`--check` ドリフトガードも自動で効く。 |
| runtime のハーネス dir 解決 | `harness.json`(`{harnessDir, rulesSubdir}`) | `scripts/package.ts:438` writeHarnessData が生成、runtime は install 済み `harness.json` で解決 | 実 install の harnessDir/rulesSubdir 解決は `harness.json` が権威。`amadeus-lib.ts:114` `KNOWN_HARNESS_DIRS`/`:170-172` `KNOWN_RULES_SUBDIR` は **AMADEUS_HARNESS_DIR test-seam と fallback 専用**(:109-114,:162-168 コメント明記)。 |
| skills 生成 | runner-gen | `amadeus-runner-gen.ts:60,63`(出力先=`<harnessDir>/skills/`) | `<harnessDir>/skills/` に skills を置く規約なら `skipRunnerGen=false`(省略)で stage/scope runner を自動生成。`.agents/skills/` 等の特殊探索なら codex 同様 `skipRunnerGen=true`(`manifest-types.ts:119`)+ `emit.ts` で自前生成。 |

manifest 契約は `scripts/manifest-types.ts:79-122`(HarnessManifest 全12フィールド)。新ハーネスは `harnessDir`(".opencode"/".cursor" 等)+ `coreDirs`/`harnessFiles` 投影 + `rulesRename`(null か dir 名)+ 任意 `emit` の宣言 1本で表現する。COMPILED_DATA seed は初回ビルド時に committed claude tree の JSON へ fallback(`package.ts:289-299`)するため、新ハーネスの初回ビルドは claude JSON を種にできる。

### 閉じ列挙(手動追記が要る)台帳 — 新ハーネス名を閉じた列挙で持つ9ファイル

open-set の外で「ハーネス集合そのもの」を閉じた列挙として持つファイル。本 intent フォーカス面で編集が要りうるのは計9ファイル。

**installer(packages/setup)— 5ファイル必須**(未対応だと `install --harness opencode` が弾かれる。正しさに必須):
1. `packages/setup/src/domain/harness.ts:9` `HarnessName` union type(`"claude"|"codex"|"kiro"|"kiro-ide"`)
2. `packages/setup/src/domain/harness.ts:19-24` `HarnessName.all` frozen array
3. `packages/setup/src/domain/engine-layout.ts:8-12` `ENGINE_DIR_BY_HARNESS` map
4. `packages/setup/src/modules/reporter.ts:24-25,137` usage 文字列 + invalid エラー文言
5. `tests/unit/setup-harness.test.ts:13` `toEqual(["claude","codex","kiro","kiro-ide"])`(契約テスト、要更新)

**framework runtime(test-seam/advisory)— 2ファイル**(正しさ非影響):
6. `packages/framework/core/tools/amadeus-lib.ts:114` `KNOWN_HARNESS_DIRS`、`:170-172` `KNOWN_RULES_SUBDIR`(test-seam/fallback 専用、上記 harness.json が実解決の権威)
7. `packages/framework/core/tools/amadeus-utility.ts:857` `otherTrees`(`[".claude",".kiro",".codex"]` フィルタ)、`:2000-2006` `SCAN_EXCLUDE`、`:696` doctor `.claude` 分岐(advisory 品質のみ)

**migration — 1ファイル**(aidlc→amadeus 移行で新ハーネスを扱う場合のみ):
8. `packages/framework/core/tools/amadeus-migrate.ts:71` `INSTALLED_HARNESS_DIRS=[".claude",".codex",".kiro"]`(ほか :383/:843/:1459/:2514)

**self-install — 1ファイル**(dogfood 対象化する場合のみ、面3参照):
9. `scripts/promote-self.ts:37-41` managedDirs、`:313-319` build 呼び出し

### promote:self は新ハーネス非自動対応

`scripts/promote-self.ts` は project-local dogfood install(amadeus が自分自身を開発するため、:2-8 冒頭コメント)であり配布ビルド(dist)ではない。`managedDirs`(:37-41)は **ハードコードで claude(.claude)+ codex(.codex/.agents)のみ**(kiro/kiro-ide すら対象外)、build 呼び出しも `package.ts claude`/`package.ts codex` を明示ハードコード(:313-319)。opencode/Cursor で amadeus 自身を開発する必要がなければ promote:self 編集は不要(dist 配布は package.ts の discover で成立)。self-install を新ハーネスへ広げる場合のみ managedDirs + build 呼び出しの2箇所編集が要る。**この判定は本 intent のスコープ判断事項**。

### doctor の `.claude` 専用ブロックと advisory 劣化

`amadeus-utility.ts:243-245` `handleVersion` は harness 非依存(`amadeus <version>` を出力するのみ)で新ハーネス dist から bun 直叩きで動く。`:676` `handleDoctor(projectDir)` は harness 依存: `:695` `harnessDir()` で分岐し `:696` `if (harness === ".claude")` 専用ブロック(settings.json からフック roster 導出、:714-)を持つ。`.claude` 以外は汎用経路。`:857` `otherTrees` と `:2000-2006` `SCAN_EXCLUDE` は閉じた列挙で、新ハーネスの engine dir がここに無いと「他ツリー存在」advisory 警告に列挙されない。**正しさには非影響で、doctor の advisory 品質のみが劣化**する(厳密対応には otherTrees/SCAN_EXCLUDE 追記が要る)。

### 新ハーネス追加の最小ファイル集合(既存4 harness 対比から導出)

既存4 harness は2系統: **Claude/Kiro 型**(薄 manifest、skills/agents を core .md + harnessFiles で投影)と **Codex 型**(`emit.ts` 368行が宣言行で表せない構造発散 — config.toml/hooks.json/AGENTS.md/11 agent TOML/`.agents/skills/` ツリー全体 — を内包、`skipRunnerGen=true`)。系統は各ハーネスの skills・agents・hooks 探索規約で決まる(Architect 合成で確定すべき設計問い)。

- 配布(dist)成立の最小: `packages/framework/harness/<name>/manifest.ts`(必須)。Claude/Kiro 型なら + `onboarding.fills.ts` + `skills/amadeus/{SKILL.md, question-rendering.md, issue-ref-contract.md}` + rules @-stub(`rules-amadeus.md` 相当)+ 設定 example + `dot-gitignore`(Kiro 型は加えて agent .json 群 + adapter.ts + settings/cli.json、rulesRename あり、onboarding=AGENTS.md projectRoot)。Codex 型なら + `emit.ts` + adapter shim。
- installer 選択可の必須編集: 上記閉じ列挙台帳 1〜4(+契約テスト 5)。
- docs: README(対応表 4→6 + バッジ)+ `docs/guide/harnesses/<name>.md(.ja)` 新規×2言語 + 各 guide のハーネス言及棚卸し。

## canonical settings 観測面（intent 260709-canonical-settings、2026-07-16、履歴）

Amadeus 共通の既定挙動を型付き canonical settings（1正本）へ集約する intent（#623）の観測面。出典は本 intent の `inception/reverse-engineering/scan-notes.md`（Developer scan、observed HEAD `e55cc25143717d84b3e7f1a543151f0b7c99b96f` 直読の file:line）。手法は diff-refresh（base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`＝前 intent 260713-swarm-driver-migration の observed、祖先・距離58で最小、observed=`e55cc25143717d84b3e7f1a543151f0b7c99b96f`）。**区間58コミットに本 intent 関連の新規機構は存在せず、設定土台は base 時点で確立済み**（区間主因は upstream-v2 移行 `amadeus-migrate.ts` +3823行の新規と移行テスト大量追加）。

### フォーカス面1: 設定配置面（ディレクトリ構造・.gitignore）

- `amadeus/spaces/default/` 直下の実ディレクトリは `codekb/`／`intents/`／`knowledge/`／`memory/` の4つのみで、**`settings.json` 相当の設定ファイルは現状存在しない**（`memory/` は `org.md`／`team.md`／`project.md`／`phases/`／`templates/` の手編集ルール層正本）。
- `.gitignore:47-58` の amadeus 関連 ignore パターン: `amadeus/active-space`（:50）／`amadeus/spaces/*/intents/active-intent`（:51）／`amadeus/.amadeus-clone-id`（:52）／`amadeus/.amadeus-sessions/`（:53）／`amadeus/spaces/*/intents/*/runtime-graph.json`（:54）／`amadeus/spaces/*/intents/*/.amadeus-*`（:55）／`amadeus/spaces/*/intents/.amadeus-*`（:58）。**すべて cursor／machine-local runtime／intent 配下の `.amadeus-*` に限定**。
- 含意: `amadeus/spaces/<space>/settings.json`・`memory/` 配下・workspace ルート `amadeus/settings.json` のいずれに設定ファイルを置いても**どのパターンにも一致せず ignore されない**（コミット対象）。version-controlled 化（org.md「amadeus/ ワークスペースはバージョン管理」方針）なら追加の gitignore 変更は不要。

### フォーカス面2: doctor 統合面（`amadeus-utility.ts` handleDoctor）

- health-check row 型: `interface DoctorCheck { pass: boolean; label: string; fix?: string }`（`amadeus-utility.ts:407-411`）。個別チェック関数（`hookHeartbeatDoctorCheck`:527、`checkPhaseProgressConsistency`:653 等）がこの型を返す。
- `handleDoctor(projectDir: string): void`（:676）は内部で `results: Array<{pass,label,fix?}>`（:677）を組み立て、各チェックを inline `results.push({...})` するか `DoctorCheck` 返却関数の結果を push する二方式。**副作用のない純関数化（`export function xxxCheck(projectDir): DoctorCheck`）が in-process テスト可能な既習様式**（spawn-only の handleDoctor 盲点回避、:568/:599 コメント参照）。
- exit code 方針: 集計は `passed`／`failed` カウント（:1926-1937）、末尾 `process.exit(failed > 0 ? 1 : 0)`（:1958）で**どの row が fail でも exit 1**。stdout に全診断を出す（exit code と独立、:1954-1957）。
- 拡張の雛形: `AMADEUS_DEFAULT_SCOPE` 検証 row（:875-892、unset=pass／valid=pass／invalid=fail+fix）。canonical settings の doctor 統合はこの row を拡張する形が自然（面7と直結）。

### フォーカス面3: 既存 parse/validation パターン（厳格 vs 寛容の2 posture）

| posture | 正本 | エントリ／構造 | 未知キーの扱い |
| --- | --- | --- | --- |
| **厳格（Result 型）** | `amadeus-stage-schema.ts` | `validateStageFrontmatter():ValidationResult`（:136）。判別ユニオン `{valid:true;data}｜{valid:false;errors[]}`（:55-57）。`REQUIRED_FIELDS`（:103-116）／`OPTIONAL_FIELDS`（:118）／`KNOWN_FIELDS=new Set([...REQUIRED,...OPTIONAL])`（:120）／`RESERVED_KEYS:Readonly<Record<string,string>>`（:95-101）。型ヘルパ `checkString`／`checkPositiveInteger`／`checkStringArray`／`checkEnum`／`checkSlugPattern`（:455-513） | **errors に集約（throw しない）**: `errors.push(\`unknown key: ${key}\`)`（:163） |
| **寛容（throw）** | `amadeus-rule-schema.ts` | `parseRuleFrontmatter(raw):RuleFrontmatter`（:46）／`validateRuleFrontmatter()`（:63） | **未知キー許容**（:39 コメント forward-compat additive）。不正時のみ `throw new Error(...)`（:69/:72） |

- 設計含意: canonical settings ローダは「ユーザー編集ファイルの未知キーをどう扱うか」で posture を選ぶ。doctor へ流すなら **stage-schema の判別ユニオン `{valid,data}｜{valid,errors[]}` が最も接続容易**（errors をそのまま fail row に写せる）。

### フォーカス面4: 既存 JSON ロード実装（設定ローダが従うべき既習様式）

- intents.json 読み（`amadeus-lib.ts`）: `readIntentRegistry():IntentRegistryEntry[]`（:1496-1509）= `JSON.parse(readFileSync(path,"utf-8")) as unknown`（:1503）→ `Array.isArray` 構造チェック（:1504）→ **try/catch で absent／malformed は `[]` へ寛容フォールバック**（:1505-1507）。書きは `writeFileAtomic(path, JSON.stringify(list,null,2)+"\n")`（:1481/:1832/:1874）。関連 `appendIntentToRegistry`（:1466）／`intentsRegistryPath`（:1462-1464）。
- runtime-graph.json／scope-grid.json 読み（`amadeus-graph.ts`）: path 解決は env-seam 経由 `scopeGridPath()=process.env.AMADEUS_SCOPE_GRID ?? join(DATA_DIR,"scope-grid.json")`（:307、stage-graph も同型 `AMADEUS_STAGE_GRAPH`）。load 後キャッシュ（:326- コメント）。runtime-graph は #849 self-heal 対象（gitignored machine-local 生成物、`amadeus-learnings.ts:151`）で not-found 時は再コンパイル→なお無ければ `fail(...)`（:173/:180）。
- 様式4点: **(a)** `JSON.parse(readFileSync) as unknown` + 構造ガード、**(b)** 欠損は用途で二分（registry=`[]` 寛容／compiled graph=再生成 or fail）、**(c)** 書きは `writeFileAtomic` + 2-space + 末尾改行、**(d)** path は `AMADEUS_*` env-seam で override 可能。canonical settings ローダはこの4点を踏襲すべき。

### フォーカス面5: 共通挙動設定の3系統分散（重複なしの棚卸し結果）

- ハーネス設定ファイルの実態: リポジトリルート実在 harness engine dir は **`.claude` と `.codex` のみ**（`.kiro` はルート不在。ただし `dist/kiro/`・`packages/framework/harness/{claude,codex,kiro,kiro-ide}` は4 harness 実在）。`.claude/settings.json.example`（6745B）は `permissions.allow`／`statusLine`／`hooks`／`companyAnnouncements` を持つが**Amadeus 挙動設定（depth／test-strategy／autonomy 等）は皆無**（model／provider も未 pin）。`.codex/config.toml.example` は `AMADEUS_RULES_DIR` seam・`sandbox_mode`・statusline のみで depth／test-strategy／autonomy キーは `grep -c`=0。
- **棚卸し結論**: Amadeus 共通挙動設定はどのハーネス設定ファイルにも**重複記述されていない**。挙動は3系統に分散:
  1. **CLI フラグ** — `--depth`／`--test-strategy`（`amadeus-orchestrate.ts:396-400`、:448-449 で born intent へ伝播）
  2. **env var** — `AMADEUS_DEFAULT_SCOPE`（settings.json の `env` 由来、面7）
  3. **state ファイルフィールド** — `Construction Autonomy Mode`（`amadeus-orchestrate.ts:722`、`amadeus-bolt.ts:807` が `setFieldStrict` で書く）
- canonical settings intent はこの分散した「1プロジェクトの既定挙動」を型付き1正本へ集約するのが狙いと読める。

### フォーカス面6: dist/self-install 同期経路（`scripts/package.ts` / promote:self）

- **正本の実配置**: `packages/framework/core/`（=`CORE_ROOT`、`package.ts:56-57`）と `packages/framework/harness/<name>/`。root の `core/`・`harness/` は**存在しない**（base 時点で `packages/framework/` へ移設済み、区間内の移動ではない）。
- 新規 tool の dist 搭載条件: `buildTree` が `core/<src>` を `dist/<name>/<harnessDir>/<dst>` へコピー（`package.ts:11-14`、:336 `srcDir=join(CORE_ROOT,src)`）。`.ts`／`.json` はトークン置換なしコピー、`.md` はトークン置換（:76-78）。harness は `manifest.ts` 行から**発見**（:64-71）。→ **新設 `amadeus-<x>.ts` を `packages/framework/core/tools/` に置けば自動で全 dist に載る**（手動 dist 編集は Forbidden）。
- コンパイル済みデータは dist のみ: `COMPILED_DATA=["tools/data/stage-graph.json","tools/data/scope-grid.json"]`（:157）。設定を「コンパイル済みデータ」にするなら同扱い、「手編集正本」なら core/memory 相当 verbatim copy 経路（:227-255 emitMemory/seed）を参照。
- promote:self: `scripts/promote-self.ts` `promoteSelfMain(argv,repoRoot)`（:300）、`--check`／`--apply`／`--no-build`（:142）が Claude／Codex の project-local self-install を同期。正本（core/harness）を触ったら `bun run promote:self` 必須。検証は `bun run dist:check`（package.ts --check の byte 差分ガード :31-34）+ `bun run promote:self:check`。

### フォーカス面7: env var 読み込みと責務境界（`AMADEUS_DEFAULT_SCOPE` precedent）

- `packages/framework/core/tools/*.ts` が読む distinct `AMADEUS_*` env var は約40種で用途4分類: **path-seam（テスト isolation 用が大半）** `AMADEUS_RULES_DIR`／`AMADEUS_STAGE_GRAPH`／`AMADEUS_SCOPE_GRID` 他約16種、**挙動トグル/既定値** `AMADEUS_DEFAULT_SCOPE`／`AMADEUS_SKIP_ARTIFACT_GUARD`／`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`／`AMADEUS_MIGRATION_DOCTOR`、**lock チューニング** `AMADEUS_AUDIT_LOCK_*` 他、**テスト注入専用** `AMADEUS_DOCTOR_TEST_SWAP_*` 他。
- **最重要 precedent = `AMADEUS_DEFAULT_SCOPE`**: 読みは `amadeus-orchestrate.ts:574`（`const envScope=process.env.AMADEUS_DEFAULT_SCOPE`）、resolve 順「引数→env→既定」（:560/:574）。不正時は canonical validator が `Invalid AMADEUS_DEFAULT_SCOPE "...". Valid scopes: ...`（:1532-1534、`amadeus-utility.ts:3925-3931`）。由来コメントが決定的: `amadeus-utility.ts:871`「project-default scope from **settings.json env**」、:872-874「settings.json env が Bash に露出する Claude セッション内でのみ観測可能」。
- 含意: **「settings.json の `env` ブロック → `AMADEUS_*` env var → ツールが読む」チャネルが既に1本存在する**。canonical settings はこの単発チャネルを、型付き設定ファイル（1正本）から複数既定値を供給する形へ一般化する intent と整合。責務境界: depth／test-strategy には env var が無く（CLI フラグ + state のみ）、autonomy も env でなく state field。「env var は現状スコープ既定にしか使われていない」= canonical settings が新設定を持つ余地が明確にある。

### codekb stale 記述チェック結果

- `architecture.md:13,:175,:179-180`・`business-overview.md:37`・`api-documentation.md` 各所は既に `packages/framework/core/`／`packages/framework/harness/<name>/` の3層構造を正しく反映し、本 intent 観測面（設定配置・doctor・parse・JSON・env）に関する **codekb の stale 記述は検出されなかった**（Developer 判定）。よって他 codekb 成果物は温存（churn 回避、cid:reverse-engineering:c1）。
- 参考（codekb 外のルール層注意）: `memory/project.md` の "Way of Working"／Mandated は依然 `core/`／`harness/<name>/` を編集正本と表記するが実配置は `packages/framework/core/`／`packages/framework/harness/<name>/`。この不整合は **base より前**の既存事項で本 intent の range 外・codekb 外（memory ルールの保守事項）。事実記録に留める。

> 以下は過去 intent の構造記録。冒頭の「本 intent」等は各見出しに記された履歴 intent を指し、今回 intent の current marker ではない。

## swarm driver 変更面の配置境界（intent 260713-swarm-driver-migration、2026-07-13、履歴）

| 層 | 正本／生成物 | 現行責務 | 新 driver 契約での含意 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | 正本 | autonomy、runtime graph、未完了 batch、walking-skeleton から `invoke-swarm` eligibility を決定 | eligibility は維持。driver selector の自由判断を混ぜず、必要なら機械可読入力だけを渡す |
| `packages/framework/core/tools/amadeus-directive.ts` | 正本 | `{kind, units, repo?}` の schema／parser | requested／selected／topology／capability を directive に載せるかは設計判断。現行は driver-neutral |
| `packages/framework/harness/<name>/skills/amadeus/SKILL.md` | harness 正本 | live conductor の fan-out／retry 手順と現行 driver 選択 | driver 選択が prose に分散する現状。共通 selector の結果を harness adapter が実行する境界候補 |
| `packages/framework/core/tools/amadeus-swarm.ts` | 正本 | `prepare`／`check`／`finalize`、worktree／Bolt、protected file、merge、swarm audit | AI dispatcher にしない。driver-aware audit payload と選択結果の受け口候補 |
| `packages/framework/harness/{claude,codex,kiro,kiro-ide}/onboarding.fills.ts` と Codex `emit.ts` | harness 正本 | harness ごとの導入・設定・生成 | selector、必要な experimental flag、Ultra／trust／capability probe の利用者契約を同期する面 |
| `scripts/package.ts` | build 正本 | core／harness から4 `dist` を生成し drift、whole-tree orphan、source-unreferenced を検査 | 正本変更後の唯一の生成経路。`dist/**` を直接編集しない |
| `dist/<harness>/` | 生成物 | 配布可能な harness tree | `bun scripts/package.ts` でのみ同期 |
| `scripts/promote-self.ts` → `.claude`／`.codex`／`.agents` | self-install 正本＋生成先 | Claude／Codex の project-local self-install | Claude／Codex 正本変更後に `bun run promote:self` と drift check が必要。Kiro は対象外 |
| `tests/unit`／`tests/integration`／`tests/e2e` | 検証正本 | selector、directive、referee、配布、live transport | 決定的 matrix と opt-in live native proof を分離する |

現行 `AMADEUS_SWARM_DRIVER` 実装は0件であり、追加先は既存の層境界を壊さず決める必要がある。最小構造は、core に deterministic selector と型、harness に capability probe／driver adapter、referee に監査用の選択結果を渡す形だが、これは現時点では設計仮説であり Application Design で確定する。

## 計測 seam 台帳 — metrics-observation の観測面(intent 260712-metrics-observation、2026-07-12)

既存計測経路(CCN 分布・テスト数・カバレッジ%)の出力をコミット snapshot に保存する観測機構(#921)が再利用する seam の export 状況・非 export ギャップ・CI 権限前例・配置規約。出典は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260712-metrics-observation.md`(file:line は observed HEAD `c11554226` 直読)。base→observed(`13598b752`→`c11554226`、56コミット)でフォーカス面の export シグネチャは全て不変(実コード触は `tests/lib/coverage-normalize.ts` の #876 closing-only strip のみで export byte 同一)。

### 計測 seam の export 状況(snapshot 入力面)

| 計測軸 | seam | 所在(file:line) | export | snapshot 消費形態 |
| --- | --- | --- | --- | --- |
| CCN 生データ | `runLizard(): MeasurementOutcome` | `tests/complexity-gate.ts:151` | **export** | `records`(path/name/ccn/ordinal)を in-process import して分布導出。spawn 不要 |
| CCN CSV 正規化 | `parseLizardCsv` / `assignOrdinals` | `tests/complexity-gate.ts:128` / `:141` | **export** | lizard 直叩きで自前パースする場合の再利用点 |
| CCN 判定/表示 | `evaluateComplexity` / `baselineMapOf` / `renderBaseline` | `tests/complexity-gate.ts:241` / `:268` / `:223` | **export**(純関数) | baseline 突合・ラチェット表示 |
| CCN 計測対象・閾値 | `MEASUREMENT_ROOTS` / `CCN_BLOCK_THRESHOLD`(15) / `CCN_WARN_FLOOR`(11) | `tests/complexity-gate.ts:43` / `:35` / `:36` | **export const** | 計測面・warn band 分類の定数 |
| カバレッジ機械可読出力 | `writeCoverageTotalsJson()` → `coverage/coverage-totals.json`(`{schemaVersion:1,hits,lines}`) | `tests/run-tests.ts:610` / `:613` | 関数は非 export だが**出力 JSON が機械可読 seam** | %は hits/lines から整数導出。出力先 `coverage/` は **.gitignore 済み**(下記) |
| カバレッジ lcov 正規化 | `normalizeCoverageReport` / `computeStrippableLines` | `tests/lib/coverage-normalize.ts:273` / `:79` | **export**(in-process 可) | lcov から SF/LF/LH 再導出する場合の再利用点。#876 で本体変更も export シグネチャ不変 |

### 非 export ギャップ(唯一の設計判断持ち越し)

- **テスト数の機械可読 seam は不在**(既知ギャップ、functional-design へ持ち越し)。`printSummary()`(`tests/run-tests.ts:899`)が `Test files:`(`:903`)/`Total assertions:`(`:905`)/`Failed files`(`:904`)/`Failed assertions`(`:906`)を **stdout へ print するのみ**で構造化 JSON 出力なし。集計カウンタ `totalFiles`/`failedFiles`/`totalTests`/`totalFailed`(`:398-401`、モジュールスコープ、**非 export**)は per-file `.meta`(`PASS/FAIL`/`TESTS`/`FAILED`、`:434`/`:458`)から積算。snapshot はランナー stdout 行のパースか `.meta` 集計、または seam 化のいずれかを要する。
- カバレッジ内部集計 `collectCoverageTotals(lcov)`(`tests/run-tests.ts:538`、**非 export**)は lcov から `{rows,totalHits,totalLines}` を単一パースで導出し HTML と totals.json の共有源。snapshot がカバレッジ%を lcov から直接取るならこの関数相当を再導出するか `coverage-totals.json` を読む。

### CI 権限前例(commit push を伴う workflow の踏襲元)

| workflow | permissions | commit push 前例 | concurrency |
| --- | --- | --- | --- |
| `ci.yml` | `contents: read`(`:23-24`)、coverage job のみ `id-token: write`(`:81`、Codecov OIDC) | **push 不可**(read 権限) | main は SHA キーでキャンセル無効、PR は ref キーで supersede(`:12-21`) |
| `release.yml` | `contents: write`(`:48`) | release-it が `github-actions[bot]`(`:101`)で bump コミット + tag を **main へ直 push**(`:97-114`)。**GITHUB_TOKEN の push は他 workflow を非トリガー**(`:15-16` コメント、CI ループ回避の設計前例) | `group: release-setup`、`cancel-in-progress: false`(`:43-45`) |

含意: snapshot をコミットへ書く workflow は `contents: write` を要し、release.yml の bot commit + GITHUB_TOKEN 非トリガー前例を踏襲すれば CI ループを起こさない。

### 配置規約(dist 同期 C2 スコープと gitignore)

- dist コピー源は `CORE_ROOT=packages/framework/core`(`scripts/package.ts:57`)+ `HARNESS_ROOT=packages/framework/harness`(`:58`)配下のみ。**`scripts/` と `tests/` は dist へ一切コピーされない** → snapshot ツールをそこに置けば `dist:check`/`promote:self:check`(C2)の**対象外**(dist 再生成義務なし)。逆に `core/` 配置は C2 対象。
- 既存兄弟 CLI 様式: `complexity-gate.ts`/`coverage-project-gate.ts` の `main(args): number` + `import.meta.main`(`complexity-gate.ts:372`/`:384`)。snapshot ツールはこの既習様式に揃える。
- `metrics/` 相当ディレクトリは**不在**(snapshot 出力先は新規ディレクトリの設計判断)。`.gitignore` は `coverage/`(`:30`)を無視 → **snapshot 出力先を `coverage/` 配下にすると commit されない**(要注意)。metrics/snapshot 関連の無視エントリは無し。

## restart-loss フォーカス面の区間構造変化(intent 260711-docs-repair-batch9、2026-07-11)

diff-refresh 区間 `b845478bb..13598b752`(59コミット)のうち、本 intent フォーカス5欠陥の面(#885 slug 境界 / #886 phase-check 境界)に関わる構造変化。出典は本 intent の `inception/reverse-engineering/scan-notes.md`(#885/#886 節の file:line 実測)。#812/#824/#680 の欠陥3ファイル(kiro-ide SKILL.md / onboarding.fills.ts / sensor-type-check.ts)は区間内**無変更**のため構造記録なし(欠陥のみ code-quality-assessment.md に記録)。

| 区間コミット | 構造変化 | フォーカス面への関与 |
| --- | --- | --- |
| `c4304edf4`(#880) | `amadeus-state.ts` の Phase Progress roll-up 配線を advance/finalize/complete-workflow に導入。flip 本体 `setPhaseProgress`(`:101`)/ `markPhaseVerified`(`:114`、setPhaseProgress の薄いラッパ) | #886 の欠陥座標系を再構築した張本人。境界完了4経路(handleAdvance `:1104` / handleFinalize `:1333` / handleCompleteWorkflow `:1428` / handleApprove `:1670`)へ flip を配線したが `verifyPhaseCheckArtifact` precondition は復元せず(phase-check ゲート喪失は未修復) |
| `aac1869e4`(#869) | `amadeus-jump.ts` / `amadeus-orchestrate.ts` に jump の per-phase VERIFIED/SKIPPED を再構築 | jump 経路にも phase-check ゲートを復元せず(grep `phase-check\|PHASE_CHECK\|verifyPhaseCheck` = 0件)。#886 の未復元面 |

**含意**: #886 の phase-check ゲートは restart 前旧系譜(`8cf816138`)で `PHASE_CHECK_REQUIRED_PHASES` + `verifyPhaseCheckArtifact` として存在したが、restart 後の現行 `amadeus-state.ts` には不在。区間内の #880/#869 は境界イベントの flip/roll-up 構造を作り直したものの、旧系譜のゲート precondition を伴わない flip-only 再構築だった(旧系譜 vs 現行の詳細 file:line は architecture.md「docs-repair-batch9 の観測面」節)。#885 の slug 境界一本化(`normalizeWorktreeSlug`)は現行 `amadeus-lib.ts:2099`(worktreePath)/`:2580`(validateBoltSlug)・`amadeus-worktree.ts:195`・`amadeus-state.ts:250` の各 `validateSlug`/`SLUG_RE` が**個別実装のまま**で、旧系譜のチョークポイント一本化構造は現行に存在しない。

## ゲート系ツールの構造テンプレート(intent 260710-complexity-gate、2026-07-10)

複雑度ゲート(feature スコープ)が踏襲する構造テンプレートは `tests/coverage-project-gate.ts`(#762、236行)で確立済み。段構成:

| 段 | 行 | 役割 |
| --- | --- | --- |
| env seam(呼び出し時解決) | :38-54 | `totalsPath()`/`baselinePath()` が `AMADEUS_COVERAGE_TOTALS`/`AMADEUS_COVERAGE_PROJECT_BASELINE` を呼び出し時に解決(in-process seam) |
| 型定義(判別ユニオン) | :59-77 | `Totals`/`FailReason`(5値)/`GateResult`(pass/fail 判別)/`LoadedTotals`(読み込みとパース分離) |
| parse-don't-validate | :83-113 | `parseTotalsText` が `ParseOutcome` を返す。schemaVersion===1・非負整数・hits<=lines を検査 |
| BigInt 厳密判定 | :119-126 | `passesThreshold` が除算を排した整数比較。`pct()` は表示専用(:128-130) |
| fail-closed 分類 | :132-170 | `evaluateGate` が MISSING_CURRENT→MALFORMED→MISSING_BASELINE→EMPTY_POPULATION→DROP_EXCEEDED の順で fail |
| CLI(`--check`/`--update`) | :175-236 | `load`/`runCheck`(fail で stderr+exit1)/`runUpdate`(baseline 再書き)/`main`(他フラグは USAGE+exit2)。`import.meta.main` で `process.exit(main(...))` |

committed baseline は `tests/.coverage-project-baseline.json`。エクスポート(`evaluateGate`/`main`/`runCheck`/`runUpdate`/型)により in-process seam でテスト可能。複雑度ゲートの lizard CCN baseline ラチェットはこの段構成を直接踏襲する(baseline JSON は現存 CCN>15 の42関数を grandfather)。CI ジョブ DAG(`check`/`coverage`/`codecov-status`/`ci-success`)と lizard ステップ配置は本ページ下部「Coverage CI 経路」節および architecture.md「ゲート系ツールの正準テンプレートと CI ジョブ構成」節を参照。

## packaging 構造(intent 260710、#735 の中核)

> 前回 intent の2バグは出荷済み(#685→#729、#670→#727)。下記は source-unreferenced-check intent(履歴)の重点構造。

### `scripts/package.ts` の段構成

`buildTree(m, outRoot, seedFrom)`(L307-460)が build の入力読み取りと dist 生成を一手に担う。段構成:

1. **core dirs 投影**(L322-344): `m.coreDirs` の各 `src` を `walk()` で全列挙し token 置換 + rules-rename してコピー。`frontmatterAdditions` の未ヒット検出付き(L345-351、typo ガード)。
2. **harness authored files コピー**(L357-363): `m.harnessFiles` の**列挙された `src` のみ**コピー。`projectRoot:true` は `dist/<name>/` 直下、それ以外は `<harnessDir>/` 内。
3. **onboarding**(L370-376)/ **memory tree emit**(L382-395)/ **compile**(L405-416)/ **harness.json/VERSION emit**(L425-431)/ **runner-gen**(L438-441)/ **emit プラグイン**(L446-458)。

`checkHarness(name)`(L554-634)は tmp に build して committed dist と byte-diff:

| pass | 行 | 検出 |
| --- | --- | --- |
| built → committed | L565-573 | `MISSING`/`DIFFERS` |
| committed → built(harness-dir) | L574-582 | `ORPHAN`(`authoredExempt` で除外可) |
| projectRoot harnessFiles | L586-592 | 外部 `MISSING`/`DIFFERS` |
| emit-owned(harness-dir 外) | L595-604 | `MISSING`/`DIFFERS` |
| dist 全域 orphan scan(#711) | L605-628 | 期待集合外の committed ファイルを `ORPHAN` |

CLI(L639-682): `--check` で `checkHarness`、それ以外で `writeHarness`。ターゲットは `discoverHarnessNames()`(L68-73、`harness/*/manifest.ts` の存在で発見)または明示名。`present` フィルタ(L668)は manifest を持つ harness のみビルド。

### harness manifest スキーマと全 harness 目録

契約は `scripts/manifest-types.ts` の `HarnessManifest`(L70-113): `coreDirs`/`harnessFiles`/`frontmatterAdditions?`/`onboarding?`/`rulesRename`/`authoredExempt`(L101、RegExp[])/`skipRunnerGen?`/`emit`。`authoredExempt` は「生成/コピー dir 内に置かれる authored ファイルを orphan scan から除外」する regex 群。

| harness | harnessDir | rulesRename | authoredExempt | emit / skipRunnerGen |
| --- | --- | --- | --- | --- |
| claude | `.claude` | `null` | `[]`(空) | emit `null` |
| codex | `.codex` | `amadeus-rules` | `[/^hooks\/amadeus-codex-[^/]+\.ts$/]` | emit あり / `skipRunnerGen:true` |
| kiro | `.kiro` | `steering` | `[/^agents\/[^/]+\.json$/, /^hooks\/amadeus-kiro-[^/]+\.ts$/]` | emit `null` |
| kiro-ide | `.kiro` | `steering` | `[/^agents\/[^/]+\.json$/, /^hooks\/amadeus-kiro-[^/]+\.ts$/, /^hooks\/[^/]+\.kiro\.hook$/]` | emit `null` |

`authoredExempt` は harness-dir subtree orphan pass(L579)でのみ消費される。**kiro と kiro-ide の差は `.kiro.hook` exemption の有無**: kiro-ide は `.kiro.hook` を `harnessFiles` で正規に出荷する(9個、L51-59)ため exemption が必要。kiro CLI は `.kiro.hook` を出荷しない(hooks は `agents/amadeus.json` から読む)ため、#737(`6f1d7ab2a`)で7個の stale ソースを削除し vacuous exemption `/^hooks\/[^/]+\.kiro\.hook$/` を除去した。

### 全 harness の authored ソース実態(manifest 参照状況)

`packages/framework/harness/<name>/` の実ファイルと manifest 参照の対応(#735 の「正当な未参照候補」= build 機構ファイル):

| harness | authored ソース | manifest 参照(出荷される) | build 機構(出荷されない、正当に未参照) |
| --- | --- | --- | --- |
| claude | 8ファイル | `SKILL.md`/`question-rendering.md`/`rules-amadeus.md`/`settings.json.example`/`settings.local.json.example`/`dot-gitignore` | `manifest.ts`/`onboarding.fills.ts` |
| codex | 7ファイル | `hooks/amadeus-codex-adapter.ts`/`dot-gitignore` + `SKILL.md`/`question-rendering.md`(emit 経由) | `manifest.ts`/`onboarding.fills.ts`/`emit.ts` |
| kiro | 13ファイル | `agents/*.json`(6)/`hooks/amadeus-kiro-adapter.ts`/`settings/cli.json`/`SKILL.md`/`question-rendering.md`/`dot-gitignore` | `manifest.ts`/`onboarding.fills.ts` |
| kiro-ide | 22ファイル | `agents/*.json`(6)/`hooks/amadeus-kiro-adapter.ts`/`hooks/*.kiro.hook`(9)/`settings/cli.json`/`SKILL.md`/`question-rendering.md`/`dot-gitignore` | `manifest.ts`/`onboarding.fills.ts` |

正当な未参照(build 機構: `manifest.ts`/`onboarding.fills.ts`/codex の `emit.ts`)は `package.ts` から `require()` で読まれるモジュールであり、dist へコピーされない設計。#735 の source-unreferenced check はこれらを誤検出しない除外設計を要する。現時点で全 harness に **manifest 参照も build 機構でもない未参照ソースは残っていない**(#737 で kiro の7個を除去済み。実測: `harness/kiro/hooks/` は `amadeus-kiro-adapter.ts` のみ)。

## 260709-gate-mechanics(前 intent、履歴)関連構造

## 差分リフレッシュ(260709-packaging-repair-batch)

packaging-repair-batch(intent 260709-packaging-repair-batch、履歴)の2バグの正本ファイルと、差分区間 `a1c79dc12..22e3eb5aa` の構造的差分。

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `scripts/package.ts` | `dist/<name>/` の生成・検査(`buildTree`/`writeHarness`/`checkHarness`) | **#701 の対象**。`checkHarness`(L554-624)の orphan スキャンルート集合 `[".agents","amadeus"]`(L611)が dist ルート平坦面を含まない。clean-sweep(`writeHarness` L521-549)も harness dir と `dist/<name>/amadeus/` の2つのみを掃く |
| `scripts/release-version-sync.ts` | version 面3点(version.ts / README バッジ / setup package.json)の同期 | **#702 の対象**。`patchFile`(L34-45)、version.ts patch(L47-51)→ badge patch(L53-54)の適用順、version 受理正規表現(L22) |

**tests/ 層の目録更新(hermeticity 再編 + 新規)**:

- 新規(A): `tests/lib/test-size.ts`(テストサイズ計測の共有ヘルパー、`tests/lib/` 配下)、`tests/unit/t-test-size-drift.test.ts`(サイズドリフトガード)、`tests/unit/setup-http.test.ts`、`tests/unit/t112-delegated-approval.test.ts`、`tests/unit/t202-hook-project-dir-worktree-marker.test.ts`、`tests/unit/t202-sensor-type-check-tsc-launcher.test.ts`。
- 再編(M): PR #703 により `tests/unit/`・`tests/integration/`・`tests/e2e/` の多数ファイルで hermeticity(共有状態・実行順序依存の排除)修正。`tests/run-tests.ts`・`tests/lib/setup-*-fixture.ts`・coverage レジストリ(`.coverage-ratchet.json`/`.coverage-registry.json`)も追随更新。
- テスト層構成(smoke / unit / integration / e2e の4層 + `tests/lib/` 共有)自体は不変。
- 新規(A、`9a2f5c72..24197d755` = `260709-dynamic-test-size` スキャンで確認、#721/#722 由来): `tests/helpers/arbitraries/semver.ts`(PBT 用 arbitrary ヘルパー、**新規ディレクトリ `tests/helpers/arbitraries/`**)、`tests/unit/setup-semver.pbt.test.ts`(fast-check ベース PBT 単体テスト、ヘッダ `// covers: domain:setup-semver` / `// size: small`)。テストランナー・size 分類ロジックには非関与(#699 フォーカス面への影響なし)。`tests/integration/t92.test.ts` は #709 対応で test 44 に skip ガードを追加(M)。

## トップレベル構造

`packages/` は `framework` と `setup` の2パッケージ構成のまま。トップレベル構造自体に変更はない。

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-swarm.ts` | swarm 収束・merge-back オーケストレーション | **#674 の対象**(`handleFinalize`) |
| `packages/framework/core/tools/amadeus-state.ts` | ステージ状態遷移(approve/reject/revise/advance) | **#675 の対象**(`handleApprove`/`handleReject`) |
| `packages/framework/core/tools/amadeus-bolt.ts` | Bolt ライフサイクル(start/complete/release-merge) | **#676 の対象**(`start --worktree`) |
| `packages/framework/core/tools/amadeus-lib.ts` | 共有ライブラリ(audit path、record dir、codekb repo 名解決) | **#676・#668 の対象**(`auditFilePath`、`codekbRepoName`) |
| `packages/framework/core/tools/amadeus-utility.ts` | `/amadeus` ユーティリティハンドラ群(`codekb-path` 等) | **#668 の対象**(`codekb-path` ハンドラ) |
| `packages/setup/src/ports/http.ts` | GitHub API/アーカイブ取得の HTTP ポート | **#677 の対象**(`getJson`) |
| `packages/setup/src/internal/tar-archive-extractor.ts` | tar.gz ストリーミング展開 | **#678 の対象**(`extractTarGz`) |

## `amadeus-swarm.ts` の finalize 内部構成(#674 の対象)

`handleFinalize()`(`amadeus-swarm.ts:484-631`)は3段構成。

1. **再検証フェーズ**(L531-582): claimed unit を `verdictFor()` で再検証し、`results[]` に最終ステータス(`converged`/`failed`)を確定する。ここで `genuine[]`(merge 対象の unit 名リスト)も確定する。
2. **merge-back フェーズ**(L588-599): `genuine` を昇順ソートし、unit ごとに `amadeus-bolt.ts release-merge` → `complete --merge` を直列実行する。失敗は `mergeFailures[]` に積むのみで、`results[]` は再訪しない。
3. **audit emission フェーズ**(L603-614): `results[]` を単純に走査し、`status === "converged"` なら `emitUnitConverged`、それ以外は `emitUnitFailed` + `emitBoltFailed` を出す。merge-back フェーズの結果はこの走査に反映されない。

`envelope`(L620-626)の `merge_failures` フィールドと `exit code 2`(L630)だけが merge 失敗を外部に伝える経路であり、audit trail(`emitUnitConverged`/`emitUnitFailed`)と `results[]` そのものは merge 失敗を知らない。

## `amadeus-state.ts` の gate ハンドラ構成(#675 の対象)

| ハンドラ | 行 | human-presence guard |
| --- | --- | --- |
| `handleApprove` | L1286-1379 | あり(L1321-1337: `isAutonomousMode` → `humanPresenceGuardDisabled` → `humanActedSinceGate`) |
| `handleReject` | L1430-1487 | **なし** |
| `handleRevise` | L1490- | (未確認、本スキャン対象外) |

`handleApprove` と `handleReject` はどちらも `withAuditLock(pd, () => { ... })` で state file の read-modify-write を保護し、`validateSlugInState` で遷移前状態を検証する構造は共通している。ガードの有無だけが非対称。

## `amadeus-bolt.ts` start と `amadeus-lib.ts` の audit path 解決(#676 の対象)

`start`(`amadeus-bolt.ts:196-220`)の `--worktree` パスは次の順で処理する。

1. state ファイルの shape 検証(L199-205、`readStateFile` が例外を投げたら `failJson`)
2. `emitAudit(pd, "BOLT_STARTED", fields, flags.intent, flags.space)`(L220)

`emitAudit` は内部で `auditFilePath(projectDir, intent, space)`(`amadeus-lib.ts:1267-1270`)を呼び、これが `recordDir(projectDir, intent, space)` の解決結果に応じて書き込み先を決める。`recordDir` が `null` を返すケース(L1269 の分岐)では `spaceRecordRoot(projectDir, space)/audit/<shard>` という bare な場所に書き込まれる。この関数自体は `stateFilePath`(L1255-1259)と同じ fallback パターンを共有しており、両者とも「intent が解決できないとき、intent 固有 record dir の外側に書く」という設計になっている。

## `packages/setup/src/ports/http.ts` の Result 境界(#677 の対象)

`Http` 型(L9-12)は `getJson`/`downloadArchive` の両方を `Promise<Result<..., FetchError>>` として宣言している。`fetchChecked()`(L46-59)は自身の try/catch でネットワークエラー・非 2xx ステータスを `FetchError` に正しく分類する。しかし `getJson()`(L23-28)自身は関数全体を try/catch していない。`downloadArchive()`(L30-38)も同様に `fetchChecked` の外で `response.body` の null チェックのみを行っており、`.json()` のような例外を投げる可能性のある処理は含まれないため `downloadArchive` 側にはこの欠陥はない。欠陥は `getJson` の `.json()` 呼び出し(L27)一箇所に限定される。

## `tar-archive-extractor.ts` の状態機械構成(#678 の対象)

`extractTarGz()`(L33-148)は次の変数をクロージャで共有する状態機械。

| 変数 | 役割 | スコープ |
| --- | --- | --- |
| `carry` | 直前チャンクからの持ち越しバイト列 | `for await` ループの外側で宣言(L36)、chunk ごとに `Buffer.concat` で拡張(L43) |
| `pendingLongName` | PAX(`x`)/GNU(`L`)ヘッダから読んだ次エントリの長いファイル名 | 同上(L37)、`drain()` 内で set/consume |
| `current` | 書き込み中のファイルエントリ(`path`/`remaining`/`chunks`) | 同上(L38) |

`drain(final)`(L54-148)は `carry.length < BLOCK_SIZE` などデータ不足時に `null` を返して次チャンク待ちに戻る設計(L64-65, L82-85, L98-100, L109-112)であり、これ自体は chunk 境界を跨ぐ設計として妥当に見える。#678 として持ち越すべき論点は、この状態機械が実際の `git archive`/codeload 出力(長いパス名を持つファイルが PAX/GNU ヘッダと本体ヘッダの間でチャンク分割される具体的な入力)に対して実測でも正しく動くかどうかであり、静的スキャンだけでは確定できない。

## 差分リフレッシュで反映した構造(integrity-batch、`a1c79dc12..162553b99`)

前回スキャン以降の構造変化と、当該 intent(260709-integrity-batch)の4バグ(#705/#706/#707/#708)の焦点ファイルを追記する。

### codekb ストア構造(#707 の対象)

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `.claude/tools/amadeus-lib.ts` `codekbRepoName`(L556-565)/ `codekbDir`(L530-533)/ `originRepoSlug`(L571-580) | codekb ディレクトリ名を origin remote 由来で解決(#693 で統一) | #707 の前提。`codekb/claude-leader/`・`codekb/claude-engineer-1/` は削除され `codekb/amadeus/` 単一化 |
| `.claude/amadeus-common/stages/inception/reverse-engineering.md`(L5 condition / L36 outputs / L110 timestamp) | RE ステージ定義。常時リフレッシュ・9固定ファイル・**単一** timestamp marker | **#707 の直接対象**(単一 timestamp で並行 base/observed を表現できない) |

### テストハーネス構造(#705 の対象)

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `tests/run-tests.ts`(L31 `Level`、L577-587 `levelFiles`、L485-489 `shouldSkipForClaude`) | tier discovery(smoke/unit/integration/e2e 各ディレクトリ直下のみ)と substrate skip | #705 の構造的根拠(`tests/harness/` はどの Level にも属さず discovery/skip の外) |
| `tests/harness/sdk-drive.calibration.test.ts`(L55-72) | doctor 既知回答文字列のピン留め | **#705 の直接対象**(L72 `DOCTOR_DOCS_LABEL` が現行 doctor 出力とドリフト、かつランナー管理外) |
| `.claude/tools/amadeus-utility.ts`(L628 doctor workspace チェック) | doctor が出力する現行ワークスペース文言(`workspace shell ready ...`) | #705 の期待値ドリフトの対向(旧 `amadeus-docs/ directory exists` は不在) |

### knowledge 配布構造(#706 の対象)

| パス | 役割 | 対象 intent との関係 |
| --- | --- | --- |
| `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md`(L3) | delivery-agent の実行計画ガイド | **#706 の直接対象**(不在の `product-guide.md` を tree 外参照。core→dist→self-install の全複製に伝播済み) |
| `packages/framework/core/agents/amadeus-delivery-agent.md`(L71-77) | delivery-agent の knowledge ロードパス宣言 | #706 の根拠(自分の dir と `amadeus-shared/` のみ読み、product-agent dir は読まない) |
| `packages/framework/core/hooks/amadeus-mint-presence.ts`(L12-13, L23-31) | UserPromptSubmit で `HUMAN_TURN` を無条件 mint(stdin 未読) | **#708 の直接対象**(mint 側)。参照様式は `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` |

## 次工程へ持ち越す設計候補

1. #674: merge-back 失敗を検知した時点で `results[]` の該当 unit を `"failed"` に書き換え、`emitUnitFailed`/`emitBoltFailed` を出すよう finalize のフェーズ順序を見直す。
2. #675: `handleReject` に `handleApprove` と同じ human-presence guard(または reject に適した緩和版)を追加する。reject を human-presence の対象外にする意図的な設計なのか欠陥なのかを requirements-analysis で確定する。
3. #676: `--worktree` の `start` が audit を発行する前に、intent/space が `recordDir` で解決可能であることを検証し、解決不能なら明示的に失敗させる(bare fallback に静かに落とさない)分岐を追加する。
4. #677: `getJson()` の `.json()` 呼び出しを try/catch で包み、パース失敗を `FetchError` に分類して `Result.err` を返すようにする。
5. #678: 実際に PAX/GNU ヘッダがチャンク境界を跨ぐ tar.gz を用意した回帰テストを作成し、現状の実装が正しいことを実証するか、実際に破綻する入力を特定する。
6. #668: `codekbRepoName()` の fallback を `basename(projectDir)` から、worktree を認識した実リポジトリ名の解決(例: `git rev-parse --show-toplevel` の親、または `.git` の `commondir` を辿る)に変更する。

## Coverage CI 経路(260710-codecov-project-gate の対象)

> 出典: `.github/workflows/ci.yml`・`codecov.yml`・`tests/run-tests.ts`・`tests/gen-coverage-registry.ts`・`tests/.coverage-ratchet.json`(2026-07-10, HEAD 98089faf 実測)。codecov-project-gate intent(履歴)はこの経路へ「Codecov 非依存の自前 project ゲート」を追加した。

### CI ジョブ DAG(`.github/workflows/ci.yml`)

| ジョブ | 行 | 役割 | カバレッジ関与 |
| --- | --- | --- | --- |
| `check` | :20-58 | typecheck・lint・dist:check・promote:self:check・`test:ci` | なし |
| `coverage` | :60-103 | `needs: [check]`。`bun run coverage:ci`(:82)で lcov 生成、`coverage/lcov.info` と `coverage/html` を artifact 化(:84-93)し Codecov へ OIDC 送信(:95-103、`fail_ci_if_error: true`) | **codecov-project-gate の入力元** |
| `codecov-status` | :105-200 | `needs: [coverage]`, `if: always()`。`github-script`(:117)で外部 status を polling: `requiredChecks` 組立(:132-138、#717 が触る箇所)、`waitForCheck()` 最大60回×10秒(:144-178)、check-run/combined-status 両経路探索(:180-200) | Codecov status 待ち。**自前ゲートは polling 不要** |
| `ci-success` | :202-225 | `needs: [check, coverage, codecov-status]`, `if: always()`。`require_result()`(:213-220)が各 `needs.<job>.result` を `success` と厳格比較、集約対象は3ジョブ(:222-224) | 集約ゲート |

### 総カバレッジ% 算出箇所(`tests/run-tests.ts`)

- per-file LCOV 生成: `bun test --coverage --coverage-reporter=lcov` を個別実行し `coverage/.parts/<safe-name>/` へ出力(:753-776)。
- 結合 → 正規化 → 書き出し: `combineCoverageReports()`(:641-660)→ `normalizeCoverageReport()`(:503-563)→ `coverage/lcov.info`。正規化は harness 生成パス(`.claude/`・`.codex/`・`dist/*/.{claude,codex,kiro}/`)を `packages/framework/core/` へ再マップ(:488-501)。
- 正規化後レコード: `SF` / `FNF` / `FNH` / `DA:<line>,<count>` / `LF`(=DA 行数, :557)/ `LH`(=count>0 の DA 行数, :558)/ `end_of_record`(:546-561)。
- **総% は既に算出済み**: `writeCoverageHtml()`(:597-599, :627)が `totalHits/totalLines` から `Total line coverage: {pct}% ({totalHits}/{totalLines})` を HTML へ出力。ただし機械可読(stdout/JSON)な emit 経路は現状なし(:627 が唯一)。

### ラチェット機構(`tests/gen-coverage-registry.ts` + `tests/.coverage-ratchet.json`)

- ベースライン: `tests/.coverage-ratchet.json`(クラス別 covered ユニット**件数**、%ではない)。path は `AMADEUS_COVERAGE_RATCHET` env で上書き可(:104-105)。
- 単調 fail-closed 判定: `runCheck()`(:1242-1266)が各クラスで `now < base` を検知して `ok=false`(増やせるが黙って減らせない)。
- 更新: `writeAll()`(:1275-1278)が `--check` なし実行で registry+ratchet を再生成。人間がレビュー付きコミットで更新(:1259-1262 が手順案内)。
- `--check` 実行契約: drift・空クラス・cross-check・ratchet を検査し失敗時 `process.exit(1)`(:1283-1290)。CI 直接ステップは無く、`tests/unit/gen-coverage-registry.test.ts` が `spawnSync`(:152, :267, :279)で **temp tree** に対し落ちる実証を行う。
- **自前 project ゲートのベースライン運用テンプレート**: リポ内コミット済みファイル + 単調 fail-closed + env 差し替えでの落ちる実証、という同型が既に確立。

### 自前 project ゲートの出荷後状態(intent 260710-bughunt-fix-batch スキャン、HEAD `b845478bb` 実測)

> 上記「Coverage CI 経路」節が予告した「Codecov 非依存の自前 project ゲート」は base `fc5a34cf1`→observed `b845478bb` の区間で **出荷済み**(PR #762 = #734、`9738580ef`)。本 bugfix intent のフォーカス面(#771/#773/#775/#776/#779)には直接関与しないが、CI アーキテクチャの構造変化として記録する。

- 新規(A): `tests/coverage-project-gate.ts`(236行、lcov 総計を main ベースライン比で fail-closed 判定するゲート本体)、`tests/lib/coverage-source-path.ts`(66行、カバレッジ source パス正規化ヘルパー)、`tests/.coverage-project-baseline.json`(5行、main ベースライン%)、`tests/unit/coverage-project-gate.test.ts`(ゲートの落ちる実証)。
- 関連(M): `.github/workflows/ci.yml`(#762 でゲート配線 + #778=#777 で main push を `cancel-in-progress` 対象外化し Coverage Report 打ち切り/Codecov base 欠落を解消)、`codecov.yml`。
- 位置づけ: ラチェット機構(件数ベース)と相補で、こちらは **lcov 総計%の main ベースライン比**を fail-closed で見る。両者とも「リポ内コミット済みベースライン + 単調 fail-closed + env 差し替えでの落ちる実証」テンプレートに従う。
