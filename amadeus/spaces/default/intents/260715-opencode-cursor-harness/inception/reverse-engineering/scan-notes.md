# Reverse Engineering Code Scan — opencode / Cursor harness 対応 (Issue #626)

intent: `260715-opencode-cursor-harness` / phase: inception / stage: reverse-engineering (2.1 Developer code scan)
担当: Developer code scan（Architect 合成の入力）。読み取り専用スキャン。全主張は現 HEAD 実コード直読 + file:line 根拠。

---

## 1. 手法（diff-refresh, cid:reverse-engineering:c1）

| 項目 | 実測値 |
|---|---|
| base | `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`（main 上の直近 re-scan observed） |
| 祖先性 | `git merge-base --is-ancestor cf3dc88 HEAD` → **真**（exit 0）。base は HEAD の祖先で採用可 |
| observed (HEAD) | `6a23b0ec2498915532ab40930f82cc7744aa15b7` |
| 距離 | `git rev-list --count cf3dc88..HEAD` = **65 コミット** |
| origin/main | `a8fb50930fb2ef6c0ce03130e64d8b56df486a8f` |
| source 面の等価性 | `git diff --stat origin/main HEAD -- ':!amadeus/'` = **空**。HEAD と origin/main の差は record コミット（`amadeus/` 配下）のみで source 面は完全一致 |

区間 `cf3dc88..b67b329f9` は並行 intent 260709（PR #1011、未着地）の scan 観測済み区間だが、その「packaging 面の構造不変」結論を鵜呑みにせず、下記フォーカス面のファイルを自分で直読して判定した（フォーカス面8参照）。

---

## 2. 区間差分の要約（cf3dc88..HEAD, フォーカス面のみ）

`git diff --name-only cf3dc88..HEAD -- scripts/ packages/framework/ tests/` の結果のうち、本 intent のフォーカス面に該当するファイルの変化:

- **packaging seam の中核は UNCHANGED**: `scripts/package.ts`・`scripts/manifest-types.ts`・`packages/framework/core/tools/amadeus-runner-gen.ts`・`packages/setup/src/domain/harness.ts` はいずれも区間内で無変更（`git diff --quiet` で確認）。ハーネス投影の契約は base 時点と同一。
- **CHANGED（隣接関心のみ、ハーネス集合には非影響）**:
  - `scripts/promote-self.ts`（+30/-7）: contributor skills projection（`CONTRIBUTOR_SKILL_DESTINATIONS`、`claudeOnboarding` の source 検証）追加。**managedDirs のハーネス集合(claude+codex)は不変**。
  - `packages/framework/core/tools/amadeus-utility.ts`: `handleDoctor` を `export` 化（in-process seam）。doctor/version のハーネス依存ロジックは不変。
  - `packages/framework/core/tools/amadeus-lib.ts`: tool パスの検査リストに `.codex/.kiro` の tool 追加（`amadeus-utility.ts`/`amadeus-migrate.ts`/`amadeus-orchestrate.ts` の3 tool 分）。`harnessDir()`/`rulesSubdir()` の解決 seam は不変。
  - `harness/{claude,codex,kiro,kiro-ide}/skills/amadeus/SKILL.md`、`kiro`/`kiro-ide` の adapter は区間で更新されたが manifest 契約は不変。

**結論**: 区間 65 コミットは packaging seam のハーネス開放性（discover ベース）を一切変えていない。本 intent は base 時点の設計を現 HEAD でそのまま踏襲してよい。

---

## 3. フォーカス面1: packaging seam（scripts/package.ts, scripts/manifest-types.ts）

### 3.1 discoverHarnessNames（自動発見 — ハードコードなし）
- `scripts/package.ts:68-73` `discoverHarnessNames()`: `packages/framework/harness/` を `readdirSync` し `manifest.ts` を持つディレクトリのみを返す（sort 済み）。**ハーネス集合はハードコードされていない** — 「harness/<n>/ ディレクトリ + manifest 行（+任意の emit.ts）を足すだけで、このファイルへの編集ゼロ」（:63-67 コメント）。
- `scripts/package.ts:764` 既定ターゲット = `discoverHarnessNames()`、:769 で manifest 実在フィルタ。→ **`harness/opencode/manifest.ts` と `harness/cursor/manifest.ts` を置けば package.ts は無編集で両者をビルド対象にする。**

### 3.2 buildTree のパイプライン（:313-494）
1. `:335-357` coreDirs 写像: `core/<src>` → `<treeRoot>/<finalDst>`、`.md` に `{{HARNESS_DIR}}` トークン置換（`transform` :98-110）+ rulesRename 適用。frontmatterAdditions を投影時に付与（:347-354、未ヒットは :358-364 で loud エラー）。
2. `:369-376` harnessFiles コピー（projectRoot は dist ルートへ）。
3. `:383-389` onboarding: 共有スケルトン `core/templates/onboarding.md` を `renderOnboarding(fills)` でレンダー→同じ transform。
4. `:395-408` emitMemory（workspace ルート `amadeus/spaces/default/memory/`）+ emitActiveSpace + emitMemorySeed（engine-only self-heal 用 `<harnessDir>/tools/data/memory-seed/`）。
5. `:418` seedCompiledData → `:428` `amadeus-graph.ts compile`（harness-correct な stage-graph.json/scope-grid.json 生成）→ `:429` rulesRename バックストップ。
6. `:438` writeHarnessData（`tools/data/harness.json` = `{harnessDir, rulesSubdir}`、runtime の開放集合ソース）、`:444` writeVersionFile（`<harnessDir>/VERSION`）。
7. `:451-454` runner-gen（`skipRunnerGen` でスキップ可）。
8. `:459-479` emit プラグイン（codex のみ）。

### 3.3 トークン置換（唯一の変換クラス T5）
- `:80-82` `substituteToken`: `{{HARNESS_DIR}}` → harnessDir。`:89-92` `applyRulesRename`: post-substitution な `<harnessDir>/rules/` → `<harnessDir>/<rulesRename>/`（rulesRename が null なら no-op）。`.md`/`.md.example` のみ対象（:94-96）、`.json`/`.ts` は verbatim。

### 3.4 COMPILED_DATA / --check ドリフトガード
- `:157` `COMPILED_DATA = ["tools/data/stage-graph.json","tools/data/scope-grid.json"]`。`:289-299` seedCompiledData: 初回ビルドは committed claude tree の JSON を seed に fallback（`:290,:293`）→ **新ハーネスの初回ビルドは claude の JSON を種にできる**。
- `:643-732` `checkHarness`: temp にビルド → committed dist と byte 比較。MISSING/DIFFERS/ORPHAN/UNREFERENCED を検出。`:719-726` は harness source 側の未参照スキャン（#735）。
- `:570-585` `expectedOutsideHarness`: write の post-sweep と check の orphan scan が共有する「harness dir 外の正当な出力集合」の単一ソース。

### 3.5 HarnessManifest 型の全フィールド（scripts/manifest-types.ts:79-122）
| フィールド | 行 | 意味論 |
|---|---|---|
| `name` | :81 | dist/<name>/ と harness/<name>/ に一致するハーネス名 |
| `harnessDir` | :83 | トークン置換先（".claude"/".kiro"/".codex"）。新規は ".opencode"/".cursor" 等 |
| `coreDirs: DirMap[]` | :85 | `core/<src>` → `<harnessDir>/<dst>` 投影。DirMap=`{src,dst}`(:12) |
| `harnessFiles: FileMap[]` | :87 | authored コピー。FileMap=`{src,dst,projectRoot?}`(:20)、projectRoot で dist ルートへ |
| `frontmatterAdditions?` | :101 | 投影 .md への YAML frontmatter 行追記（harness-native フィールドの seam、typo/衝突を loud エラー） |
| `onboarding?: OnboardingSpec\|null` | :106 | onboarding doc 生成方式。OnboardingSpec=`{dst,projectRoot?,fills}`(:70-77)。codex は null(emit で生成) |
| `rulesRename: string\|null` | :108 | rules/ dir のリネーム（kiro="steering", codex="amadeus-rules", claude=null） |
| `authoredExempt: RegExp[]` | :110 | 生成 dir 内に置く authored ファイルを orphan scan から除外 |
| `skipRunnerGen?` | :119 | 標準 runner-gen をスキップ（codex のみ true — skills は emit で .agents/skills/ へ） |
| `emit: (ctx)=>EmitResult \| null` | :121 | per-shell emission プラグイン（codex のみ）。EmitContext=:27-51, EmitResult=:54-59 |

**結論(面1)**: packaging seam は完全に open-set。新ハーネスは manifest 行 1 本（+ 必要なら emit.ts）で package.ts/manifest-types.ts 無編集でビルドされる。

---

## 4. フォーカス面2: 既存4 harness の manifest+emit パターン対比

| 観点 | claude | codex | kiro | kiro-ide |
|---|---|---|---|---|
| manifest 行数 | 85 | 66 | 87 | 103 |
| harnessDir | .claude | .codex | .kiro | .kiro |
| rulesRename | null | "amadeus-rules" | "steering" | "steering" |
| coreDirs に session skills | 4つ在(:40-43) | **無**(emit へ) | 4つ在(:37-40) | 4つ在(:33-36) |
| orchestrator skill | harnessFile(:49) | emit(.agents/skills) | harnessFile(:47) | harnessFile(:42) |
| agent 定義形式 | core .md のみ | core .md + emit .toml | core .md + authored .json(:50-55) | core .md + .json(:45-50) |
| onboarding | CLAUDE.md.example, in-tree(:69) | null（emit が AGENTS.md 生成） | AGENTS.md, projectRoot(:73) | AGENTS.md, projectRoot(:94) |
| adapter shim | 無 | hooks/amadeus-codex-adapter.ts(:42) | hooks/amadeus-kiro-adapter.ts(:56) | +vocab.ts(:52)+10 .kiro.hook(:53-61) |
| skipRunnerGen | false | **true**(:61) | false | false |
| emit | null(:82) | emit(:63) | null(:84) | null(:100) |
| frontmatterAdditions | 無 | 無 | 無 | **有**(:86-92, 5 agent へ tools grant) |
| authoredExempt | []空(:77) | codex-adapter(:58) | agent .json + kiro-adapter(:81) | +.kiro.hook(:98) |
| 設定ファイル example | settings.json.example(:57), settings.local(:58) | emit(config.toml/hooks.json) | settings/cli.json(:57) | settings/cli.json(:62) |
| project-root .gitignore | dot-gitignore(:63) | dot-gitignore(:50) | dot-gitignore(:65) | dot-gitignore(:72) |

### codex/emit.ts（368行）が担う「宣言行で表せない構造的発散」
codex/manifest.ts:11-16 と emit.ts の役割: config.toml.example / hooks.json.example / trust-seed / AGENTS.md（Codex 固有ヘッダ merge） / 11 agent TOML / `.agents/skills/` ツリー全体（orchestrator + stage/scope runner + session skills を runner-gen の render fn を自前合成して生成）。emit は `EmitContext.readHarnessSource`(manifest-types.ts:42) 経由で harness source を読む（#735 未参照スキャンに計上させるため）。

**新ハーネス追加時に書くべき最小ファイル集合の型（対比から導出）**:
- Claude 型（最も薄い）: manifest.ts + onboarding.fills.ts + skills/amadeus/{SKILL.md,question-rendering.md,issue-ref-contract.md} + rules-amadeus.md(@-stub) + settings example + dot-gitignore。rulesRename=null、emit=null。
- Kiro 型: 上記 + agent .json 群 + adapter.ts + settings/cli.json、rulesRename あり、onboarding=AGENTS.md(projectRoot)。
- Codex 型（最も重い）: manifest.ts + emit.ts（構造発散を全て内包）+ adapter shim。skipRunnerGen=true。

**結論(面2)**: opencode/Cursor が「.claude 的な skills/agents ディレクトリ規約」なら Claude/Kiro 型の薄い manifest で足り、「skills 探索パスが特殊」なら Codex 型の emit.ts が要る。判定は各ハーネスの skills/agents 探索規約次第（Architect 合成で確定すべき設計問い）。

---

## 5. フォーカス面3: promote:self（scripts/promote-self.ts）

- `:37-41` `managedDirs` は **ハードコードで claude(.claude) + codex(.codex/.agents) のみ**。kiro/kiro-ide すら対象外。
- `:313-319` `promoteSelfMain` の build 呼び出しも `package.ts claude` と `package.ts codex` を**明示ハードコード**（--check 版も同様）。
- promote:self は「project-local dogfood install（amadeus が自分自身を開発するため）」（:2-8 冒頭コメント）であり、配布ビルド(dist)ではない。
- **結論(面3)**: promote:self は新ハーネス追加に**自動対応しない**。ただし opencode/Cursor で amadeus 自身を開発する必要がなければ promote:self の編集は不要（dist ビルドは package.ts が discover で対応するため配布は成立する）。self-install を新ハーネスにも広げる場合のみ managedDirs + build 呼び出しの2箇所編集が要る。**この判定は本 intent のスコープ判断事項**。

---

## 6. フォーカス面4: --version / --doctor の harness 依存性（amadeus-utility.ts）

- `:243-245` `handleVersion`: `amadeus ${AMADEUS_VERSION}` を出力するのみ。**harness 非依存**。新ハーネスの dist から bun 直叩きで動く。
- `:676` `handleDoctor(projectDir)`: harness 依存あり。`:695` `harnessDir()` で分岐、`:696` `if (harness === ".claude")` 専用ブロック（settings.json からフック roster を導出、:714-)。`.claude` 以外は別経路。
- `:857` `otherTrees = [".claude",".kiro",".codex"].filter(...)` — **閉じた列挙**（クロスツリー検知の advisory）。新ハーネスの engine dir はこの列挙に無いと「他ツリー存在」警告に出ない（advisory なのでブロックはしない）。
- `:2000-2006` `SCAN_EXCLUDE`（`.claude/.kiro/.codex/...`）— スキャン除外の閉じた集合。
- `:905-907` `classifyWorkspaceShellState`: `harnessDir()` を使い汎用。
- **結論(面4)**: version は完全 harness 非依存。doctor は `.claude` 専用の詳細ブロックを持つが、`harnessDir()` 汎用経路もあり新ハーネスは「advisory 警告に列挙されない」程度の劣化で動作する。厳密な doctor 対応には otherTrees/SCAN_EXCLUDE への追記が要る（正しさには非影響、advisory 品質のみ）。

---

## 7. フォーカス面5: runner-gen（amadeus-runner-gen.ts, 615行）

- `:60` `harnessDir()` を import し生成 prose に埋め込む（:143,:213,:262 等）。出力先 skills dir は `:63` で「このモジュールの位置(tools/ → ../skills/)」から解決 = `<harnessDir>/skills/`。
- `skipRunnerGen`（manifest-types.ts:119）の意味: true にすると package.ts:451-454 の `write`/`scopes` をスキップ。codex が唯一 true で、skills は emit が `.agents/skills/` へ生成する。
- 生成物: stage-runner `skills/amadeus-<stage>/SKILL.md`(:3)、scope-runner `skills/amadeus-<scope>/SKILL.md`(:13)、MISSING/ORPHAN 検知(:378-383)。
- **結論(面5)**: 新ハーネスが `<harnessDir>/skills/` に skills を置く規約なら skipRunnerGen=false（省略）で自動生成される。`.agents/skills/` 等の特殊探索なら Codex のように skipRunnerGen=true + emit.ts で自前生成。

---

## 8. フォーカス面6: 検証・drift ガードの宇宙 + ハーネス名の閉じた列挙

### 8.1 自動的に検査対象になるもの
- `dist:check`（package.ts --check）: `discoverHarnessNames()` ベースなので **新 dist ツリー(dist/opencode/, dist/cursor/)は manifest を置けば自動で --check 対象**。追記不要。
- `tests/gen-coverage-registry.ts` / `EXPECTED_NONE_TO_CLI`: coverage registry 再生成対象。統合時に再生成が要る（cid:code-generation:integration-registry-regen）— ただしこれはハーネス集合ではなく新規テストファイル追加に伴うもの。

### 8.2 手動追記が要る「ハーネス名を閉じた列挙で持つファイル」（新ハーネス追加時に編集必須）
**installer(packages/setup) — 必須（未対応だと install --harness opencode が弾かれる）:**
1. `packages/setup/src/domain/harness.ts:9` `HarnessName` union type = `"claude"|"codex"|"kiro"|"kiro-ide"`
2. `packages/setup/src/domain/harness.ts:19-24` `HarnessName.all` frozen array
3. `packages/setup/src/domain/engine-layout.ts:8-12` `ENGINE_DIR_BY_HARNESS` map
4. `packages/setup/src/modules/reporter.ts:24-25,137` usage 文字列 + invalid エラー文言
5. `tests/unit/setup-harness.test.ts:13` `toEqual(["claude","codex","kiro","kiro-ide"])` — **契約テスト、要更新**
5b. `tests/unit/setup-harness-parse.test.ts:17` `HarnessName.parse` 受理集合の契約テスト — **要更新**(追補 2026-07-16: requirements-analysis reviewer が独立再列挙で検出。:167 の「fixture .claude 固定」一般化の除外根拠に当てはまらない)

**framework runtime（open-set が主だが test-seam/fallback の閉じたマップあり）:**
6. `packages/framework/core/tools/amadeus-lib.ts:114` `KNOWN_HARNESS_DIRS`、:170-172 `KNOWN_RULES_SUBDIR` — 実 install は `harness.json`(harnessDir/rulesSubdir) で解決するので**これらは AMADEUS_HARNESS_DIR test-seam と fallback 専用**（:109-114,:162-168 コメント明記）。新ハーネスの test-seam を使うなら追記。
7. `packages/framework/core/tools/amadeus-utility.ts:857`（otherTrees）、:2000-2006（SCAN_EXCLUDE）、:696（doctor .claude 分岐）

**migration(amadeus-migrate.ts) — aidlc→amadeus 移行の閉じた列挙（新ハーネス移行を扱うなら）:**
8. `packages/framework/core/tools/amadeus-migrate.ts:71` `INSTALLED_HARNESS_DIRS=[".claude",".codex",".kiro"]`、:383、:843、:1459、:2514

**self-install:**
9. `scripts/promote-self.ts:37-41` managedDirs、:313-319 build 呼び出し（面3、dogfood 対象にする場合のみ）

### 8.3 ハーネス名を閉じた列挙で持つファイル数
本 intent のフォーカス面で**編集が要りうる**閉じ列挙保持ファイル = **10ファイル**(追補後)（上記1〜9のファイル単位: harness.ts, engine-layout.ts, reporter.ts, setup-harness.test.ts, amadeus-lib.ts, amadeus-utility.ts, amadeus-migrate.ts, promote-self.ts の8ソース + 契約テスト setup-harness.test.ts）。うち **installer 6ファイル(harness.ts / engine-layout.ts / reporter.ts / setup-harness.test.ts / setup-harness-parse.test.ts + install 受理面)は正しさに必須**、framework runtime 2 + migrate 1 は advisory/test-seam/移行、self-install 1 は dogfood 判断。

（補足: `grep -rln` で harness 名を含む .ts は tests/ に多数あるが、大半は fixture が `.claude` 固定で新ハーネス追加に非依存。上記は「ハーネス集合そのものを閉じた列挙として持つ」ファイルに絞った。）

---

## 9. フォーカス面7: docs 面（更新すべき文書）

- `README.md:7`「today Claude Code, Kiro IDE, Kiro CLI, and Codex CLI」— 対応ハーネス列挙。:13-16 バッジ4枚。:48-57「Pick your harness」表（各行 dist パス + install コマンド + ガイドリンク）。
- `docs/guide/harnesses/` に per-harness ガイド: `codex-cli.md(.ja)`, `kiro-cli.md(.ja)`, `kiro-ide.md(.ja)`, `README.md(.ja)`。**新ハーネスは `opencode.md(.ja)` / `cursor.md(.ja)` を追加**。
- `docs/guide/12-cli-commands.md`, `docs/guide/17-skills.md`, `docs/guide/13-customization.md(.ja)`, `docs/amadeus-files.md(.ja)`, `docs/README.md(.ja)`, `docs/guide/glossary.md` 等にハーネス言及あり（要棚卸し）。
- 言語規約: `docs/` は英語既定 + `.ja.md` 対訳（cid:docs-language-ownership, cid:docs-language-ownership の同期確認）。README は英日両方。
- **結論(面7)**: README(対応表+バッジ4→6) + harnesses/ ガイド新規2本×2言語 + 各 guide のハーネス言及棚卸し。

---

## 10. フォーカス面8: 区間差分（フォーカス面1〜7のファイルが cf3dc88..HEAD で変わったか）

| フォーカス面ファイル | 区間変化 | 変更要旨 |
|---|---|---|
| scripts/package.ts | UNCHANGED | — |
| scripts/manifest-types.ts | UNCHANGED | — |
| packages/framework/core/tools/amadeus-runner-gen.ts | UNCHANGED | — |
| packages/setup/src/domain/harness.ts | UNCHANGED | 閉じ列挙は base 時点のまま |
| scripts/promote-self.ts | CHANGED(+30/-7) | contributor skills projection 追加。**managedDirs のハーネス集合は不変** |
| amadeus-utility.ts | CHANGED | `handleDoctor` を export 化（in-process seam）。ハーネス依存ロジック不変 |
| amadeus-lib.ts | CHANGED | tool パス検査リストに .codex/.kiro tool 追記。harnessDir/rulesSubdir 解決 seam 不変 |
| README.md / docs/ | 区間で軽微更新あり得るが対応ハーネス列挙(4)は不変 |

**結論(面8)**: 区間 65 コミットは本 intent のフォーカス面のハーネス開放性契約を一切変えていない。並行 intent 260709 の「packaging 面の構造不変」結論は本スキャンで独立に裏付けられた。

---

## 11. 各フォーカス面 1行結論

1. **packaging seam**: 完全 open-set。manifest.ts 1本(+任意 emit.ts)で package.ts 無編集ビルド。
2. **既存4 harness 対比**: Claude/Kiro 型(薄 manifest) vs Codex 型(emit.ts で構造発散内包)の2系統。新ハーネスは skills/agents 探索規約で系統が決まる。
3. **promote:self**: 新ハーネス非自動対応（managedDirs/build ハードコード）。dogfood 不要なら編集不要。
4. **--version/--doctor**: version は harness 非依存。doctor は `.claude` 専用ブロック + 汎用経路、新ハーネスは advisory 劣化のみで動作。
5. **runner-gen**: `<harnessDir>/skills/` 規約なら自動生成、特殊探索なら skipRunnerGen=true + emit。
6. **検証・drift**: dist:check は自動対応。閉じ列挙は installer 5 + runtime/migrate 3 + self-install 1 = 9ファイル。
7. **docs**: README(対応表+バッジ) + harnesses/ ガイド×2言語新規 + guide 棚卸し。
8. **区間差分**: フォーカス面のハーネス契約は区間で不変。

---

## 12. 新ハーネス追加の最小ファイル集合（導出）

### 12.1 配布(dist)を成立させる最小集合（package.ts が自動ビルド）
ハーネスごとに `packages/framework/harness/<name>/` に:
- **必須**: `manifest.ts`（HarnessManifest 1行）
- Claude/Kiro 型なら加えて: `onboarding.fills.ts`、`skills/amadeus/{SKILL.md, question-rendering.md, issue-ref-contract.md}`、rules @-stub（`rules-amadeus.md` 相当）、設定 example、`dot-gitignore`、（Kiro 型は）agent .json 群 + adapter.ts + settings/cli.json
- Codex 型なら加えて: `emit.ts`（config/hooks/AGENTS.md/agent TOML/.agents/skills 生成）+ adapter shim

→ この集合だけで `bun scripts/package.ts` が dist/<name>/ を生成し、`--check` ドリフトガードも自動で効く。

### 12.2 installer(amadeus-setup)で選択可能にする必須編集（5ファイル）
1. `packages/setup/src/domain/harness.ts:9,19-24`（union + all）
2. `packages/setup/src/domain/engine-layout.ts:8-12`（engine dir map）
3. `packages/setup/src/modules/reporter.ts:24-25,137`（usage/error）
4. `tests/unit/setup-harness.test.ts:13`（契約テスト）
4b. `tests/unit/setup-harness-parse.test.ts:17`（parse 受理集合の契約テスト、追補 2026-07-16）

### 12.3 品質を揃えるための追加編集（正しさには非必須）
- doctor advisory: `amadeus-utility.ts:857`(otherTrees), `:2000-2006`(SCAN_EXCLUDE)
- test-seam: `amadeus-lib.ts:114,170-172`（AMADEUS_HARNESS_DIR test-seam を使う場合）
- migration: `amadeus-migrate.ts`（aidlc→amadeus 移行で新ハーネスを扱う場合）
- self-install: `scripts/promote-self.ts:37-41,313-319`（amadeus 自身を新ハーネスで開発する場合）
- docs: README + `docs/guide/harnesses/<name>.md(.ja)` + guide 棚卸し

### 12.4 Architect 合成で確定すべき設計問い
- opencode / Cursor の skills・agents・hooks の探索規約は `.claude` 型か `.agents/skills` 型(Codex)か → manifest 系統と emit.ts 要否を決める。
- rules dir のリネーム要否（rulesRename）。
- installer/self-install/migration のどこまでを本 intent のスコープに含めるか（配布のみか、install コマンド対応まで含めるか）。
