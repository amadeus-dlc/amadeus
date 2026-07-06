# コード生成サマリー — unit: parallel-policy-docs

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `aidlc/spaces/default/memory/team.md` | 並行運用ポリシーへ新節「worktree の階層と Bolt 実行契約」を追加（WF1）。「並行させる単位」「共有成果物の統合」「ゲート承認の運用」へ最小追記、根拠表へ 4 行追加（WF2） |
| `aidlc/spaces/default/memory/phases/construction.md` | 新規作成。seed（`.agents/amadeus/tools/data/memory-seed/phases/construction.md`）の構造（タイトル・適用宣言・H2 見出し 5 個）を踏襲し、新見出し「## Bolt 運用」を追加（WF3） |
| `aidlc/spaces/default/intents/260705-parallel-policy-docs/construction/parallel-policy-docs/issue-disposition.md` | 新規作成。#407 / #342 の 3 値判定表と close 提案（WF4） |
| `aidlc/spaces/default/intents/260705-parallel-policy-docs/aidlc-state.md` | 「Per unit: [TBD]」を「Per unit: parallel-policy-docs」へ修正（下記「逸脱」参照） |
| `aidlc/spaces/default/intents/260705-parallel-policy-docs/construction/parallel-policy-docs/code-generation/code-generation-plan.md` | 全ステップのチェックボックスを完了に更新 |

## 主要な判断

### 1. #407 項目 5 の内容訂正（WF1 / N001）

承認済み設計（business-logic-model.md、requirements.md R006-2）は「本家 `aidlc-worktree.ts` 相当は `amadeus-bolt.ts` が担い、独立 tool は新設しない（意図的差分）」という前提で書かれていた。
実装をファクトチェックした結果、この前提は事実と異なることを確認した。

- `.agents/amadeus/tools/amadeus-worktree.ts` が `create` / `merge` / `discard` / `list` / `verify` の 5 subcommand を持つ独立 tool として既に存在し、`WORKTREE_CREATED` / `WORKTREE_MERGED` / `WORKTREE_DISCARDED` を emit している。
- `.agents/amadeus/knowledge/amadeus-shared/audit-format.md`（118〜124 行目。#407 本文が「確認した事実」として引用している同じ表）が、実装ツールとして `tools/amadeus-worktree.ts` を明記している。
- `.agents/amadeus/tools/amadeus-bolt.ts` の `start --worktree` / `complete --merge` は、この `amadeus-worktree.ts` と `amadeus-state.ts`（fork/merge）、`amadeus-audit.ts`（audit-fork/audit-merge）を束ねる Bolt ライフサイクルの orchestrator である。
- `git log --follow` で `amadeus-worktree.ts` の履歴を確認したところ、エンジン基盤導入コミット（`feat: B001 walking skeleton - adaptive copy of AI-DLC engine`）から存在しており、後から追加されたものではない。

このため、team.md の新節と issue-disposition.md では、項目 5 を「意図的差分として記録する」ではなく「実装済み（`amadeus-worktree.ts` として実装済み。新設の要否そのものが解消済み）」として記録した。
R006-1（gate evidence は Bolt PR merge と `BOLT_COMPLETED` のまま）という実務上の結論自体は変わらない。
requirements.md / business-logic-model.md 側の文言更新は本作業のスコープ外（Inception/Functional Design 成果物の改変は行っていない）のため、この訂正は code-generation 側の成果物にのみ反映した。

### 2. construction.md の本文表現（team-lead 指示との差異）

team-lead の依頼文は「seed の 5 見出しをオリジナルの英語本文のまま verbatim で保持する」との指示だったが、次の理由により、見出しラベル（Code Completeness 等）は英語のまま保持しつつ、本文（箇条書き）は日本語へ翻訳して記載した。

- `AMADEUS.md` および `.agents/rules/amadeus-artifacts-and-examples.md` は `aidlc/**/*.md` を日本語で書くことを MUST としている。
- 承認済み設計（business-logic-model.md 41 行目）も「タイトル…相当の日本語タイトル」と明記しており、英語 verbatim ではなく日本語化を前提にしている。
- `.agents/amadeus/tools/amadeus-graph.ts` の `resolveRulesForStage` は phase rule をファイルパス（`phases/<phase>.md`）だけで解決し、見出しや本文の文字列を machine-parse しない。したがって本文を日本語化しても import 機構は壊れない。
- `dev-scripts/data/parity-baseline.json` が追跡するのは seed 本体（`tools/data/memory-seed/phases/construction.md`）であり、今回新規作成した `aidlc/spaces/default/memory/phases/construction.md` は parity 対象外である。

見出しラベルは seed との対応関係を保つため英語のまま残した。

### 3. aidlc-state.md の「Per unit: [TBD]」修正

Step 5 の検証で validator が fail した。原因は、functional-design 完了後も `aidlc-state.md` の「Per unit」欄が `[TBD]` のまま更新されておらず、`construction/[TBD]/functional-design/*.md` を存在確認しようとして 4 件の「不足または矛盾」を報告していたためである。
実際の functional-design 成果物は `construction/parallel-policy-docs/functional-design/` に既に存在しており、単に状態追跡欄が古いままだった（本 code-generation セッションが原因ではなく、functional-design 完了時点からの持ち越し）。
「本 Intent record 配下」の変更許容範囲内であり、値の食い違いを解消する機械的な修正であるため、`Per unit: [TBD]` を `Per unit: parallel-policy-docs` へ修正した。修正後、validator は pass した。

## 検証結果

| 検証 | 結果 |
|---|---|
| `npm run test:all`（N002） | pass（exit 0。2 回実行、2 回とも pass。1 回目はコード生成直後、2 回目は aidlc-state.md 修正後） |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-parallel-policy-docs`（N003） | 修正前: fail（「Per unit: [TBD]」由来の 4 件）。`Per unit` 修正後: pass（不足または矛盾: なし） |
| AC-1 | team.md「worktree の階層と Bolt 実行契約」節末尾に #407 の 5 項目対応表が存在し、対応する各段落が実在する |
| AC-2 | #342 弱点 1 は issue-disposition.md で実装済み（参照付き）、弱点 2 は construction.md「Bolt 運用」節に切り直し手順として存在する |
| AC-3 | team.md 根拠表に 2026-07-05 の実例 4 行が、PR/Issue 参照付きで追加されている |
| AC-4 | 上記 N002・N003 のとおり pass |

## 逸脱

- 「主要な判断」1・2・3 に記載した 3 点（#407 項目 5 の内容訂正、construction.md 本文の日本語化、aidlc-state.md の Per unit 修正）は、依頼文の paraphrase や承認済み設計の未検証前提と、実装のファクトチェック・プロジェクトの言語規則・検証結果との食い違いを解消するために行った。いずれも設計判断そのものの変更ではなく、事実確認と規則適用による訂正である。上流（requirements.md / business-logic-model.md）の文言自体は未修正のため、必要であれば別途 Inception/Functional Design 側の整合を検討されたい。

## Review

**Verdict**: READY

**Findings**:

- **[非ブロッキング／確認済み] AC-1 の #407 5 項目対応表は正確。** team.md「worktree の階層と Bolt 実行契約」節末尾の対応表と、#407 本文の「問題」節に列挙された 5 項目を突き合わせたところ、文言・切り分け（項目 1〜3 = R001 相当の階層関係の記述、項目 4〜5 = R006 相当の gate evidence とツール実装状況）とも一致していた。issue-disposition.md の判定表とも整合している。
- **[非ブロッキング／確認済み] 項目 5 は訂正後の事実（実装済み）で書かれている。** requirements.md R006-2 の訂正注記（「独立 tool は新設しない意図的差分」という当初記載を「実装済み」へ訂正）どおり、team.md・issue-disposition.md・code-summary.md のいずれも「`amadeus-worktree.ts` が実装済みであり、新設の要否そのものが解消済み」の一貫した記述になっている。requirements.md 末尾の古い Review セクション（iteration 2 時点）にのみ「意図的差分」という訂正前の表現が残っているが、これは本 Intent の対象外（Inception 成果物）であり、今回の code-generation 側の成果物には波及していない。
- **[非ブロッキング／確認済み] 実装参照の実在をスポットチェックした。** `amadeus-worktree.ts` は `create`/`merge`/`discard`/`list`/`verify` の 5 subcommand（`info` を含めると 6）を持ち、`WORKTREE_CREATED`/`WORKTREE_MERGED`/`WORKTREE_DISCARDED` を emit する。`amadeus-bolt.ts` は `start --worktree`/`complete --merge`/`set-autonomy`（774〜868 行目付近、行番号の主張と一致）を持つ。`stage-protocol.md` の「### Construction Bolt gates (walking skeleton + ladder + halt-and-ask)」見出しは実際に 89 行目にあり、Ladder prompt の記述も 97 行目から始まる。`audit-format.md` の `WORKTREE_*`/`AUDIT_*` 行は 122〜128 行目で、team.md・issue-disposition.md が引用する「118〜124」「118〜128」の範囲に収まる。参照はいずれも実在し、内容とも一致する。
- **[非ブロッキング／確認済み] AC-3 根拠表 4 行の参照は実在し内容と対応する。** `gh issue view` / `gh pr view` で #476（CLOSED）、#477（CLOSED）、#478（OPEN）、#481（CLOSED）、PR #471〜475（MERGED、kanban-sync の Bolt 群）、PR #479（MERGED、hooks 修正）、PR #480（MERGED、台帳文書化）、PR #482（MERGED、jump の phase-check 修正）を確認し、team.md 根拠表の各行のタイトル・要約と一致することを確認した。追加された 4 つの本文（占有通知/引き渡し、意味的接触の申し送り、完了済み Intent の接触面、指示系統の委任）はいずれもこの根拠表のいずれかの行と対応しており、「観察済みの実例に根拠がある範囲だけを扱う」という並行運用ポリシーの原則を満たす新しい判断基準は追加されていない。
- **[非ブロッキング／確認済み] AC-2: phases/construction.md の Bolt 運用節は妥当。** seed（`.agents/amadeus/tools/data/memory-seed/phases/construction.md`）の H2 見出し 5 個（Code Completeness / Error Handling / Testing Standards / Security / Corrections）をそのまま保持し、新見出し「## Bolt 運用」を末尾に追加する構成で、seed 構造を壊していない。本文の日本語化（見出しラベルは英語のまま）という逸脱は、(1) AMADEUS.md・`.agents/rules/amadeus-artifacts-and-examples.md` の `aidlc/**/*.md` 日本語 MUST、(2) 承認済み business-logic-model.md 自体が日本語タイトルを前提にしていたこと、(3) `resolveRulesForStage`（`amadeus-graph.ts`）がファイルパスと `phase` frontmatter だけで phase rule を解決し本文を machine-parse しないこと、(4) `parity-baseline.json` が追跡するのは seed 本体のみで、生成先の `aidlc/spaces/default/memory/phases/construction.md` は parity 対象外であること、の 4 根拠で裏付けを確認した。walking skeleton 実装済み参照（`stage-protocol.md` 89/97 行目、`amadeus-bolt.ts` の `set-autonomy`）と、切り直し手順（halt-and-ask → delivery-planning への backward jump または単発 re-run → 再開）は R002・R003 の要求どおり記載されている。
- **[非ブロッキング／確認済み] issue-disposition.md の 3 値判定は整合している。** #407 は 5 項目すべて「本 Intent で文書化」または「実装済み」で閉じ、close を提案。#342 は弱点 1・2 を close 提案、弱点 3（Delivery Planning 分業の要否）は「未確定・運用実績待ち」として対象外節・R005 と整合させたまま残しており、requirements.md の「対象外」節・#342 自身の推奨候補（候補 1）とも矛盾しない。
- **[非ブロッキング／確認済み] 制約遵守を確認した。** `git status --short` は `aidlc/spaces/default/intents/intents.json`（Intent 登録という engine 標準の副作用）、`aidlc/spaces/default/memory/team.md`、新規 `aidlc/spaces/default/intents/260705-parallel-policy-docs/`、新規 `aidlc/spaces/default/memory/phases/` のみで、エンジン・skill・validator への diff はない。team.md の diff は追記のみ（既存行の削除・改変なし）。`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-parallel-policy-docs` は「不足または矛盾: なし」で pass した。
- **[非ブロッキング] aidlc-state.md の Code Generation ステータスはレビュー時点でまだ `[-]`（進行中）のままである。** stage 定義の Step 6（`[x]` へ更新）は本レビュー（reviewer ラウンド）の後に実行される想定であり、現時点の `[-]` は手戻りではなく、承認前レビューの正常な中間状態と判断する。ブロッキングではない。
