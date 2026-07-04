# Code Generation Summary — implicit unit

Intent: 260704-engine-namespace（refactor scope、Minimal depth、test strategy: minimal）
対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/445
上流成果物: `../code-generation-plan.md`、`../functional-design/business-logic-model.md`、`../functional-design/domain-entities.md`、`../functional-design/business-rules.md`、`../../../inception/requirements-analysis/requirements.md`

plan の Step 1〜9 をすべて実行した。以下に、変更ファイル数、実装判断、RED→GREEN 証跡、検証結果、plan からの逸脱を記録する。

## 1. 変更ファイル数（概算）

`git status --short` で 320 件（working tree、未コミット）。

| 対象 | 件数 | 内容 |
|---|---:|---|
| `.agents/amadeus/`（旧 `.agents/aidlc/`） | 197 | ディレクトリ改名 + tools 26 + hooks 11 + `amadeus-common/`（旧 `aidlc-common/`）+ `knowledge/amadeus-shared/`（旧 `knowledge/aidlc-shared/`）+ 参照更新 |
| `.agents/rules/` | 2 | `aidlc.md` → `amadeus.md`（rename）+ 隣接ファイル 1 件（無関係の参照修正なし、`amadeus-artifacts-and-examples.md` は事前から `amadeus-*` 命名で対象外だが同ディレクトリのため件数に計上） |
| `.claude/` | 11 | symlink 7 本の張り替え、`aidlc-common` → `amadeus-common` symlink 改名、`rules/aidlc.md` → `rules/amadeus.md` symlink 改名、`settings.json` の hook パス・`permissions.allow` 更新 |
| `skills/**` | 44 | SKILL.md 等の参照更新（40 skill + 4 references 系ファイル） |
| `.agents/skills/**` | 44 | 上記の昇格反映（`promote-skill.ts --replace` 経由） |
| `dev-scripts/**` | 8 | `parity-check.ts`（機構一般化）、`parity-map.json`（対応表・relocations 更新）、`grilling-wiring.ts`、`evals/parity/check.ts`、`evals/engine-e2e/check.ts` 等の参照更新 |
| `docs/**` | 10 | `AMADEUS.md` 含む参照更新 |

tools 26 件・hooks 11 件は `domain-entities.md` の対応表どおり全件 `git mv` で改名済み（`.agents/amadeus/tools/`、`.agents/amadeus/hooks/` に実在確認済み）。

## 2. 主な実装判断

### 2.1 parity-check.ts の一般化（R007）

- `subAgentNameMapping` を撤廃し、`nameMappings: NameMapping[]`（`kind: engine-dir | tool | hook | common-dir | shared-dir | rules-file | sub-agent`）に統合した。
- `mapEnginePath()`（旧 `mapSubAgentPath` 相当）と `normalizeContent()`（旧 `normalizeSubAgentContent` 相当）を、kind ごとの disambiguation 正規表現（`mappingRegex()`）で駆動する設計にした。
  - tool / hook: 拡張子込み完全一致（bare token 保護）
  - engine-dir: `.agents/aidlc/` を含む path 接頭辞一致
  - common-dir / shared-dir: path セグメント境界一致
  - rules-file: `rules/aidlc.md` の path 一致
  - sub-agent: `aidlc-<x>-agent` パターン一致（#438 の吸収）
- `checkRulesAidlcMd`（`checkRulesFile` へ改称）を、生バイト比較から `normalizeContent()` 経由の正規化後 hash 比較に変更した（N001 の非対称性を解消）。
- **実装中に発見した設計拡張**: tool/hook の import 参照は ESM 慣習で `.js` 拡張子を使う（ソースは `.ts`）。当初の対応表は `.ts` 拡張子のみを想定していたため、`amadeus-state.ts` 等 5 ファイルの `import ... from "./aidlc-lib.js"` が正規化されず hash 不一致になった（`test:all` 実行中に検出）。`mappingRegex` の tool/hook kind を `.ts` / `.js` のどちらにもマッチし、捕捉した拡張子をそのまま保持して置換するよう拡張した。対応表（`prefix`/`replacement`）のデータ自体は `domain-entities.md` どおり `.ts` 表記のまま変更していない。

### 2.2 relocations と nameMappings の実データ投入（Step 6）

- `relocations` の `localPath` を全 8 行 `.agents/amadeus/...` へ更新した。
- `aidlc-common` → `amadeus-common`、`rules/aidlc.md` → `rules/amadeus.md` は、`nameMappings` によるトークン置換後の path で relocations lookup を行う設計のため、`relocations` の `upstreamPath` キー自体も置換後の値（`amadeus-common`、`rules/amadeus.md`）に更新した（他の 6 行は元々トークン置換の対象外なのでキー不変）。
- `nameMappings` に tool 26 行 + hook 11 行 + engine-dir 1 行 + common-dir 1 行 + shared-dir 1 行 + rules-file 1 行 + sub-agent 1 行（吸収済み）＝計 42 行を投入した（plan の「40 行超」を満たす）。

### 2.3 `checkedEngineDirectories` の表記

`parity-map.json` の `checkedEngineDirectories`（コードから未参照の説明用メタ情報）は `amadeus-common` へ更新した。この項目は non-functional（コード未参照）だが、N005 の残存を減らすため、および parity-map.json 全体の記述を「現在のローカル構造」基準に揃えるため、あえて上流命名ではなくローカル改名後の命名に寄せた。この判断は `parity-map.json` 内の他の記述（`exceptions[].reason` 内の同種の列挙）にも一貫して適用した。

### 2.4 dev-scripts の上流スキーマ参照は対象外とした（plan からの逸脱、要記録）

`dev-scripts/generate-parity-baseline.ts` は実際の上流 `awslabs/aidlc-workflows` clone（`dist/claude/.claude/`）からベースラインを抽出する専用スクリプトであり、`engineDirectories` 定数と `rules/aidlc.md` パス文字列は、上流リポジトリ自身のディレクトリ名（上流は改名していない）を指す。ここを機械的に `amadeus-common` 等へ置換すると、実際の upstream clone 探索が壊れて生成器が機能しなくなるため、**意図的に対象外とした**。

`dev-scripts/parity-check.ts` の `checkRulesFile()` 内で参照する `baseline.rulesAidlcMd.path`（実行時に "rules/aidlc.md" という値を持つ）や、`dev-scripts/data/parity-map.json` の `nameMappings` テーブル自体の `prefix` フィールド（定義上、旧トークンを列挙する）も、同じ理由（上流スキーマ・対応表の定義そのもの）で対象外とした。

これらは `domain-entities.md` の「対象外」節にある `dev-scripts の既存ファイル名（parity-check.ts など。エンジンではなく repo 開発スクリプト）」と同じ理由（機能維持に必須、対象は repo 開発スクリプトでありエンジンではない）に基づく判断であり、`parity-map.json` の `exceptions` 配列に新しい 1 行として明記した。

## 3. RED → GREEN 証跡

### Step 1: RED（現行実装で fail することを確認）

`dev-scripts/evals/parity/check.ts` に `nameMappings` 対応表 fixture（kind: engine-dir、common-dir、shared-dir、rules-file、tool、hook、sub-agent の全種）と、境界安全性を壊す変異テスト（C8: bare token 誤爆、C9: セグメント境界誤爆）を追加した状態で、改名前の実装（`subAgentNameMapping` のみ対応）に対して実行し、以下の RED を確認した。

```
generate-parity-baseline: ok
command failed: bun run .../dev-scripts/parity-check.ts .../parity-localUVR1Gb
stderr:
parity check: 5 件の差分（基準 commit f4b284d71b386ddbf1ad5beb01e87c8e4ca7eb80）
- engine ファイル欠落: aidlc-common/bar.md -> .../parity-localUVR1Gb/.claude/aidlc-common/bar.md
- engine ファイル欠落: hooks/aidlc-hook-x.ts -> .../parity-localUVR1Gb/.agents/amadeus/hooks/aidlc-hook-x.ts
- engine ファイル欠落: knowledge/aidlc-shared/k.md -> .../parity-localUVR1Gb/.agents/amadeus/knowledge/aidlc-shared/k.md
- engine ファイル欠落: tools/aidlc-widget.ts -> .../parity-localUVR1Gb/.agents/amadeus/tools/aidlc-widget.ts
- rules/aidlc.md 欠落: rules/aidlc.md -> .../parity-localUVR1Gb/.claude/rules/aidlc.md
```

### Step 2: GREEN（機構一般化後、fixture が pass）

`parity-check.ts` を nameMappings 駆動へ書き換えた後、同じ fixture が pass することを確認した。

```
generate-parity-baseline: ok
parity-check happy path (nameMappings): ok
parity-check declared skill exception: ok
parity-check declared engine file exception: ok
parity-check bare-token disambiguation guard: ok
parity-check segment-boundary disambiguation guard: ok
parity eval: ok
```

同時に、実データ（改名前の実リポジトリ）に対する `bun run dev-scripts/parity-check.ts` も pass することを確認し、機構一般化だけでは実データの挙動が変わらないことを担保した。

### 追加の RED → GREEN（`.js` import 拡張子の disambiguation 拡張、Step 8 中に発見）

`npm run test:all` 実行中に `test:it:engine-e2e` が RED（`.agents/aidlc/tools` を参照するコードの ENOENT）、続いて `parity:check` が RED（`amadeus-state.ts` 等 5 tool ファイルの `.js` import 未正規化による hash 不一致）になった。`mappingRegex` の tool/hook kind を `.ts`/`.js` 両対応へ修正し、`dev-scripts/evals/parity/check.ts` の hook fixture を `.js` import ケースに更新した上で、以下の GREEN を再確認した。

```
generate-parity-baseline: ok
parity-check happy path (nameMappings): ok
...
parity eval: ok
```

## 4. Step 8 検証結果

### 4.1 `npm run parity:check`

```
parity check: ok（38 skills、197 engine files、基準 commit fde1e1af7aae16f4c4defc991abaa3877ee2ac26）
```

`engineFileExceptions` は空のまま（`dev-scripts/data/parity-map.json` で確認済み）。

### 4.2 `npm run test:all`

exit code 0。`typecheck`、`lint:check`、`contracts:check`、`parity:check`、`claude-wiring:check`、`grilling-wiring:check`、`test:it:all`（`aidlc-state`、`amadeus-validator`、`amadeus-validator-domain`、`promote-skill`、`claude-host-wiring`、`grilling-wiring`、`llm-runner-options`、`llm-provider-options`、`migrate-workspace`、`parity` の全 evals を含む）、`test:it:engine-e2e`、`diff:check` すべて pass。

### 4.3 `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .`

判定: fail（Intent Registry カテゴリで 2 件 fail）。

```
- aidlc/spaces/default/intents/intents.json: status が許可値である。根拠: in-flight
- aidlc/spaces/default/intents/intents.json: registry の repos が配列である。根拠: 260704-engine-namespace
```

この 2 件は、本 Intent 自身の registry エントリ（`260704-engine-namespace`）が `repos` フィールド未設定・`status: in-flight` であることに起因する。この差分はセッション開始前から存在していた（セッション開始時点の `git status` で `aidlc/spaces/default/intents/intents.json` が既に modified だったことを確認済み。`git diff` でも本 Intent の code-generation 作業で追加した内容はゼロ）。`aidlc/spaces/**` は本 Intent のハード制約により変更禁止のため、この pre-existing かつ対象外の fail は修正せず記録のみ行う。それ以外の全カテゴリ（Intent Registry の残り 36 件、その他、ファイル存在、検証範囲、見出し、実行環境、表列）はすべて pass。

### 4.4 N005 残存 grep

実行コマンド:

```sh
git grep -lE "\.agents/aidlc/|aidlc-(orchestrate|utility|state|log|audit|runtime|bolt|graph|learnings|directive|lib|jump|swarm|worktree|validate|version|sensor[a-z-]*|includes|stage-schema|rule-schema|runner-gen|stop|session-[a-z]+|statusline|sync-statusline|mint-presence|audit-logger|log-subagent|validate-state|runtime-compile|sensor-fire)\.ts|aidlc-common|aidlc-shared|rules/aidlc\.md" -- ':!aidlc/spaces' ':!dev-scripts/data/parity-baseline.json' ':!dev-scripts/evals/parity'
```

結果: 2 ファイル（0 件ではない）。

```
dev-scripts/data/parity-map.json
dev-scripts/generate-parity-baseline.ts
```

**逸脱の説明（2.4 節参照）**: この 2 ファイルは、(a) `parity-map.json` の `nameMappings` テーブル自身（`prefix` フィールドは定義上、旧トークンを列挙する必要がある）と、(b) `generate-parity-baseline.ts`（実際の上流 clone のディレクトリ名・path を扱う、機能上不可避な参照）である。いずれも「対応表・上流スキーマの定義そのもの」であり、機械的に置換すると機構が壊れる。requirements.md の N005 で固定された許容例外 3 箇所（`aidlc/spaces/**`、`dev-scripts/data/parity-baseline.json`、`dev-scripts/evals/parity/**`）には該当しないため、文字どおりには「0 件」を満たしていない。`domain-entities.md` の「対象外: dev-scripts の既存ファイル名（parity-check.ts など。エンジンではなく repo 開発スクリプト）」と同じ理由に基づく必要不可避な残存と判断し、`parity-map.json` の `exceptions` に追記して説明責任を明示した。

なお、この 2 ファイルを除く非機能的なコメント・メッセージ文言（`parity-check.ts` のコメント、エラーメッセージのハードコードラベル、`parity-map.json` の `exceptions[].reason` 文言）は、機能を損なわない範囲ですべて旧トークンを除去した（`checkRulesAidlcMd` → `checkRulesFile` への改称含む）。

`.js` import 拡張子の残存チェック（本タスク中に発見した追加観点）:

```sh
git grep -lE "aidlc-(bolt|jump|log|state|worktree|lib)\.js" -- ':!aidlc/spaces' ':!dev-scripts/data/parity-baseline.json' ':!dev-scripts/evals/parity'
```

結果: 0 件（マッチなし、exit 1）。

## 5. plan からの逸脱まとめ

1. **`.js` import 拡張子への disambiguation 拡張**（4.2 節・3 節参照）: `domain-entities.md`/`business-rules.md` の対応表は `.ts` 拡張子のみを列挙していたが、実装時に tool 間の ESM import が `.js` 拡張子を使う実態を発見し、`parity-check.ts` の disambiguation 実装を `.ts`/`.js` 両対応に拡張した。対応表データ自体（`prefix`/`replacement` の値）は変更していない。
2. **N005 grep が文字どおり 0 件にならない**（4.4 節参照）: `dev-scripts/data/parity-map.json`（nameMappings 定義）と `dev-scripts/generate-parity-baseline.ts`（上流スキーマ処理）の 2 ファイルは、機能維持のため意図的に対象外とした。許容例外境界を実質的に 3 箇所から 5 箇所へ広げる判断であり、人間レビューでの確認を推奨する。
3. **`checkedEngineDirectories` の表記変更**（2.3 節参照）: non-functional な説明用配列を上流命名からローカル改名後の命名へ変更した。コード上の挙動には影響しない。
4. **`checkRulesAidlcMd` → `checkRulesFile` への関数名変更**: ハードコードされた `rules/aidlc.md` 系の文言を除去する過程で、`parity-check.ts` 内の関数名も改称した（`baseline.rulesAidlcMd` という型フィールド名自体は上流 baseline スキーマに合わせて維持）。

## 6. Traceability

| Plan Step | 実施内容 | 対応 Requirement |
|---|---|---|
| Step 1 | `dev-scripts/evals/parity/check.ts` に nameMappings fixture 追加、RED 確認 | R007、N001 |
| Step 2 | `parity-check.ts` の nameMappings 駆動への一般化、`checkRulesFile` の内容正規化統一 | R007、N001 |
| Step 3 | tools 26 / hooks 11 / `amadeus-common/` / `knowledge/amadeus-shared/` / `rules/amadeus.md` / `.agents/amadeus/` を `git mv` で改名 | R001〜R005 |
| Step 4 | repo 全体の参照更新（`.claude/settings.json` 最優先）、`aidlc-state.md` 等の保護対象を無傷確認 | R006、N004 |
| Step 5 | `.claude/` symlink 張り替え・`amadeus-common`/`rules/amadeus.md` symlink 改名 | R001、grilling Q1 |
| Step 6 | `relocations`/`nameMappings` 実データ投入 | R001、R007 |
| Step 7 | 40 skill を `promote-skill.ts --replace` で昇格 | R008 |
| Step 8 | `parity:check`/`test:all`/`AmadeusValidator`/N005 grep 実行・記録 | N001〜N005 |
| Step 9 | 本 `code-summary.md` の作成 | — |

## 7. 追記: レビュー指摘対応（Gate: Request Changes）

architecture reviewer が、functional-design の対応表（`domain-entities.md`）に scopes 9 件 + sensors 4 件の取りこぼしを指摘し、Request Changes gate で人間が採用（`aidlc-state.md` 承認、audit に `DECISION_RECORDED` あり: 「reviewer 指摘（非ブロッキング）を Request Changes で採用: scopes 9 + sensors 4 の `aidlc-*.md` を今回の改名対象に追加する」）。`domain-entities.md` に「scopes（9 件）」「sensors（4 件）」の 2 節が追記され、正準対応表が確定した。以下、追加対応の内容を記録する。

### 7.1 改名（追加 13 件）

`.agents/amadeus/scopes/aidlc-{bugfix,enterprise,feature,infra,mvp,poc,refactor,security-patch,workshop}.md` → `amadeus-*.md`、`.agents/amadeus/sensors/aidlc-{linter,required-sections,type-check,upstream-coverage}.md` → `amadeus-*.md` を `git mv` で改名した。scope 名（`bugfix` 等）と sensor id（`linter` 等）自体は無変更（拡張子込み `.md` 完全一致のファイル名だけを改名、対応表 §scopes/§sensors の規則どおり）。

### 7.2 参照更新（41 ファイル）

`git grep` で発見した 41 ファイル（`.agents/amadeus/amadeus-common/protocols/stage-definition.md`、`stage-protocol.md`、`amadeus-common/stages/**` 配下の全 32 stage 定義、tools 4 本（`amadeus-graph.ts`、`amadeus-learnings.ts`、`amadeus-lib.ts`、`amadeus-runner-gen.ts`、`amadeus-utility.ts` の 5 本 ※当初挙げられた 4 本に加え `amadeus-learnings.ts` も発見）、`tools/data/stage-graph.json`、`skills/amadeus/SKILL.md`）を更新した。`skills/amadeus/SKILL.md` は `promote-skill.ts amadeus --replace` で `.agents/skills/amadeus/SKILL.md` へ昇格反映した。

実装中に、単純な 13 件の実ファイル名参照だけでなく、`.claude/scopes/aidlc-<name>.md` / `.claude/sensors/aidlc-<id>.md` という**命名規則プレースホルダ表記**（scope-file/sensor-file 命名の実際の慣習を説明するプレースホルダで、`stage-definition.md`・`stage-protocol.md`・32 stage 定義・4 tools 全てに出現）も、byte-match 対象の engine ファイル内容として改名後表記（`amadeus-<name>.md`/`amadeus-<id>.md`）へ揃える必要があると判明した。これは対応表の 13 件の外側にある追加の参照更新対象であり、`domain-entities.md` の対応表には明示されていなかったため、coordinator 指摘（「references exist inside parity byte-match engine files ... normalization must map the new names back for hashing」）を踏まえ、`parity-map.json` に scope-file/sensor-file kind のプレースホルダ行 2 件（`aidlc-<name>.md`、`aidlc-<id>.md`）を追加してカバーした（7.3 節）。

### 7.3 parity-map.json / parity-check.ts の拡張

- `NameMappingKind` に `scope-file`、`sensor-file` を追加した。
- `mappingRegex`/`applyMapping` に、拡張子込み（`.md`）完全一致の disambiguation ケースを追加した（tool/hook の `.ts`/`.js` と同型だが、scope-file/sensor-file は単一拡張子 `.md` のみを扱う）。
- `dev-scripts/data/parity-map.json` の `nameMappings` に 15 行を追加した: scope-file の実ファイル名 9 行 + プレースホルダ 1 行（`aidlc-<name>.md`）、sensor-file の実ファイル名 4 行 + プレースホルダ 1 行（`aidlc-<id>.md`）。coordinator 指示の「13 行」に対し、プレースホルダ 2 行を追加発見・追加した（RED→GREEN 節参照）。
- `relocations` は追加不要だった（`scopes`/`sensors` の relocation は元の Step 6 で既に `.agents/amadeus/scopes`・`.agents/amadeus/sensors` へ更新済みのため）。

### 7.4 RED → GREEN 証跡（追加分）

fixture（`dev-scripts/evals/parity/check.ts`）に scope-file/sensor-file kind の実データ行 2 件（`aidlc-bugfix.md`、`aidlc-linter.md`）とプレースホルダ行 2 件（`aidlc-<name>.md`、`aidlc-<id>.md`、`aidlc-common/bar.md` 内に埋め込み）を追加した。

`parity-check.ts` の scope-file/sensor-file ケースを一時的に「常に不一致」な正規表現（`(?!)`）へ差し替えて RED を確認した。

```
generate-parity-baseline: ok
command failed: bun run .../dev-scripts/parity-check.ts .../parity-localxD7DDZ
stderr:
parity check: 3 件の差分（基準 commit 3fd211a473478dbae982b6cd445280d1ea99dd33）
- engine ファイル hash 不一致: aidlc-common/bar.md（期待 593c16e40bd9dd694a5371396e985c0c5ca5df6ee804388d70df4243afbec145、実際 0279bcf5d2a6244d6073596c3c921ab97055a96e2c0ce80af5ca110fa6d1974c）
- engine ファイル欠落: scopes/aidlc-bugfix.md -> .../.agents/amadeus/scopes/aidlc-bugfix.md
- engine ファイル欠落: sensors/aidlc-linter.md -> .../.agents/amadeus/sensors/aidlc-linter.md
```

実装（本来の disambiguation 正規表現）を復元し、GREEN を確認した。

```
generate-parity-baseline: ok
parity-check happy path (nameMappings): ok
parity-check declared skill exception: ok
parity-check declared engine file exception: ok
parity-check bare-token disambiguation guard: ok
parity-check segment-boundary disambiguation guard: ok
parity eval: ok
```

### 7.5 再検証結果

- `npm run parity:check`: pass（38 skills、197 engine files、`engineFileExceptions` 空のまま）。1 回目の実行で pass（追加 15 行が正しく機能）。
- `npm run test:all`: pass、exit 0（フルチェーン再実行済み）。
- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .`: **判定 pass**（exit 0）。4節で記録した pre-existing の Intent Registry fail 2 件（本 Intent 自身の registry エントリの `repos`/`status`）は、本ラウンドまでの間に外部で解消されており、Intent Registry 38 件すべて pass、fail 0 件、warning 0 件、blocked 0 件。
- N005 残存 grep（13 件の旧 `.md` ファイル名 + プレースホルダ `aidlc-<name>.md`/`aidlc-<id>.md` を追加したパターン）:

  ```sh
  git grep -lE "\.agents/aidlc/|aidlc-(orchestrate|utility|state|log|audit|runtime|bolt|graph|learnings|directive|lib|jump|swarm|worktree|validate|version|sensor[a-z-]*|includes|stage-schema|rule-schema|runner-gen|stop|session-[a-z]+|statusline|sync-statusline|mint-presence|audit-logger|log-subagent|validate-state|runtime-compile|sensor-fire)\.ts|aidlc-common|aidlc-shared|rules/aidlc\.md|aidlc-(bugfix|enterprise|feature|infra|mvp|poc|refactor|security-patch|workshop|linter|required-sections|type-check|upstream-coverage)\.md|aidlc-<name>\.md|aidlc-<id>\.md" -- ':!aidlc/spaces' ':!dev-scripts/data/parity-baseline.json' ':!dev-scripts/evals/parity'
  ```

  結果: 2 ファイル（`dev-scripts/data/parity-map.json`、`dev-scripts/generate-parity-baseline.ts`）。4.4 節で記録した既存の 2 ファイル例外がそのまま該当し、新規の残存は 0 件。追加した scope-file/sensor-file 対応表・プレースホルダ行はすべて `nameMappings` の `prefix` フィールド（定義上不可避）としてのみ現れる。

### 7.6 追加の逸脱

- **プレースホルダ行の追加発見**（当初指示の「13 行」に対し `nameMappings` は実質 15 行を追加）: `domain-entities.md` の対応表は実ファイル名 13 件のみを列挙していたが、`stage-definition.md`・`stage-protocol.md`・32 stage 定義・4 tools に埋め込まれた命名規則プレースホルダ（`aidlc-<name>.md`/`aidlc-<id>.md`）も byte-match 対象のため、追加で 2 行の `nameMappings`（scope-file/sensor-file kind）を投入した。
- **参照更新対象の 1 ファイル追加発見**: coordinator 指示の tools 4 本（`amadeus-graph.ts`、`amadeus-lib.ts`、`amadeus-runner-gen.ts`、`amadeus-utility.ts`）に加え、`amadeus-learnings.ts`（sensor マニフェスト形状のコメント内で `aidlc-linter.md` を参照）も grep で発見し、同様に更新した。
