# Code Summary — implicit unit

Intent: 260704-grilling-mode-wiring（bugfix scope、Minimal depth）
対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/442
対象 plan: `../code-generation/code-generation-plan.md`（全 Step 完了、checkbox はすべて `[x]`）

## 変更ファイル一覧

### 新規（dev-scripts、Step 1）

- `dev-scripts/grilling-wiring.ts` — 検査ロジック lib。`grillingWiringIssues(root)` を export する。
- `dev-scripts/check-grilling-wiring.ts` — bin。issues を列挙して exit 1（`check-claude-host-wiring.ts` と同形）。
- `dev-scripts/evals/grilling-wiring/check.ts` — fixture ベースの eval（`mkdtempSync` で一時 workspace を作り、成功時も失敗時も `process.on("exit")` で片付ける）。

### 変更（`package.json`、Step 1）

- `scripts.grilling-wiring:check` を追加し、`test:ci:mock` 連鎖に `claude-wiring:check` の直後で組み込んだ。
- `scripts.test:it:grilling-wiring` を追加し、`test:it:all` 連鎖に `test:it:claude-host-wiring` の直後で組み込んだ。

### 変更（annex・conductor・bridge、Step 2〜4）

- `skills/amadeus/references/question-rendering.md` — 「Mode selection (Guide me / Grill me / I'll edit the file / Chat)」節を追加。4 択の順序、Grill me のラベル・説明（英語、one question at a time, recommended answer attached）、Grill me 選択時のレンダリング規則（一問ずつ、推奨回答と根拠付き、`aidlc-log.ts decision/answer` 記録、`[Answer]:` 書き戻し）を定義した。
- `skills/amadeus/SKILL.md` — `run-stage` 行に、ステージ本体が `<stage>-questions.md` を作るときは annex の 4 択 mode 選択（Guide me / Grill me / I'll edit the file / Chat、Guide me が既定）を提示する一文を追加した。既存の `ask` 行（ルーティング質問向けの bridge 結線）は変更していない。
- `skills/amadeus-grilling/references/engine-bridge.md` — 「Mode-selection insertion point」節を追加し、Grill me が annex の 4 択の 2 番目に挿入されること、選択時に本 bridge の手順が適用されることを定義した。

### 変更（29 ステージ skill、Step 5）

`grep -rln "grilling bridge protocol" skills/amadeus-*/SKILL.md` で確認した 29 skill すべてで、旧 4 行ボイラープレートを新文言へ一括置換した（置換スクリプトは一時ファイルで実行し、実行後に削除済み。29 件とも 1 箇所ずつ一致し、置換漏れ・多重一致はゼロ）。

```
skills/amadeus-application-design/SKILL.md
skills/amadeus-approval-handoff/SKILL.md
skills/amadeus-build-and-test/SKILL.md
skills/amadeus-ci-pipeline/SKILL.md
skills/amadeus-code-generation/SKILL.md
skills/amadeus-delivery-planning/SKILL.md
skills/amadeus-deployment-execution/SKILL.md
skills/amadeus-deployment-pipeline/SKILL.md
skills/amadeus-environment-provisioning/SKILL.md
skills/amadeus-feasibility/SKILL.md
skills/amadeus-feedback-optimization/SKILL.md
skills/amadeus-functional-design/SKILL.md
skills/amadeus-incident-response/SKILL.md
skills/amadeus-infrastructure-design/SKILL.md
skills/amadeus-intent-capture/SKILL.md
skills/amadeus-market-research/SKILL.md
skills/amadeus-nfr-design/SKILL.md
skills/amadeus-nfr-requirements/SKILL.md
skills/amadeus-observability-setup/SKILL.md
skills/amadeus-performance-validation/SKILL.md
skills/amadeus-practices-discovery/SKILL.md
skills/amadeus-refined-mockups/SKILL.md
skills/amadeus-requirements-analysis/SKILL.md
skills/amadeus-reverse-engineering/SKILL.md
skills/amadeus-rough-mockups/SKILL.md
skills/amadeus-scope-definition/SKILL.md
skills/amadeus-team-formation/SKILL.md
skills/amadeus-units-generation/SKILL.md
skills/amadeus-user-stories/SKILL.md
```

旧文言（例、`skills/amadeus-code-generation/SKILL.md`）:

```
   When this stage asks the user questions, follow the grilling bridge protocol
   in `../amadeus-grilling/references/engine-bridge.md` (path relative to this skill's directory) (one question at a
   time, recommended answer attached, answers written back in `[Answer]:`
   format).
```

新文言:

```
   When this stage asks the user questions, offer Grill me as the 2nd option
   of the mode selection (Guide me / Grill me / I'll edit the file / Chat).
   When the user picks Grill me, follow the grilling bridge protocol in
   `../amadeus-grilling/references/engine-bridge.md` (path relative to this skill's directory) (one question at a
   time, recommended answer attached, answers written back in `[Answer]:`
   format).
```

`../amadeus-grilling/references/engine-bridge.md` への相対パス表記と「(one question at a time, recommended answer attached, answers written back in `[Answer]:` format)」の文言は、現行の相対パス表記を維持する制約に従い、旧文言からそのまま引き継いだ。

なお `skills/amadeus-bugfix|amadeus-feature|amadeus-mvp|amadeus-security-patch/SKILL.md` と `skills/amadeus/SKILL.md` の `ask` 行も `engine-bridge.md` を参照するが、これらは `ask` directive（ルーティング質問）向けの既存結線であり、「stage asks the user questions」という stage-runner 特有の文言を持たないため対象外とした。この判定基準はそのまま `grillingWiringIssues()` の `isStageRunnerSkill()` に実装し、29 という数をハードコードしていない。

### 昇格同期（Step 6）

`dev-scripts/promote-skill.ts <name> --replace` を、変更した 31 skill（`amadeus`、`amadeus-grilling`、29 ステージ skill）それぞれに実行し、`.agents/skills/` 配下の対応ファイルを同期した。全件 exit 0。

## 実装判断

1. **wiring 検査の "対象ファイル" 判定を文言ベースにした**: `grillingWiringIssues()` の `isStageRunnerSkill()` は、SKILL.md が `engine-bridge.md` を参照し、かつ「asks the user questions」という句を含む場合にのみ「ステージ質問の結線を持つ skill」とみなす。29 という数や skill 名のリストをハードコードせず、`skills/amadeus-bugfix` 等の `ask` directive 向け結線と区別している。これにより、将来 stage skill が追加/削除されても検査が自動的に追従する。
2. **新旧文言のマーカーは 1 行に収まる部分文字列にした**: 当初 `newStageWordingMarker` を `"offer Grill me as the 2nd option of the mode selection"` としたところ、実際の新文言は 78 桁程度で改行しているため一致せず誤検知した（RED→GREEN の途中で発見・修正）。最終的に `"asks the user questions, offer Grill me as the 2nd option"`（1 行に収まる部分文字列）へ変更し、`oldStageWordingMarker`（`"asks the user questions, follow the grilling bridge protocol"`）と対になる形にした。
3. **annex の 4 択順序チェックは `indexOf` の大小比較で実装した**: 見出し「## Mode selection (Guide me / Grill me / I'll edit the file / Chat)」自体が 4 語を正しい順で含むため、本文中の語順が壊れない限り自動的に順序検査を満たす。fixture では意図的に語順を入れ替えたケースを追加して検出を確認した。
4. **昇格ファイル比較は「影響を受けたファイル」に限定した**: annex、`skills/amadeus/SKILL.md`、`engine-bridge.md`、および `isStageRunnerSkill()` で検出した各ステージ skill の SKILL.md のみを source/昇格先比較の対象にし、無関係な skill を誤検知しないようにした。
5. **一括置換は一時スクリプトで実行し、リポジトリに残さなかった**: `dev-scripts/**` は永続的な deliverable のみを置く方針（`.agents/rules/dev-scripts.md`）のため、29 件の単発置換ロジックは `/tmp` に書いて実行後に削除した。29 件とも「旧文言が 1 箇所だけ一致」を確認してから置換しており、置換漏れや多重一致はなかった。

## RED 証跡（Step 1、スキル編集前）

`bun run dev-scripts/check-grilling-wiring.ts` を実 repo に対して実行し、exit 1 で失敗することを確認した(全文は作業ログに記録済み、要旨は以下)。

```
grilling wiring: drift detected
- skills/amadeus/references/question-rendering.md: missing required marker "Grill me"
- skills/amadeus/references/question-rendering.md: missing required marker "Guide me"
- skills/amadeus/references/question-rendering.md: missing required marker "I'll edit the file"
- skills/amadeus/references/question-rendering.md: missing required marker "Chat"
- skills/amadeus/references/question-rendering.md: missing required marker "one question at a time"
- skills/amadeus/references/question-rendering.md: missing required marker "[Answer]:"
- skills/amadeus/references/question-rendering.md: missing required marker "aidlc-log.ts"
- skills/amadeus/references/question-rendering.md: missing required marker "engine-bridge.md"
- skills/amadeus-user-stories/SKILL.md: still carries the OLD unconditional grilling-bridge wording
- skills/amadeus-user-stories/SKILL.md: missing the NEW Grill me mode-selection wording
... (29 skill 分、"still carries the OLD ..." と "missing the NEW ..." が対で出力)
EXIT=1
```

annex 未定義（8 marker 欠落）と、29 skill 全件の旧文言残存＋新文言欠落が検出されており、Step 2〜6 実施前の状態が確実に検査対象であることを確認できた。

## GREEN 証跡（Step 7）

| 検証 | 結果 |
|---|---|
| `npm run grilling-wiring:check` | `grilling wiring: ok`（exit 0） |
| `npm run test:it:grilling-wiring` | `grilling wiring eval: ok`（正常 fixture の pass、annex marker 欠落・4 択順序崩れ・旧文言残存・source/昇格先不一致・昇格先欠落の各異常 fixture の fail、実 repo に対する最終 pass をすべて確認） |
| `npm run test:it:promote-skill` | `promote skill eval: ok` |
| `npm run parity:check` | `parity check: ok(38 skills、197 engine files、基準 commit fde1e1af7aae16f4c4defc991abaa3877ee2ac26)` |
| `npm run test:all` | 全ステップ pass（typecheck、lint、contracts、parity、claude-wiring、grilling-wiring、test:it:all 全項目、test:it:engine-e2e、diff:check） |

## 逸脱・特記事項

- **plan からの逸脱**: なし。Step 1〜8 を plan の順序どおりに実施した。
- **`.agents/aidlc/tools/data/stage-graph.json` の意図しない変更を検出・復元した**: `test:all` 実行中、PostToolUse hook（`aidlc-runtime-compile.ts`）が transition 系イベントを検知してエンジンの runtime graph を再コンパイルした際、`rules_in_context` が空配列に上書きされる形で `stage-graph.json` が書き換わった(diff で 564 行の削除を確認)。この変更は本 Intent の変更対象（`skills/`、`dev-scripts/`、`package.json`）に含まれず、`.agents/aidlc/` 配下のエンジンファイルであるため、`git checkout -- .agents/aidlc/tools/data/stage-graph.json` で復元し、`parity:check` が再び pass することを確認した。原因は hook 側の挙動であり、本 Intent のスコープ外(engine 本体の変更)として扱い、修正は行っていない。
- **`aidlc/spaces/default/intents/260704-v2-parity-completion/audit/j5ik2o-mac-studio-lan-5e97b7fa9d15.md` と `aidlc/spaces/default/intents/intents.json` の変更**: 作業開始時点で既に未コミットの差分があった（前者は audit hook による自動追記対象として明示的に「触れない」よう指示されている）。本 Intent の作業では両ファイルを一切編集しておらず、hook による自動追記のみが乗っている。作業指示どおり手を加えていない。
- **未解決事項の解消**: requirements の「未解決事項」（R003/R004/R005 の正確な文面確定）は、本ステージで annex・conductor・engine-bridge・29 skill の具体的な文面として確定した。

## レビュー指摘対応（architecture reviewer: NOT-READY）

初回実装後、architecture reviewer から NOT-READY の指摘が 2 件あり、TDD 順で対応した。

### 指摘 1: 検査の抜け穴（`dev-scripts/grilling-wiring.ts` が文字列 `"engine-bridge.md"` の有無しか見ておらず、相対パスの実解決を検証していない）

**対応（RED を先に作る）**: `grillingWiringIssues()` に以下を追加した。

- `extractEngineBridgeRefs(text)` — バッククォートで囲まれた `` `...engine-bridge.md` `` 形式の参照をすべて正規表現（`` /`([^`]*engine-bridge\.md)`/g `` ）で抽出する。
- `pathResolutionIssues(root, relPath)` — 抽出した各参照を、そのファイル自身のディレクトリからの相対パスとして解決し、`existsSync` で存在確認する。解決できない場合は期待パスも添えて issue を出す。
- `grillingWiringIssues()` 本体で、annex・conductor・engine-bridge 本体・29 ステージ skill の各 `relPath` と、その `.agents/skills` 昇格先の両方に対して `pathResolutionIssues` を実行するようにした。

`dev-scripts/evals/grilling-wiring/check.ts` に、annex の engine-bridge 参照が階層違いで壊れている fixture（`brokenAnnexPath`、`` `../amadeus-grilling/references/engine-bridge.md` `` を使う）を追加し、`"does not resolve to an existing file"` が報告されることを確認する `expectIssue` を足した。既存 fixture（`annexText` のデフォルト値と `wrongOrderAnnex`）が実は同じ階層違いのパスを使っていたため、これらは `../../amadeus-grilling/references/engine-bridge.md`（正しい深さ）へ修正した。

### 指摘 2: 実際の壊れた参照（`skills/amadeus/references/question-rendering.md` の `../amadeus-grilling/references/engine-bridge.md` が `skills/amadeus/amadeus-grilling/...` に解決され、存在しない）

**対応（GREEN）**: `skills/amadeus/references/question-rendering.md` の該当参照を `../../amadeus-grilling/references/engine-bridge.md` に修正し（`question-rendering.md` は `skills/amadeus/references/` にあるため、`skills/amadeus-grilling/` へ戻るには 2 階層上がる必要がある）、`bun run dev-scripts/promote-skill.ts amadeus --replace` で `.agents/skills/amadeus/` を再同期した。

### RED 証跡（検査拡張後、fix 前）

実 repo に対して拡張後の `check-grilling-wiring.ts` を実行し、指摘 2 の壊れた参照を検出して exit 1 することを確認した。

```
grilling wiring: drift detected
- skills/amadeus/references/question-rendering.md: engine-bridge reference "../amadeus-grilling/references/engine-bridge.md" does not resolve to an existing file (expected skills/amadeus/amadeus-grilling/references/engine-bridge.md)
- .agents/skills/amadeus/references/question-rendering.md: engine-bridge reference "../amadeus-grilling/references/engine-bridge.md" does not resolve to an existing file (expected .agents/skills/amadeus/amadeus-grilling/references/engine-bridge.md)
exit=1
```

### GREEN 証跡（fix + 再昇格後）

| 検証 | 結果 |
|---|---|
| `npm run grilling-wiring:check` | `grilling wiring: ok`（exit 0） |
| `npm run test:it:grilling-wiring` | `grilling wiring eval: ok`（新規 `brokenAnnexPath` fixture の fail 検出を含む全 fixture ＋ 実 repo 最終 pass を確認） |
| `npm run parity:check` | `parity check: ok(38 skills、197 engine files、基準 commit fde1e1af7aae16f4c4defc991abaa3877ee2ac26)` |
| `npm run test:all` | 全ステップ pass（再実行後も `.agents/aidlc/tools/data/stage-graph.json` の意図しない差分は発生しなかった） |

### 追加で変更したファイル

- `dev-scripts/grilling-wiring.ts` — `extractEngineBridgeRefs` / `pathResolutionIssues` を追加、`grillingWiringIssues()` に組み込み
- `dev-scripts/evals/grilling-wiring/check.ts` — `brokenAnnexPath` fixture を追加、既存 2 fixture の annex 参照階層を修正
- `skills/amadeus/references/question-rendering.md` — engine-bridge 参照を `../../amadeus-grilling/references/engine-bridge.md` に修正
- `.agents/skills/amadeus/references/question-rendering.md`（`amadeus` skill 再昇格による同期）
- `.agents/skills/amadeus/SKILL.md`（`promote-skill.ts amadeus --replace` が skill ディレクトリ丸ごとを対象にするため、差分なしのまま再コピーされた）

## Traceability（実施結果）

| Plan Step | Requirement | 結果 |
|---|---|---|
| Step 1 | R006-grilling-wiring-check、N003-deterministic-check | 完了。RED を確認してから実装した３ファイル＋package.json 更新はすべて決定論的（LLM 呼び出しなし）。 |
| Step 2 | R001-grill-me-mode-insertion、R002-annex-rendering-rule、N004-label-language | 完了。annex に 4 択順序・Grill me ラベル/説明(英語)・レンダリング規則を定義。 |
| Step 3 | R003-conductor-run-stage-wiring | 完了。`run-stage` 行に annex 参照の一文を追加。 |
| Step 4 | R004-engine-bridge-mode-definition | 完了。`engine-bridge.md` に挿入定義を追記。 |
| Step 5 | R005-stage-skill-wording-alignment、N001-existing-mode-unchanged | 完了。29 skill を一括置換。既存 3 択の表記・挙動は無変更。 |
| Step 6 | R007-promotion-sync | 完了。31 skill を `promote-skill.ts --replace` で同期。 |
| Step 7 | N002-parity-preserved、受け入れ条件(Issue #442) | 完了。`parity:check` pass(`aidlc-common/` 無差分、`engineFileExceptions` 空のまま)、`test:all` pass。 |
