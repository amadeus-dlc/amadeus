# ビジネスロジックモデル — three-layer-build

対象 Intent: 260706-three-layer-build（Issue #572）

## 1. build.ts のステップ構成

### 1.1 入力

| 入力 | 場所 | 説明 |
|---|---|---|
| エンジン正準 | `core/tools/`、`core/amadeus-common/`、`core/sensors/`、`core/hooks/`、`core/scopes/`、`core/agents/`、`core/knowledge/` | 上流対応 7 dir + amadeus 拡張分（Q1=A）。手編集場所。 |
| skill 正準 | `core/skills/<42 dirs>` | `amadeus` 1 + `amadeus-*` 41（実測: skills/ 直下 42 dirs）。手編集場所。 |
| ハーネス差分層 | `harness/codex/`、`harness/claude/` | codex: openai.yaml 差分ソース（Phase 2 正準化）。claude: `.claude/*` symlink 配線宣言。手編集場所。 |
| モデルオーバーレイ | `dev-scripts/data/model-overrides.json` | 配布物には含まない開発用設定（FR-5 後段ステップ）。build.ts 内で参照。 |
| #543 接続点 | （設計のみ、実装は未 merge のため保留） | バージョン・ハッシュ manifest のフック。§1.6 参照。 |

### 1.2 ステップ順序

**優先規則（H4 修正）**: harness overlay（Step 3）は skill コピー（Step 2）の後に実行し、同一パスを後勝ちで上書きする。これにより `core/skills/<name>/agents/` に openai.yaml を置かない（重複正準禁止、BR-16）。

```
build.ts の実行ステップ（全ステップ冪等）:

Step 1: エンジンコピー
  core/agents/         → .agents/amadeus/agents/      (全置換)
  core/amadeus-common/ → .agents/amadeus/amadeus-common/
  core/sensors/        → .agents/amadeus/sensors/
  core/hooks/          → .agents/amadeus/hooks/
  core/scopes/         → .agents/amadeus/scopes/
  core/knowledge/      → .agents/amadeus/knowledge/
  core/tools/          → .agents/amadeus/tools/

Step 2: skill コピー（promote-skill.ts と同セマンティクス）
  core/skills/<name>/ → .agents/skills/<name>/
  コピー範囲: alwaysAllowedFiles, alwaysAllowedDirs, 参照条件付き conditionalDirs
  除外: disallowedNames（dev-scripts, evals, tmp 等、promote-skill.ts:10-23 の定義と同一）
  verify: disallowedPromotedPaths が空であること（promote-skill.ts:138-146 相当）
  ※ core/skills/<name>/agents/ に openai.yaml を置かない（BR-16）

Step 3: harness overlay（後勝ち）
  harness/codex/skills/<name>/agents/openai.yaml → .agents/skills/<name>/agents/openai.yaml（上書き）
  対象: 38 件（per-skill、各 skill の内容差を保持。単一ファイル化しない）
  Phase 2 で src が harness/codex/skills/<name>/agents/ へ git mv 済みを前提とする
  優先規則: harness overlay は Step 2 の skill コピー結果を同パスで上書きする（後勝ち）

Step 4: symlink 再現（harness/claude の配線規則から）
  harness/claude/wiring.json を読み、.claude/<name> → ../.agents/amadeus/<name> を再現
  対象 7 件（実測: scripts/amadeus-install.ts MANIFEST.claudeSymlinks = ENGINE_DIR_NAMES):
    agents, amadeus-common, hooks, knowledge, scopes, sensors, tools

Step 5: model overlay 後段（FR-5）
  dev-scripts/apply-model-overrides.ts と同等の処理を build.ts 後段で実行
  .agents/amadeus/agents/*.md の modelOverride 行を更新
  promote-skill.ts:195-203 の overlay 再適用フックの後継（promote-skill.ts 退役後は本ステップが担う）
  fail-soft（overlay エラーは stderr 警告のみ、exit code 非変更）

Step 6: #543 接続点（未実装）
  build.ts の Step 5 完了後にフック: バージョン・ハッシュ manifest 生成
  #543 merge 後に実装する。現時点では記録のみ（§1.6 参照）。
```

### 1.3 出力（生成物）

| 出力 | 場所 | 性質 | 手編集 |
|---|---|---|---|
| エンジン実行時コピー | `.agents/amadeus/` | 生成物（build.ts が上書き） | 禁止（CI が検出） |
| skill 昇格コピー | `.agents/skills/<42 dirs>` | 生成物（build.ts が上書き） | 禁止（CI が検出） |
| .claude symlinks | `.claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}` | 生成物（build.ts が再現） | 禁止（CI が検出） |
| .claude/skills | `.claude/skills/` | installer が管理（§1.5 参照） | build.ts 管理外 |

### 1.4 決定論規則（FR-2 CI diff = 0 の保証）

- エンジンコピーは `cpSync` 相当の全置換（同一入力なら同一出力）。
- skill コピーは promote-skill.ts の allowedEntries ロジック（SKILL.md 参照）を同一実装で再現し、入力ファイルの内容のみに依存する。
- symlink 再現は harness/claude/wiring.json の宣言に従い冪等に再現（既存 symlink は unlink + 再作成）。
- model overlay（Step 5）は apply-model-overrides.ts の冪等 apply を呼び出す（2 回実行で byte 同一、eval case (b) 実測済み: model-overlay eval check.ts）。
- 実行後に `git diff --exit-code .agents/amadeus/ .agents/skills/ .claude/agents .claude/amadeus-common .claude/hooks .claude/knowledge .claude/scopes .claude/sensors .claude/tools` が 0 であることを CI が検証する。

### 1.5 .claude/skills と installer の責務境界

**決定**: build.ts は `.agents/skills/` のみを生成する。`.claude/skills/` は installer（`scripts/amadeus-install.ts`）が引き続き管理する。

**根拠**:
- `.claude/skills/` はホスト（Claude ハーネス）向けの配置であり、インストール先ごとに異なる。
- `scripts/amadeus-install.ts` の `copySkills`（line 230-260）は `.claude/skills/` と `.agents/skills/` の両方をコピーする。コピー元は `.agents/skills/`（build.ts の生成物）であるため、build.ts が `.agents/skills/` を正しく生成すれば installer は正しく動作する。
- build.ts はリポジトリ内の生成物（`.agents/` 配下）のみを担当し、インストール操作（外部 workspace への配置）は installer に委ねる。これは Right-Sizing（汎用ビルドシステムではない）に従う。

**影響**: installer eval（`dev-scripts/evals/installer/check.ts`、test:it:installer）は変更不要。installer が `.agents/skills/` から `.claude/skills/` へコピーする動作は変わらない。

### 1.6 #543 接続点の設計（FR-4）

**判断**: #543（インストーラのバージョン・ハッシュ manifest）は 2026-07-06 時点で OPEN・PR なし（未 merge）。本 Intent の Construction 期間中に merge されない見通し。

**設計決定**: 接続点の設計のみを記録し、実装は #543 merge 後の後続 Intent に委ねる。

**接続点の形**:
- build.ts の Step 5 完了後（overlay 適用後）にオプショナルフックとして実装する。
- フックの呼び出しシグネチャ（設計案）: `generateManifest(root: string, options: BuildOptions): void`
- manifest の生成対象: `.agents/amadeus/` 配下の全ファイルのハッシュと、build.ts の実行バージョン（timestamp または commit hash）。
- 生成物の出力先: `.agents/amadeus-manifest.json`（仮、#543 の設計に従って確定）。
- フック不在時は Step 6 を静かにスキップし、exit code に影響しない。

**統合手順（#543 merge 後）**:
1. `scripts/amadeus-install.ts` の MANIFEST を参照し、manifest 生成ロジックを build.ts の Step 6 として実装する。
2. test:it:installer を更新して manifest の存在と内容を検証する。
3. `npm run build:check` が manifest を含む生成物を検証することを確認する。

## 2. core/ 配置図（before/after ツリー）

### before（現状）

```
<repo root>/
├── skills/                       ← skill 手編集場所（42 dirs）
│   ├── amadeus/
│   ├── amadeus-application-design/
│   │   ... (amadeus-* × 41)
│   └── amadeus-validator/
├── .agents/
│   ├── amadeus/                  ← エンジン手編集場所
│   │   ├── agents/
│   │   ├── amadeus-common/
│   │   ├── hooks/
│   │   ├── knowledge/
│   │   ├── scopes/
│   │   ├── sensors/
│   │   └── tools/
│   └── skills/                   ← promote-skill.ts の生成物（42 dirs）
├── .claude/
│   ├── agents       -> ../.agents/amadeus/agents   (symlink)
│   ├── amadeus-common -> ../.agents/amadeus/amadeus-common
│   ├── hooks        -> ../.agents/amadeus/hooks
│   ├── knowledge    -> ../.agents/amadeus/knowledge
│   ├── scopes       -> ../.agents/amadeus/scopes
│   ├── sensors      -> ../.agents/amadeus/sensors
│   ├── tools        -> ../.agents/amadeus/tools
│   └── skills/      (実体ディレクトリ、installer 管理)
└── harness/
    └── codex/                    ← 契約 README + provenance（Phase 1）
```

### after（Phase 2 完了後）

```
<repo root>/
├── core/                         ← 手編集の一本化（FR-1）
│   ├── agents/                   ← (旧: .agents/amadeus/agents/)
│   ├── amadeus-common/           ← (旧: .agents/amadeus/amadeus-common/)
│   ├── hooks/                    ← (旧: .agents/amadeus/hooks/)
│   ├── knowledge/                ← (旧: .agents/amadeus/knowledge/)
│   ├── scopes/                   ← (旧: .agents/amadeus/scopes/)
│   ├── sensors/                  ← (旧: .agents/amadeus/sensors/)
│   ├── tools/                    ← (旧: .agents/amadeus/tools/)
│   └── skills/                   ← (旧: skills/)
│       ├── amadeus/
│       ├── amadeus-application-design/
│       │   ... (amadeus-* × 41)
│       └── amadeus-validator/
├── harness/
│   ├── codex/                    ← openai.yaml 差分ソース正準（Phase 2 確定）
│   └── claude/                   ← .claude symlinks 配線宣言（新設）
│       └── wiring.json           ← 7 件のシンボリックリンク宣言
├── .agents/
│   ├── amadeus/                  ← build.ts の生成物（ランタイム場所変更なし）
│   │   ├── agents/
│   │   ├── amadeus-common/
│   │   ├── hooks/
│   │   ├── knowledge/
│   │   ├── scopes/
│   │   ├── sensors/
│   │   └── tools/
│   └── skills/                   ← build.ts の生成物（42 dirs）
├── .claude/
│   ├── agents       -> ../.agents/amadeus/agents   (build.ts が再現)
│   ├── amadeus-common -> ../.agents/amadeus/amadeus-common
│   ├── hooks        -> ../.agents/amadeus/hooks
│   ├── knowledge    -> ../.agents/amadeus/knowledge
│   ├── scopes       -> ../.agents/amadeus/scopes
│   ├── sensors      -> ../.agents/amadeus/sensors
│   ├── tools        -> ../.agents/amadeus/tools
│   └── skills/      (実体ディレクトリ、installer 管理のまま)
└── dev-scripts/
    └── build.ts                  ← promote-skill.ts を置き換える新ツール
```

移動後のランタイムパス（`.agents/amadeus/`、`.agents/skills/`）は変わらない。ただし、`core/tools/amadeus-utility.ts`（現在 `.agents/amadeus/tools/amadeus-utility.ts`）の `skillMdPath()` 関数（line 3561）は restructure 後に壊れるため、B002 Bolt で修正が必要（下記 §2.1 参照）。

### 2.1 skillMdPath の修正（H2）

**問題**: `skillMdPath()` の既定値は `join(TOOLS_DIR, "..", "..", "..", "skills", "amadeus", "SKILL.md")`（`amadeus-utility.ts:3561`）であり、TOOLS_DIR（`.agents/amadeus/tools/`）から起算して `skills/amadeus/SKILL.md`（repo root 基準）を指す。B002 の restructure 後、`skills/` が `core/skills/` に移動するため、このパスは壊れる。

**修正方針（BR-13 訂正対応）**: 生成物パスである `.agents/skills/amadeus/SKILL.md` を指すよう変更する（`join(TOOLS_DIR, "..", "..", "skills", "amadeus", "SKILL.md")`）。ランタイムは生成物だけを読む原則（§1.3 の生成物出力表）に揃う。

**変更**: `core/tools/amadeus-utility.ts`（B002 restructure 後の手編集正準）の line 3561 の相対パス計算を `join(TOOLS_DIR, "..", "..", "skills", "amadeus", "SKILL.md")` へ変更する。`AIDLC_SKILL_MD_PATH` 環境変数 seam は維持する（テスト上書きを引き続き機能させる）。

**engineFileExceptions**: `amadeus-utility.ts` は parity-map.json の `engineFileExceptions`（`tools/aidlc-utility.ts` 宣言済み）に含まれるため、parity:check で上流との差分として検出される。既存の宣言のまま変更不要。

## 3. CI 検証の実行形（FR-3）

### 3.1 手編集検出コマンド

```sh
# npm run build:check として package.json に追加する
bun run dev-scripts/build.ts && git diff --exit-code .agents/amadeus/ .agents/skills/ .claude/agents .claude/amadeus-common .claude/hooks .claude/knowledge .claude/scopes .claude/sensors .claude/tools
```

- `build.ts` の実行後に `git diff --exit-code` で生成物に差分があれば非ゼロ終了（手編集を検出）。
- `.claude/skills/` は installer 管理のため検証対象外。
- 既存の `diff:check`（`git diff --check`、whitespace 専用）とは別コマンドとして追加する。

### 3.2 test:all への組み込み

`test:ci:mock` スクリプト（package.json 現行: typecheck → lint:check → contracts:check → parity:check → ... → diff:check）に `build:check` を追加する。

追加位置: `test:it:all` の後、`test:it:engine-e2e` の前（生成物整合を eval 実行前に確認する順序）。

```json
"build:check": "bun run dev-scripts/build.ts && git diff --exit-code .agents/amadeus/ .agents/skills/ .claude/agents .claude/amadeus-common .claude/hooks .claude/knowledge .claude/scopes .claude/sensors .claude/tools"
```

### 3.3 team.md 粒度制約の置き換え（FR-3、Q4=A）

team.md の「skill 変更 PR は、skill 変更だけで構成することを既定とする。source skill と昇格先成果物の同期は skill 変更の一部であり、常に同一 PR に含める。」を CI 検証参照へ置き換える。

**置き換え文言案**（steering 更新は本 Intent の Construction スコープ内）:

> source skill（`core/skills/<name>/`）を変更したら、`npm run build:check` を実行して生成物が更新されていることを確認する。生成物（`.agents/amadeus/`、`.agents/skills/`）の手編集は `build:check` が検出するため、手動同期は不要である。

## 4. promote-skill.ts の位置付け

**決定**: promote-skill.ts は build.ts 導入後に退役する。

**移行計画**:
1. B001 で build.ts を実装し、test:it:build eval を追加する。
2. B003 で promote-skill.ts の test:it:promote-skill を test:it:build へ置き換え、promote-skill.ts を削除する。
3. モデルオーバーレイの再適用フック（promote-skill.ts:195-203）は build.ts Step 5 が引き継ぐ。
4. installer からの `promote-skill.ts` 参照を削除する（installer は `.agents/skills/` からのコピーのみ）。

**エイリアスは作らない**（後方互換性ルール: docs/backward-compatibility.md に記載のない対象には互換層を残さない）。

## 5. B002（restructure Bolt）の実装手順と成果物

### 5.1 実装手順

B002 実装者は以下の順で作業する。逐次列挙に頼らず「棚卸し → 全件更新 → 検出器追加」の 3 段階で進める（BR-5）。

```
Step 1: 棚卸し grep の実行と分類
  コマンド:
    grep -rn "skills/" dev-scripts/ scripts/ .agents/amadeus/tools/ package.json
  全ヒットを 3 区分に分類する:
    (a) B002 path update 対象 — runtime tool および eval fixture で実際に path を読む箇所
    (b) B003 対象 — promote-skill.ts 退役と関連する箇所
    (c) allowlist — コメント・data values・regex 文字列など path token でない箇所
  分類根拠: domain-entities.md §4「棚卸し実測全数表」を参照する。

Step 2: git mv による restructure
  git mv skills/ core/skills/
  git mv .agents/amadeus/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}/ core/
  ※ エンジン 7 dir の git mv は前提（B002 scope の全量）

Step 3: B002 path update 対象の全件更新
  Step 1 の分類 (a) を全件 core/skills/ に変更する。
  runtime tool と eval fixture を同一 commit に含める（BR-17）。
  promote-skill.ts:153 の最小 path 変更（L-A）も B002 commit に含める。

Step 4: rename-leftovers eval 拡張（検出器の追加）
  dev-scripts/evals/rename-leftovers/check.ts に新 check type を追加する。
  詳細: §5.2 参照。

Step 5: parity-map.json 更新 + parity:check pass 確認
  skillsSourceDir フィールドを追加し、npm run parity:check が pass することを確認する。

Step 6: test:all が pass することを確認
  npm run test:all が pass してから Bolt PR を作成する。
```

### 5.2 B002 の成果物: rename-leftovers eval 拡張

B002 の deliverable として `dev-scripts/evals/rename-leftovers/check.ts` に tree-wide `skills/` path token 検出 check を追加する。

**検出目的**: restructure 後に `skills/` path token（`.agents/skills/` および `core/skills/` を含まない単独の `skills/`）が dev-scripts/、scripts/、.agents/amadeus/tools/ に残っていないことを CI で継続的に検出する。逐次列挙が機能しなかったことへの設計的な回答。

**新 check の設計**:
- 走査対象: `dev-scripts/`、`scripts/`、`.agents/amadeus/tools/`（既存 check と同じ tree、package.json は別途）
- 検出パターン: `(?<![/\w])skills/(?!aidlc)` — `.agents/skills/` や `core/skills/` に前置されない単独の `skills/` path token
- allowlist.json に既知の許容出現を追加する（コメント文字列、data values、regex 文字列）
- allowlist の代表項目（全数は domain-entities.md §4 参照）:
  - `amadeus-orchestrate.ts` のコメント行（4 か所）
  - `amadeus-runner-gen.ts` のコメント・log 文字列（6 か所）
  - `parity-map.json` の nameMappings data values（4 か所）
  - `scripts/amadeus-install.ts` の devReferencePatterns regex 文字列（4 か所）
  - `rename-leftovers/check.ts` 自身の `skills/aidlc/` 検出用パターン（4 か所）
  - `parity-check.ts:176` のエラーメッセージ文字列

**実装手順（TDD）**: 先に新 check が fail することを確認してから最小実装を追加する（dev-scripts ルール）。fail のためには B002 の path 更新を完了させてから rename-leftovers eval を実行し、allowlist が不完全な状態で fail させる。allowlist が完成したら pass することを確認する。

**備考**: `amadeus-runner-gen.ts:67` の `SKILLS_DIR = join(TOOLS_DIR, "..", "skills")` は pre-existing の壊れたパス（`.agents/amadeus/skills/` は存在しない）のため、restructure 後に `core/tools/amadeus-runner-gen.ts` として正準化されると `core/skills/` に解決される（改善の副作用）。生成物としての `.agents/amadeus/tools/amadeus-runner-gen.ts` は `.agents/amadeus/skills/` への解決のままだが既存の壊れ方と同じ。allowlist に追加する。
