# ビジネスルール — three-layer-build

対象 Intent: 260706-three-layer-build（Issue #572）

## BR-1: 手編集場所の一本化

**規則**: 手編集が許可される場所は `core/` と `harness/<harness>/` のみとする。`.agents/amadeus/`、`.agents/skills/`、`.claude/agents`（および他の 6 件の symlink）は生成物であり手編集を禁止する。

**根拠**: FR-1、Q1=A、Q2=A。AC-1「手編集の場所が core/ と harness/ に一本化」。

**検証方法**: `npm run build:check` が CI で pass すること（build.ts 実行後 git diff --exit-code が 0）。

---

## BR-2: 生成物不可侵

**規則**: `.agents/amadeus/`、`.agents/skills/<name>/`、`.claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}` を直接編集した場合、`npm run build:check` が非ゼロ終了で検出する。手編集が発覚した場合は `core/` の対応ファイルを修正してから `npm run build` を再実行する。

**根拠**: FR-2（決定論的生成）、FR-3（手編集検出）。

**検証方法**: `npm run build:check` の CI パス（build.ts 実行 + git diff --exit-code）。

---

## BR-3: git mv 必須

**規則**: restructure Bolt（B002）において `skills/` → `core/skills/` および `.agents/amadeus/` → `core/` の移動は `git mv` で行い、履歴追跡（`git log --follow`）を保つ。`cp` + `rm` による移動は禁止する。

**根拠**: FR-1「git mv で行い、履歴追跡（`git log --follow`）を保つ」。

**検証方法**: B002 の Bolt PR の git log で `--follow` 付きのログが辿れること（reviewer が確認）。

---

## BR-4: 等価性検証

**規則**: restructure Bolt（B002）の前後で、移動対象の全ファイルについて sha256 ハッシュの対応表（before path → after path → sha256）を生成し、全件一致を確認してから Bolt PR を作成する。

**根拠**: FR-7「restructure は移動前後の等価性検証（全ファイル対応 + sha256、#526 と同型）で担保する」。

**検証方法**: B002 の Bolt PR の説明に等価性検証の結果（全件一致）を記録する。スクリプトは TDD で先に実装する（dev-scripts ルール）。

---

## BR-5: restructure 追従対象（全数棚卸し + 検出器方式）

**方針**: B002 実装者は、手作業の列挙表に頼らず「全数棚卸し + 検出器」の 2 段階で追従対象を特定・更新する。ラウンド 1〜3 の reviewer 差し戻しにより、逐次列挙では網羅が不可能であることが実証されたため（architecture-reviewer 2026-07-06）。

**B002 実装手順**:

1. **全数棚卸し**: B002 着手前に以下のコマンドで `skills/` path token の全数を実測し、全ヒットを「B002 対象 / B003 対象 / allowlist」に分類する。
   ```sh
   grep -rn "skills/" dev-scripts/ scripts/ .agents/amadeus/tools/ package.json
   ```
   分類根拠は domain-entities.md の付録「棚卸し実測全数表」を参照する（`grep -rn "skills/"` 実測 2026-07-06 時点での全数が記録されており、B002 対象 / B003 対象 / allowlist の区分が確定している）。

2. **全件更新**: 分類した B002 対象（runtime tools + eval fixtures）の `skills/` path token をすべて `core/skills/` に変更する。変更は runtime tool と eval fixture を同一 commit に含める（BR-17）。代表的な変更対象は下記のとおり（網羅ではない、全数は付録参照）:
   - `dev-scripts/grilling-wiring.ts`（line 4-7 定数, line 126-127 stageSkillDirs, line 139/187/219/225 の relPath テンプレート）
   - `dev-scripts/issue-ref-contract.ts:37`（`"skills"` base dir）
   - `dev-scripts/parity-check.ts:174`（checkSkills の sourcePath、BR-11）
   - `.agents/amadeus/tools/amadeus-utility.ts:3561`（skillMdPath 既定パス、H2、§2.1 参照）
   - `dev-scripts/promote-skill.ts:153`（`resolve(root, "skills", ...)` → `resolve(root, "core/skills", ...)` —— B002〜B003 間の green 維持のための最小変更、L-A）
   - `dev-scripts/evals/amadeus-templates/check.ts:49,68,166,171,180,185`（B002 担当分）
   - `dev-scripts/evals/parity/check.ts:236-237,261,281`（parity fixture）
   - `dev-scripts/evals/grilling-wiring/check.ts:139-155`（grilling-wiring fixture）
   - `dev-scripts/evals/issue-ref-contract/check.ts:59-60`（issue-ref-contract fixture）
   - `dev-scripts/evals/amadeus-contracts/check.ts:23,24,51`（contracts eval）
   - `dev-scripts/evals/aidlc-state/check.ts:35`（aidlc-state eval）
   - `dev-scripts/evals/docs-codekb-guards/check.ts:333`（docs-codekb-guards eval）
   - `dev-scripts/evals/amadeus-validator-domain/check.ts:6,11`（TypeScript import paths）
   - `dev-scripts/evals/model-overlay/check.ts:389-390`（promote-skill fixture）

3. **parity-map.json 更新**: `dev-scripts/data/parity-map.json` に `skillsSourceDir: "core/skills"` フィールドを追加し、`dev-scripts/parity-check.ts` の `checkSkills`（line 174）が `core/skills/` を参照するよう更新する（BR-11）。

4. **0 件 fail guard**: `dev-scripts/grilling-wiring.ts` の `stageSkillDirs` が 0 件を返した場合に fail する guard を追加する。restructure 後に `core/skills/` が存在しない（またはパスが誤っている）ケースを空振り pass で見逃さないため（M1）。

5. **rename-leftovers eval 拡張（検出器）**: B002 の成果物として `dev-scripts/evals/rename-leftovers/check.ts` に新しい check type を追加する。新 check は dev-scripts/、scripts/、.agents/amadeus/tools/ を tree-wide に走査し、`.agents/skills/` および `core/skills/` を含まない単独の `skills/` path token が残っていないことを検出する。allowlist.json に既知の allowlist 項目（コメント、data values、regex 文字列など）を追加し、偽陽性を制御する（allowlist 項目一覧は domain-entities.md 付録参照）。

**B002 / B003 の分担**:
- B002（restructure Bolt）: 上記手順 1〜5 をすべて含む。`promote-skill.ts:153` の最小 path 変更（L-A）も B002 に含める。
- B003（退役 Bolt）: `amadeus-templates/check.ts:214` の `promote-skill.ts` 呼び出し → `build.ts` 呼び出しへの置き換え、`promote-skill.ts` 本体の退役（H1 の残り + L-A 完了）。

**rename-leftovers 変更なし**: `dev-scripts/evals/rename-leftovers/check.ts` の既存 check（旧名 `skills/aidlc/` 断片の検出）は走査対象が `.agents/amadeus/tools/` のままのため、restructure 後も変更不要（実測根拠: check.ts line 12-13 の `toolsDir` と `sensorsDir` が生成物パスを指す）。

**根拠**: FR-6「Q1 付帯の 3 点セット（原子的 commit + nameMappings 拡張 + 検出器追従）を適用する」。H1/H2/H3/M1/M2/M-A〜M-H/L-A reviewer 指摘（architecture-reviewer 2026-07-06）。ラウンド 1〜3 の差し戻しにより逐次列挙の限界が実証されたため、全数棚卸し + 検出器方式へ切り替え。

**検証方法**: B002 完了後に `npm run parity:check`、`npm run test:it:rename-leftovers`、`npm run contracts:check`（grilling-wiring + issue-ref-contract を含む）、`npm run test:it:amadeus-templates`、`npm run test:it:aidlc-state`、`npm run test:it:docs-codekb-guards` が pass すること。

---

## BR-6: solo window

**規則**: restructure Bolt（B002）の着手前に leader へ solo window 要求を送り、他エンジニアとの並行編集を回避する。solo window は restructure commit の完了（`git push`）後に解放する。

**根拠**: NFR-1「機械的な大規模移動（restructure commit）は Construction で行い、着手前に leader へ solo window 要求を送る」。NFR-4「engineer4 #557、engineer2 #543 が skills/ 接触の可能性」。

**検証方法**: leader への solo window 要求メッセージ（agmsg 経由）が B002 着手前に送られていること。

---

## BR-7: walking skeleton 人間承認

**規則**: B001（build.ts 初期実装）は walking skeleton であり、Bolt PR のマージ前に人間が承認する。B001 の PR 作成時点で `npm run test:all` が pass していること（test:it:build eval を含む）。

**根拠**: NFR-2「walking skeleton の Bolt PR は人間が承認する」。Construction フェーズガードライン「walking skeleton 承認」。

**検証方法**: B001 の Bolt PR に `BOLT_COMPLETED` イベントが記録されており、人間承認が audit に残っていること。

---

## BR-8: TDD 必須

**規則**: `dev-scripts/build.ts` と手編集検出（`npm run build:check`）の実装は、先に失敗する eval（`dev-scripts/evals/build/check.ts`）を追加してから実装する。eval が失敗することを確認してから最小実装を入れる。

**根拠**: FR-7「新規 build.ts と手編集検出は、失敗する検証（eval）を先に追加してから実装する（dev-scripts ルール）」。

**検証方法**: eval 追加後の先行 fail を commit 履歴または Bolt 記録に残す（遡及 RED 検証でも可、実例: project.md Testing Posture §1）。

---

## BR-9: #543 接続点の扱い

**規則**: #543（インストーラのバージョン・ハッシュ manifest）は 2026-07-06 時点で OPEN・PR なし。本 Intent の Construction では接続点（build.ts Step 6 のフックシグネチャ設計）のみを実装し、manifest 生成の実装は行わない。#543 merge 後に後続 Intent で統合する。

**根拠**: FR-4「#543 が本 Intent の Construction までに merge されていれば統合を実装し、未 merge なら接続点の設計 + 統合手順の記録に留める（判断は functional-design で確定）」。

**検証方法**: build.ts の Step 6 がオプショナルフック呼び出しとして実装されており、フック不在時に静かにスキップすること（eval でフック不在ケースを検証）。

---

## BR-10: model overlay 適用点の移設

**規則**: model overlay の適用（`dev-scripts/apply-model-overrides.ts` に相当する処理）は build.ts の Step 5（最終後段）として実行する。promote-skill.ts の overlay 再適用フック（promote-skill.ts:195-203、`applyModelOverrides(root)` 呼び出し）は build.ts 移行後に削除する。

**根拠**: FR-5「model overlay の適用点を build 後段へ移設する」。

**検証方法**: `npm run test:it:model-overlay`（model-overlay eval）が新構造で pass すること。overlay の適用が build.ts Step 5 で行われていることを eval が確認する。

---

## BR-11: parity-check のスキルソースパス更新

**規則**: restructure Bolt（B002）後、`dev-scripts/parity-check.ts` の `checkSkills` が参照するスキルソースパスを `skills/` から `core/skills/` に変更する。変更は `parity-map.json` に `skillsSourceDir` フィールドを追加して制御する（parity-check.ts は同フィールドを優先し、フィールド不在時は `skills/` にフォールバック）。

**根拠**: FR-6「parity:check（nameMappings / engineFileExceptions の新 path 対応）」。parity-check.ts line 174 の `join(root, "skills", mappedName)` が対象。

**検証方法**: `npm run parity:check` が restructure 後に pass すること（`core/skills/<name>` と `.agents/skills/<name>` の両方が存在することを確認）。

---

## BR-12: installer のソースパス変更なし

**規則**: `scripts/amadeus-install.ts`（installer）はインストール元として `.agents/amadeus/`（エンジン）と `.agents/skills/`（skill 昇格）を参照する（line 207-220 の `copyEngine`、line 230-260 の `copySkills`）。これらは build.ts の生成物であり、restructure 後もランタイムパスは変わらない。installer の MANIFEST（ENGINE_DIR_NAMES、skillsGlobPrefix）は変更しない。

**根拠**: business-logic-model.md §1.5「build.ts はリポジトリ内の生成物のみを担当し、インストール操作は installer に委ねる」。

**検証方法**: `npm run test:it:installer` が restructure 後も pass すること。

---

## BR-13: ランタイムパスの不変と例外

**規則**: `.agents/amadeus/` と `.agents/skills/` のランタイムパスは変更しない。hook、tool、settings.json（7 件の symlink の symlink target）の既存参照を更新する必要はない。

**例外（H2 訂正）**: `amadeus-utility.ts:3561` の `skillMdPath()` 関数は、TOOLS_DIR 相対パスで `skills/amadeus/SKILL.md`（repo root 基準）を読む。これは restructure 後に `core/skills/amadeus/SKILL.md` に移動するため、ランタイムが直接 `skills/` を参照する箇所として壊れる。B002 Bolt でこのパスを `.agents/skills/amadeus/SKILL.md` 相当（生成物パス）に変更する（business-logic-model §2.1 参照）。この変更は BR-5 の全数棚卸し対象に含む（domain-entities.md 付録参照）。

**根拠**: business-logic-model.md §2「移動後のランタイムパスは変わらない」の原則に、H2 reviewer 指摘（architecture-reviewer 2026-07-06）による例外を追記した。

**検証方法**: restructure 後に `bun .agents/amadeus/tools/amadeus-utility.ts doctor` が pass すること（エンジン動作確認）。

---

## BR-14: promote-skill.ts 退役の段階実施

**規則**: promote-skill.ts の退役は B003 で行い、B001（build.ts 初期実装）および B002（restructure）と同一 Bolt に含めない。B003 の着手前に `npm run test:it:build` が pass していることを確認する。

**中間 red 防止（L-A）**: B002 の `git mv skills/ core/skills/` 後、`promote-skill.ts:153` の `resolve(root, "skills", skillName)` がソース dir を見つけられなくなる。B002 内でこの 1 行を `resolve(root, "core/skills", skillName)` に変更し（最小変更のみ、機能変更なし）、B002〜B003 の間も `test:it:promote-skill` が green を維持できるようにする。B003 でこのパス変更ごと `promote-skill.ts` 全体を退役させる。

**根拠**: FR-6「promote 系 eval（build.ts 検証への置き換えまたは追従）」。チーム働き方「skill 変更だけで構成することを既定とする」。粒度制約の原則（分割するとどちらかが fail する不可分な場合のみ同一 PR に含める）。L-A reviewer 指摘（architecture-reviewer 2026-07-06）。

**検証方法**: B002 後に `npm run test:it:promote-skill` が pass すること（中間 red なし）。B003 の PR で `test:it:promote-skill` が `test:it:build` に置き換わっており、test:all が pass すること。

---

## BR-15: harness/claude/wiring.json の宣言形式

**規則**: `harness/claude/wiring.json` は `.claude/*` symlink の配線宣言ファイルとする。形式は `[{ "name": "<name>", "target": "../.agents/amadeus/<name>" }]` の JSON 配列とし、build.ts Step 4 がこれを読み込んで symlink を再現する。harness/claude/ は手編集場所（BR-1 の許可対象）であり、build.ts の生成物ではない。

**根拠**: FR-2「`.claude/*` symlink（7 件）は harness/claude の配線規則として build が再現する」。実測: `.claude/` の 7 symlinks は全て `../.agents/amadeus/<name>` 形式（scripts/amadeus-install.ts MANIFEST.claudeSymlinks と一致）。

**検証方法**: build.ts Step 4 の eval が wiring.json の内容と実 symlink の一致を検証すること。

---

## BR-16: 重複正準禁止（H4 対応）

**規則**: `core/skills/<name>/agents/` に `openai.yaml` を置かない。openai.yaml の正準ソースは `harness/codex/skills/<name>/agents/openai.yaml`（per-skill）のみとする。

**根拠**: build.ts のステップ順は「skill コピー（Step 2）→ harness overlay（Step 3、後勝ち）」であるため、`core/skills/<name>/agents/openai.yaml` が存在すると Step 2 で `.agents/skills/<name>/agents/openai.yaml` に書き込まれた後、Step 3 が同パスを上書きする。二重の正準が生まれ、どちらが有効かが不明確になる。H4 reviewer 指摘（architecture-reviewer 2026-07-06）による明示禁止。

**検証方法**: build.ts の eval（B001 で実装）が `core/skills/<name>/agents/openai.yaml` の存在を fail として検出すること。

---

## BR-17: fixture と runtime tool の同一 commit 規則

**規則**: runtime tool（dev-scripts/*.ts など）の `skills/` path を変更する commit は、そのツールに対応する eval fixture の path 変更を同一 commit に含める。ツールの path 変更だけを先に commit し、eval fixture の変更を後の commit に回してはならない。逆も同様（eval fixture だけを先に変えてツールを後回しにしない）。

**適用範囲**: B002 での `skills/` → `core/skills/` path 更新が対象。具体的には以下の runtime tool + eval fixture の組:
- `grilling-wiring.ts`（line 4-7, 126-127, 139, 187, 219, 225）と `evals/grilling-wiring/check.ts:139-155`
- `issue-ref-contract.ts:37` と `evals/issue-ref-contract/check.ts:59-60`
- `parity-check.ts:174`（+ `parity-map.json` の `skillsSourceDir` 追加）と `evals/parity/check.ts:236-237,261,281`
- `amadeus-utility.ts:3561` は eval fixture に対応する eval が `evals/amadeus-validator-domain/check.ts`（TypeScript import path）
- `amadeus-templates/check.ts:49,68,166,171,180,185`（eval fixture であり、runtime tool でもある）は単独で変更してよい（ツールと fixture が同一ファイル）

**根拠**: project.md Testing Posture「TDD が中断されて実装が eval より先行した場合、eval の検出力が証明できなくなる」の原則。M-D〜M-H reviewer 指摘（architecture-reviewer 2026-07-06）。ツールの path 変更後に eval fixture が旧 path を期待し続けると CI が pass し続け、変更の整合が確認できない。

**検証方法**: B002 commit history において、runtime tool の path 変更と対応する eval fixture の path 変更が同一 commit（または連続 commit で test:all が常に green）に含まれること。B002 PR の CI が常時 green であること。
