# Requirements — 260705-engine-validator-gap

Intent: エンジンが書く値と validator の許可値の不整合を解消する（Issue [#457](https://github.com/amadeus-dlc/amadeus/issues/457)、[#458](https://github.com/amadeus-dlc/amadeus/issues/458)）
Scope: bugfix（Minimal depth）
確認事項の回答: `requirements-analysis-questions.md`（Q1〜Q4、全問回答済み）

## Intent 分析

#455 / PR #456 で「エンジンが書く値と validator の許可値の不整合」3 件を解消したが、同じ作業中に別系統の不整合 2 件（#457、#458）が観測され、当該 Intent の範囲外として起票された。本 Intent はこの残余 2 件を解消し、エンジンの出力と validator の検査基準を再び一致させる。

達成したい状態は次の 2 点である。

1. 同じ論理 path（stage の memory_path）が、エンジンのどの出力経路でも同一の値になる。
2. intent-birth 直後の正常な実 record が、AmadeusValidator の lifecycle-v2 検査を pass する。

## 機能要求

### R001-advance-memory-path（#457）

- `amadeus-state.ts` advance の stdout JSON が返す `memory_path` を、record prefix 付き（`aidlc/spaces/<space>/intents/<dirName>/<phase>/<stage>/memory.md`）へ統一する。
- PR #456 で修正済みの runtime graph 側（`amadeus-runtime.ts`）と同じ値になること。
- 実装時に advance stdout の既存消費者を grep で洗い出し、旧形式（record prefix なし）を前提とする消費者が残っていないことを確認する。

### R002-validator-scope-skip（#458）

- validator（lifecycle-v2 の `checkStageMark`）を engine 契約に合わせる。scope 外ステージの合法表記を次の 2 つとする。
  - `[ ]` ＋ `— SKIP` suffix（intent-birth 直後の正常形）
  - `[S]`（`--stage` / `--phase` ジャンプで skip した後の形）
- エンジン側（`amadeus-utility.ts` state-build）は変更しない。上流 v2 パリティを維持し、`[S]` の語彙（ジャンプ由来の skip）と scope 除外（`— SKIP` suffix)の意味の区別を保つ。

## 非機能要求

- 決定論: 修正は決定論的なツール・validator の挙動変更のみで、LLM 依存の判断を追加しない。
- パリティ: 上流 awslabs/aidlc-workflows v2（fde1e1af）とのパリティを崩さない。エンジンツールを修正する場合（R001）は `dev-scripts/data/parity-map.json` の engineFileExceptions への宣言と skills/ 正準ソースへの同一反映を行う。

## 制約

- 検証は TDD で進める（dev-scripts ルール）。先に失敗する検証を追加し、RED を確認してから最小修正を入れる。
- `.coderabbit.yml` は変更しない。
- merge 操作は人間が行う。

## 前提

- validator は Amadeus 固有実装であり、上流パリティの対象外である（validator 側修正が上流ドリフトにならない根拠）。
- `[S]` を birth 時に書く案は、上流ドリフトと語彙の意味崩れを招くため採用しない（Q2 で確定）。

## 範囲外

- #459（workspace-detection の Greenfield 誤判定）。後続の別 bugfix Intent として同じ worktree で直列に対応する（Q1 で確定）。なお本 Intent の intent-birth でも #459 が再現しており、その birth 出力を再現ケースとして使える。
- validator の operation ステージ扱い（lifecycle-v2.ts L218 が operation ステージを scope 内でも常に `[S]` 要求するように読める件）。本 Intent では変更せず、要確認事項として diary に記録済み。

## 受け入れ条件（Q4 で確定）

1. RED: #457 向けの失敗する検証（advance stdout の `memory_path` が record prefix 付きであることの検査）と、#458 向けの失敗する検証（`— SKIP` 表記の実 record を validator が pass する検査）を先に追加し、修正前に失敗することを確認する。
2. GREEN: 修正後に次がすべて成功する。
   - 追加した検証
   - `npm run test:all`
   - engine sandbox e2e（`npm run test:it:engine-e2e`）
   - `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-engine-validator-gap`（本 Intent の実 record が pass する）

> **追補（2026-07-05、code-generation 完了時）**: 4 番目の条件は「R001/R002 の再現ケース（scope 外ステージの checkbox 検査、memory_path）が pass すること」に限定して読み替える。実 record には R001/R002 と無関係な第三の既存不整合（`PHASE_VERIFIED` 記録時に Phase Progress が `Verified` へ更新されないエンジン欠落）があり、validator 全体判定は fail のまま残る。この件は [Issue #464](https://github.com/amadeus-dlc/amadeus/issues/464) としてスコープアウト済み（`construction/engine-validator-gap/code-generation/code-summary.md` の Review 節の人間判断推奨 (b) に対応する記録）。

## Open questions

- advance stdout の `memory_path` を読む既存消費者の全数（実装時に grep で確定する）。

## Review

判定: READY

- 構成: Step 10 が要求する 7 区分（Intent 分析、機能要求、非機能要求、制約、前提、範囲外、Open questions）をすべて含む。加えて受け入れ条件を独立節にしており、TDD 検証の実行順序が明確である。
- Q&A との整合: Q1（#459 を範囲外にする）、Q2（validator を engine 契約に合わせ、`[ ]`＋`— SKIP` と `[S]` の両方を合法にする）、Q3（advance stdout の `memory_path` を record prefix 付きに統一する）、Q4（TDD で進め、`npm run test:all`・engine sandbox e2e・AmadeusValidator を受け入れ条件にする）のすべてが本文に過不足なく反映されている。矛盾や解釈のブレは見当たらない。
- 事実確認（コード照合）:
  - `#457`: `.agents/amadeus/tools/amadeus-state.ts` L998 の advance stdout は `relativeMemoryPath(nextStage.phase, nextStage.slug)` を record prefix 引数なしで呼んでおり、`relativeMemoryPath`（`amadeus-lib.ts` L1742）の `recordPrefix ?? relativeSpaceRecordPrefix()` によって space レベルの prefix にフォールバックする。一方 `amadeus-runtime.ts` L372 は `relativeRecordDir(projectDir)` を渡して呼んでおり、値が食い違うという記述は正確である。
  - `#458`: `amadeus-utility.ts` の state-build（L2350 付近）は scope 外ステージを常に `` `- [ ] ${slug} — SKIP` `` で書く（marker は `[ ]` 固定、firstPostInit だけ `[-]` に置換）。一方 `lifecycle-v2.ts` の `checkStageMark`（L216-224）は `operationSlugs.has(stage.slug) || (def !== undefined && !inScope)` の場合に `checkboxStateName(stage.mark) === "Skipped"`（すなわち `[S]`）以外をすべて fail にしており、intent-birth 直後の実 record が必ず fail するという記述は正確である。
  - 範囲外として明記された「lifecycle-v2.ts L218 が operation ステージを scope 内でも常に `[S]` を要求しているように読める」点も、条件式 `operationSlugs.has(stage.slug) || ...` から独立した事実であることを確認した。本 Intent の範囲外とし、memory.md の Open questions に記録済みである点も確認した。
- テスト可能性: 受け入れ条件が「advance stdout の `memory_path` が record prefix 付きであることの検査」「`— SKIP` 表記の実 record を validator が pass する検査」という具体的な RED 対象と、GREEN 側の実行コマンド（`npm run test:all`、`npm run test:it:engine-e2e`、`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-engine-validator-gap`）を明示しており、requirements-analysis 段階として十分に検証可能である。個々のテストファイル名やアサーションの粒度は後続の設計・実装段階に委ねるのが妥当な範囲である。
- スコープ判断: #459 を別系統（workspace-detection のロジック不整合）として切り出し、#455/PR #456 の前例（系統単位で Intent を分ける）に沿わせている点は一貫している。本 Intent の intent-birth 自体で #459 が再現した事実を再現ケースとして記録している点も、後続 Intent への引き継ぎとして適切である。
- 軽微な指摘（READY 判定を変えない）: 「既存消費者の全数」を Open questions に残しているが、これは実装着手後の grep 確認事項であり、要求定義の完成度を損なうものではない。
