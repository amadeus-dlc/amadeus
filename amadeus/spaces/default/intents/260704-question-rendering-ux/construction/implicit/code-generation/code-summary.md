# Code Summary — implicit unit

Intent: 260704-question-rendering-ux（refactor scope、Minimal depth）
対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/448 、https://github.com/amadeus-dlc/amadeus/issues/449 、https://github.com/amadeus-dlc/amadeus/issues/450
対象 plan: `../code-generation/code-generation-plan.md`（全 Step 完了、checkbox はすべて `[x]`）

## 変更ファイル一覧

### 変更（決定論的 wiring 検査、Step 1）

- `dev-scripts/grilling-wiring.ts`
  - `orderIssues()` を新設し、4 label（Guide me / Grill me / I'll edit the file / Chat）の初出順序判定ロジックを共通化した（canonical annex と Codex annex の両方に適用）。
  - `annexIssues()` の `requiredMarkers` に、Display language 節向け 4 marker（`Display language`、`conversation language`、`canonical label`、`display translation`）、Grill me レンダリング規則向け 4 marker（`Grill me rendering rules`、`one question per tool call`、`recommendation marker`、`reuses the existing split rule`）、Codex annex への参照 marker（`question-rendering-codex.md`）を追加した。
  - `codexAnnexIssues(root)` を新設した。`skills/amadeus/references/question-rendering-codex.md` の存在、正準 label 4 個の順序、`request_user_input`、`Text fallback`、`question-rendering.md` 参照を assert する。
  - `bridgeLanguageIssues(root)` を新設した。`engine-bridge.md` に旧 `is Japanese` 固定文言が残っていないこと、`conversation language` 文言が存在することを assert する。
  - `grillingWiringIssues()` の `affectedRelPaths`（昇格同期・パス解決の対象）に `codexAnnexRelPath` を追加した。
- `dev-scripts/evals/grilling-wiring/check.ts`
  - `annexText` fixture に Display language 節と `### Grill me rendering rules` 節を追加した。
  - `codexAnnexText` fixture を新設し、`writeSkillTree` / `makeFixture` が `question-rendering-codex.md`（source・昇格先の両方）を書き出せるよう `includeCodexAnnex` オプションを追加した。
  - `bridgeText` fixture に会話言語文言（`conversation language`）を追加した。
  - 新規 negative fixture を 2 件追加した。
    1. `missingCodexAnnex`（`includeCodexAnnex: false`）— `missing file: skills/amadeus/references/question-rendering-codex.md` で fail することを確認。
    2. `missingDisplayLanguageAnnex`（Display language 節を欠いた annex）— `missing required marker "Display language"` で fail することを確認。

### 変更（annex・engine-bridge、Step 2〜4）

- `skills/amadeus/references/question-rendering.md`
  - 冒頭（Mechanism の前）に「Harness routing」節を追加した。Codex は `question-rendering-codex.md` の束縛を使うこと、harness-neutral な節（Display language、Grill me rendering rules に相当する箇所）は両 harness に適用されることを明記した。
  - Mechanism 節の後、Mode selection 節の前に「Display language (harness-neutral)」節を追加した。表示（prompt / label / description）は会話言語、機械可読の記録（mode 分岐、`[Answer]:`、`amadeus-log.ts`、`--user-input`）は正準 English label、`[Answer]:` は正準ラベル + 表示訳の併記、というルールを定義した。
  - 既存の「If the user picks Grill me」の箇条書き（**一切変更していない**）の直後に「### Grill me rendering rules」節を追加した。harness 中立規則（1 呼び出し 1 問、推奨先頭 + 推奨マーク、根拠は地の文、既存の分割規則の流用、組み込み自由記述経路、ログ/書き戻し不変）と Claude Code 束縛の要約を書いた。
- `skills/amadeus/references/question-rendering-codex.md`（新設）
  - Shared rules（正準 annex の Display language / 1問1呼び出しの interview pattern を参照。複製しない）、Mechanism（`request_user_input` へのフィールドマッピング表）、Enablement（`experimental_request_user_input`、既定 off、`codex exec` 非対応）、Mode selection（4 択を 3 択 + custom へ畳み、Chat は custom 経由と質問本文に明記）、Grill me（1 呼び出し 1 問、2〜3 択 + custom）、Text fallback（1 メッセージ 1 問、A〜X の番号付き、推奨マーク、回答案内、正準 label での記録）の 6 節を英語で書いた。
- `skills/amadeus-grilling/references/engine-bridge.md`
  - 手順 1 に、正準 annex の Grill me rendering rules 節への参照（tool-call shape、推奨マーク、分割規則）を追加した。
  - 手順 5 の旧文言「User-facing question text is Japanese.」を、会話言語 + 正準 label 記録への一般化文言へ更新した。`[Answer]:` の併記規則（正準ラベル + 表示訳）を明記した。回答記録手順（decision/answer ログ、`[Answer]:` 書き戻し）本体は変更していない。

### 昇格同期（Step 6）

`dev-scripts/promote-skill.ts <name> --replace` を、`amadeus`・`amadeus-grilling` の 2 skill に実行した。全件 exit 0。
`.agents/skills/amadeus/references/question-rendering-codex.md` は昇格により新設された。

## 実装判断

1. **正準 annex・Codex annex の新設節は、Mode selection より前に 4 label 文字列を含めないよう文言を調整した**: `business-logic-model.md` の申し送り（順序回帰）どおり、`orderIssues()` は 4 label の `indexOf` 初出順で判定する。当初 Harness routing 節の文言に「Grill me rendering rules」という語句をそのまま書いたところ、`indexOf("Grill me")` が Mode selection 節より先に一致し、順序 assert が fail した（RED→GREEN のループで発見）。同様に Codex annex の Shared rules 節・イントロ文でも「Grill me」を Mode selection より前に書いてしまい同じ問題が起きた。両方とも、Mode selection より前の文言では「Grill me」という 2 語の並びを避け、「interview rendering rules」「one-question-per-call interview pattern」といった言い換えに直した。
2. **`orderIssues()` を独立関数として共通化した**: 既存の `annexIssues()` 内にインライン実装されていた順序判定ロジックを抜き出し、Codex annex にも同じ判定を適用できるようにした（`business-rules.md` の「正準 label の並び順は既存 wiring 検査の order assert を維持する」を Codex annex にも及ぼす設計判断）。
3. **`pathResolutionIssues()` は変更していない**: `business-logic-model.md` の申し送り（参照解決の限界）どおり、Codex annex → 正準 annex の参照は文字列一致の assert（`question-rendering.md` marker）に留め、実パス解決の対象は既存どおり `engine-bridge.md` 参照だけにした。`affectedRelPaths` に Codex annex を加えたことで、Codex annex 自身の `engine-bridge.md` 参照（今回は存在しない）があれば同じ実パス解決検査の対象にはなる。
4. **fixture 文字列の改行位置に注意した**: 複数語からなる required marker（`one question per tool call`、`reuses the existing split rule` など）は、配列を `join("\n")` する際に行の折り返し位置で分割されると `text.includes()` が一致しなくなる。RED→GREEN のループでこの問題を検出し、該当フレーズが単一の配列要素（＝改行を挟まない 1 行）に収まるよう調整した。同じ理由で実ファイル（`question-rendering.md`）側の `one question per tool call` も、最初のドラフトでは行の折り返しで分断されており（かつ先頭が大文字 `One` で大小文字も不一致していた）、`grep -c` で検出して修正した。
5. **engine-bridge.md の回答記録手順は完全に維持した**: 手順 2〜4（待機、decision/answer ログ、`[Answer]:` 書き戻し）は 1 文字も変更していない。変更したのは手順 1（参照追加）と手順 5（文言一般化）のみ。

## RED 証跡（Step 1、annex/engine-bridge 編集前）

`npm run grilling-wiring:check` を実 repo に対して実行し、exit 1 で失敗することを確認した。

```
grilling wiring: drift detected
- skills/amadeus/references/question-rendering.md: missing required marker "Display language"
- skills/amadeus/references/question-rendering.md: missing required marker "conversation language"
- skills/amadeus/references/question-rendering.md: missing required marker "canonical label"
- skills/amadeus/references/question-rendering.md: missing required marker "display translation"
- skills/amadeus/references/question-rendering.md: missing required marker "Grill me rendering rules"
- skills/amadeus/references/question-rendering.md: missing required marker "one question per tool call"
- skills/amadeus/references/question-rendering.md: missing required marker "recommendation marker"
- skills/amadeus/references/question-rendering.md: missing required marker "reuses the existing split rule"
- skills/amadeus/references/question-rendering.md: missing required marker "question-rendering-codex.md"
- missing file: skills/amadeus/references/question-rendering-codex.md
- skills/amadeus-grilling/references/engine-bridge.md: still hardcodes "is Japanese" — must carry conversation-language wording instead
- skills/amadeus-grilling/references/engine-bridge.md: missing conversation-language wording
- missing file: skills/amadeus/references/question-rendering-codex.md
EXIT=1
```

あわせて `bun run dev-scripts/evals/grilling-wiring/check.ts` を実行し、fixture ベースの assert（正常 fixture の pass、2 件の新 negative fixture を含む全 negative fixture の fail）はすべて成功したうえで、末尾の実 repo 統合 assert（`run(checkCommand, root)`）だけが上記と同じ内容で fail することを確認した。これにより、検査拡張と fixture 更新自体が正しく、annex/engine-bridge 未編集の状態だけが検出対象であることを確認した。

## GREEN 証跡（Step 5〜7）

annex・Codex annex・engine-bridge の編集と昇格同期（`amadeus`、`amadeus-grilling`）を終えた後、以下をすべて実行し pass を確認した。

| 検証 | 結果 |
|---|---|
| `npm run grilling-wiring:check` | `grilling wiring: ok`（exit 0） |
| `npm run test:it:grilling-wiring` | `grilling wiring eval: ok`（正常 fixture の pass、annex marker 欠落・4 択順序崩れ・engine-bridge 参照の相対パス誤り・旧文言残存・source/昇格先不一致・昇格先欠落・Codex annex 欠落・Display language 節欠落の全 negative fixture の fail、実 repo に対する最終 pass のすべてを確認） |
| `npm run test:it:promote-skill` | `promote skill eval: ok` |
| `npm run typecheck` | pass（`tsc --noEmit` エラーなし） |
| `npm run lint:check` | `public type file: ok`、`ts complexity: ok`、`lints: ok`（2 checks） |
| `npm run parity:check` | `parity check: ok`（38 skills、197 engine files、基準 commit `fde1e1af7aae16f4c4defc991abaa3877ee2ac26`） |
| `npm run claude-wiring:check` | `claude host wiring: ok` |
| `npm run test:all`（追加確認） | 全ステップ pass（typecheck、lint、contracts、parity、claude-wiring、grilling-wiring、`test:it:all` 全項目、`test:it:engine-e2e`、`diff:check`） |

`git status --porcelain` で、変更ファイルが domain-entities.md の正準一覧（`skills/amadeus/references/question-rendering.md`、新設 `question-rendering-codex.md`、`skills/amadeus-grilling/references/engine-bridge.md`、`dev-scripts/grilling-wiring.ts`、`dev-scripts/evals/grilling-wiring/check.ts`、および `promote-skill.ts` による `.agents/skills/amadeus*` 昇格先）に限られること、`aidlc-state.md`・audit ファイル・`.agents/amadeus/**`・stage skill SKILL.md に差分がないことを確認した。

## 逸脱・特記事項

- **plan からの逸脱**: なし。Step 1〜8 を plan の順序どおりに実施した。
- **タスク指示との実行順の整理**: 「`npm run test:it:grilling-wiring`（must pass）と `npm run grilling-wiring:check`（実 repo で FAIL、RED 証跡）」という指示は、eval script（`dev-scripts/evals/grilling-wiring/check.ts`）自体の最終行が実 repo に対する統合 pass 判定（`run(checkCommand, root)`）を含むため、annex 編集前の同一時点では両立しない（fixture 部分は pass するが、末尾の実 repo 統合行で eval 全体が exit 1 になる）。前例（Intent 260704-grilling-mode-wiring）と同じ扱いとし、Step 1 時点では「fixture ベースの全 assert（正常・異常とも）が意図どおりであること」と「実 repo 統合 assert が annex 未編集の内容で fail すること」の両方を `bun run dev-scripts/evals/grilling-wiring/check.ts` の実行結果から確認し、これを RED 証跡とした。`npm run test:it:grilling-wiring` が文字どおり pass するのは、annex・Codex annex・engine-bridge の編集と昇格同期を終えた Step 5 以降である（GREEN 証跡に記録済み）。
- **wiring 検査追加時に 2 度の RED→GREEN ループがあった**: (1) 正準 annex の Grill me rendering rules 節と、eval fixture の同節で、複数語からなる required marker が改行や大文字小文字の不一致で分断され、`missing required marker` が誤検出された（実装判断 4 に記載）。(2) Harness routing 節（正準 annex）と Shared rules 節（Codex annex）で「Grill me」という語句を Mode selection より前に書いてしまい、順序 assert が fail した（実装判断 1 に記載）。いずれも `orderIssues()` / 決定論的検査が正しく検出し、annex 側の文言修正で解消した。
- **`aidlc-state.md` の "Per unit" が `[TBD]` のままである**: `AmadeusValidator` を対象 Intent 指定で実行したところ、`construction/[TBD]/functional-design/*.md` に対する produces 成果物チェックが「存在しない」で fail した。実ファイルは `construction/implicit/functional-design/` に存在するが、`aidlc-state.md` の「Per unit: [TBD]」というプレースホルダがユニット名（`implicit`）へ確定していないためのパス不一致であり、`aidlc-state.md` はエンジン/conductor が所有する成果物のため本タスクでは変更していない（タスク指示「conductor owns workflow state」に従う）。conductor 側での確定を要する観察事項として記録する。
- **`aidlc/spaces/default/intents/intents.json` と `package-lock.json` の未コミット差分**: 作業開始前から存在していた差分であり（本 Intent の準備過程でエンジンが更新したものと推定）、本タスクでは一切編集していない。

## Traceability（実施結果）

| Plan Step | Requirement | 結果 |
|---|---|---|
| Step 1 | R008-wiring-check-extension、N004-deterministic-check | 完了。RED を確認してから `grilling-wiring.ts` と fixture を拡張した（LLM 呼び出しなし）。 |
| Step 2 | R001-display-language-rule、R005-grill-me-neutral-rules、R006-grill-me-claude-binding | 完了。既存節の label・順序・文言は無変更のまま、Harness routing・Display language・Grill me rendering rules の 3 節を追加した。 |
| Step 3 | R003-codex-annex、R004-codex-fallback-format、R007-grill-me-codex-binding | 完了。`question-rendering-codex.md` を新設し、Shared rules / Mechanism / Enablement / Mode selection / Grill me / Text fallback の 6 節を定義した。 |
| Step 4 | R002-engine-bridge-language-alignment | 完了。手順 5 を会話言語 + 正準ラベル記録へ一般化し、手順 1 に Grill me rendering rules への参照を追加した。回答記録手順は無変更。 |
| Step 5 | R008-wiring-check-extension（GREEN 確認） | 完了。`grilling-wiring:check`、`test:it:grilling-wiring` ともに pass。 |
| Step 6 | R009-promotion-sync | 完了。`amadeus`、`amadeus-grilling` を再昇格し、`test:it:promote-skill` が pass。 |
| Step 7 | N001-existing-behavior-unchanged、N002-parity-preserved | 完了。`typecheck`、`lint:check`、`parity:check`（`amadeus-common/` 無差分、`engineFileExceptions` 空のまま）、`claude-wiring:check` がすべて pass。追加確認として `test:all` も全項目 pass。 |
