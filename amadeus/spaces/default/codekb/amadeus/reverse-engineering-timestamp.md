# リバースエンジニアリング実施記録

## 実行メタデータ（現在: 260731-open-bug-batch-4）

- Date: `2026-07-31T05:31:35Z`
- Base commit: `3f73823b1`（observed の祖先、`git merge-base --is-ancestor 3f73823b1 HEAD` exit 0）
- Observed commit: `6e7a9d701d7cf350310a047bc5b70ff18ed15272`
- Distance: `13 commits`
- 区間規模: `188 files changed, 6355 insertions(+), 424 deletions(-)`（`git diff --shortstat 3f73823b1..HEAD`、測定 ref = observed `6e7a9d701`）。面別内訳（`git diff --numstat` の機械集計）は `dist/` `52 files / +1661 / −171`、self-install 8面 `33 files / +1164 / −123`、`amadeus/` record `72 files / +2204 / −10`、`metrics/` `5 files / +286 / −2`、**ソース面 `26 files / +1040 / −118`**。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 4件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1811](https://github.com/amadeus-dlc/amadeus/issues/1811) P1/S2（`t-team-up-codex-resume.serial.test.ts` の fake supervisor stub が不死設計で、テスト終了後もプロセスが残留する）、[#1800](https://github.com/amadeus-dlc/amadeus/issues/1800) P3/S3（`t224-upstream-v2-migration-cli.test.ts:1411` の素の `status` 比較が spawn 失敗のセンチネル `-1` を診断不能な差分として表示する）、[#1797](https://github.com/amadeus-dlc/amadeus/issues/1797) P3/S4（`t259-guard-corpus.test.ts:108-109` の比 2.5 assert が逐次計測の別時間窓に立ち負荷変動で系統的にずれる）、[#1816](https://github.com/amadeus-dlc/amadeus/issues/1816) P3/S4（mirror Issue の close 経路が body を書かず、completion 境界の最終 body は Status が構造的に `Running` のまま残る）
- Scan mode: Developer の静的 live-code scan を上流入力とし、Architect が主要引用を observed commit で独立再確認する直列構成。テストは未実行（`#1811` のみプロセス残留のライブ実測あり）。
- 判定: **4件とも現存**。#1811 は本番 supervisor 側が fail-closed 実装済み（`packages/framework/core/tools/team-up-codex-safety-wait.ts:643` の `runRecordIsActive` ループ、`:561-582` の `catch` → `false`）であり、患部はテスト fixture 側に限局する。#1816 は close 経路の body 非書込（`packages/framework/core/tools/amadeus-mirror-executor.ts:1156-1159`）と completion 境界の Status 強制（`amadeus-mirror-lifecycle.ts:311-312`）の2機序が残存する。
- 区間の主要変化: 選挙ストアの pending ballot lane 新設（#1773 修正 `25f54b066` — `amadeus-election-store.ts` `+168/−10`、`pendingDir` `:113` / `readPending` `:139` / `appendPending` `:161` / `ballotKey` `:187` / `pendingNotOnLedger` `:197` / `integratePending` `:205`、tally 時に `:535` `:540` で統合）、選挙モデル view への question / 選択肢 description 搬送（#1772 修正 `75367ba67` — `amadeus-election-model.ts` `+36/−9`）、mirror boundary report の create 受理判定の反転（#1752 修正 `8a8abf567` — `succeededMirrorCreateExists`（`amadeus-mirror-state-codec.ts:1731`）新設と `amadeus-orchestrate.ts:4249` の `createRan` 化）、`release.yml` の再実行可能ジョブ分割（#1799 `b488466b8`、`+68/−22`）、7ハーネス `dot-gitignore` への pending lane 除外（各 `+5/−0`）、`v0.1.7` リリース（`e06b8f601`）。**core 正本の変更は選挙2モジュール・mirror 2モジュールに限局**し、sensors / hooks / scopes の構成は不変。
- 引用再確認の相違: Developer 報告の**所在・機序・結論は全件一致**。相違は (a) コミット数 = 13（報告 14。`git rev-list --count 3f73823b1..HEAD`） (b) 区間の numstat 各値 — 報告値は insertions+deletions の合算に見え、insertions 単独では `election-store +168`（報告 +178）/ `election-model +36`（+45）/ `release.yml +68`（+90）/ `t223 +76`（+77）/ `t236 +55`（+63）/ `t265 +120`（+137）/ `t234 +66`（+68）、`t373 +323` のみ完全一致 (c) `afterEach` は `:39-41`（報告 `:38-41`） (d) `expectSuccessfulMigration` 宣言は `:218`、診断配列は `:225-238`（報告 `:222-236`） (e) 収束判定は `:1038-1041`（報告 `:1039-1041`） (f) allowlist の presentation 行ピン5件のうち `renderMirrorIssueContent`（`:239-273`）と交差するのは `245-247`（直撃）と `266-271`（下方シフト）の**2件**であり、`193-194` / `230-234` / `237-239` は同関数より上方に位置するため挿入位置が `:239` より下なら不変（報告「直撃3件+シフト2件」）。いずれも修正方針に影響しない。
- 現在マーカーの降格: 直前の現在断面 `260730-open-bug-batch-3`（observed `3f73823b1`）を本節の新設に伴い履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Base 選定根拠: 前 intent の observed `3f73823b1` は `origin/main` 系譜のコミットとして記録されており（`cid:reverse-engineering:c2-observed-mainline-commit` の実践）、今回**初めて祖先性が保たれた**（`git merge-base --is-ancestor 3f73823b1 HEAD` exit 0、距離13）。merge-base 復元は不要だった。本 intent の observed `6e7a9d701` も `origin/main` 系譜のコミットである。
- Updated artifacts: 実質更新8件 = `architecture.md`（4バグの機構節 + 区間の構造変化）、`code-structure.md`（患部配置・区間の機械集計）、`code-quality-assessment.md`（根因確度と品質所見）、`business-overview.md`（利用者影響と delivery boundary）、`component-inventory.md`（対象コンポーネントと修正面）、`api-documentation.md`（4件が触れる内部契約）、`technology-stack.md`（構成カウントの変化）、`dependencies.md`（Bolt 間の交差判定 — 4件とも並行可・条件2点）。加えて本ファイルと per-intent `re-scans/260731-open-bug-batch-4.md`。
- テスト採番予約: 空き最大は `t373`（`t372` は欠番）。本 intent は `t374`（#1811）/ `t375`（#1800）/ `t376`（#1797）を予約し、#1816 は既存 `tests/unit/t281-amadeus-mirror-presentation.test.ts` へのケース追加とする（`cid:code-generation:swarm-test-number-reservation`）。`t372` の欠番は埋めない。
- Per-intent record: `re-scans/260731-open-bug-batch-4.md`。

## 実行メタデータ（履歴: 260730-open-bug-batch-3）

- Date: `2026-07-30T23:40:33Z`
- Base commit: `a38a1f4d3`（observed の祖先、`git merge-base --is-ancestor a38a1f4d3 HEAD` exit 0）
- Observed commit: `3f73823b1cf5969836faa22dfa333b48b933f2fc`
- Distance: `25 commits`
- 区間規模: `588 files changed, 52675 insertions(+), 27351 deletions(-)`。生成面（`dist/`）・self-install 6面・`amadeus/` record・`metrics/` を除くソース面は `98 files changed, 9531 insertions(+), 2532 deletions(-)`。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 3件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1773](https://github.com/amadeus-dlc/amadeus/issues/1773)（未開票中の全票本文が単一共有 tracked ファイル `ledger.json` に平文で載り blind 性が格納面から破れる）、[#1772](https://github.com/amadeus-dlc/amadeus/issues/1772)（配布ビューに設問文が無く選択肢の説明が parse 時に無音 drop される）、[#1752](https://github.com/amadeus-dlc/amadeus/issues/1752)（mirror boundary report の create 拒否条件が ask の指示と自己矛盾する）
- Scan mode: Developer の静的 live-code scan を上流入力とし、Architect が主要引用を observed commit で独立再確認する直列構成。テストは未実行。
- 判定: **3件とも現存**。#1752 は本区間で着地した #1791（`ffb68c484`、`intent-initialized` boundary の新設）の後も再現経路が温存されていることを `amadeus-orchestrate.ts:486-500` の実読で確認した。
- 区間の主要変化: 自動起票 finding capability の新設（#1744 `d56e76ddd` — GitHub 汎用ゲートウェイ・階層設定リゾルバ・`gh` spawn の単一不純エッジを mirror 専用実装から抽出、新キー `auto-file-findings`）、sensor 発火 scope の exact-path allowlist 化（#1758 / #1770 — 前 intent #1742 の構造的解決）、degrade unit の engine 側一意解決（#1774 — 前 intent #1711 の解決）、mirror initial-create boundary の新設（#1791 — 前 intent #1750 の解決）、metrics 公開パイプライン（#1761）、phase-check 正名化と auto-solo 選挙フックの protocol 焼き込み（#1776 / #1782 — 前 intent #1749 / #1735 の解決）。**core tools は base `79` → observed `88`（新規9件）**、sensors `7` / hooks `12` / scopes `10` はいずれも不変。
- 引用再確認の相違: Developer 報告の主要引用は**全件所在一致**（appendBallot の ledger 書込・materialize の blind lift・`Choice` 型・`parseChoices` の無音 drop・`DistributionView` のキー集合・`t234` の3重固定・report 拒否条件・`SKILL.md:18` / `:51`・tracked `ledger.json` 183件・`git check-ignore` exit 1）。行**範囲**表記に3点の精密化 — (a) #1791 の prompt 降格は `:488`（報告 `:479`。分岐全体は `:486-500`、`initialCreateIsOutstanding` 宣言は `:373`） (b) #1752 の拒否条件は条件式 `:4252-4256` のうち患部節が `:4255`、state 再評価は `:4241-4242`（報告 `:4251-4255` / `:4242`） (c) `t265` の fixture 行は `:793`（報告 `:791-810` は周辺ブロック）。いずれも所在・意味論は一致し結論に影響しない。加えて1点の精密化: Developer の「`.claude/hooks/` に ledger 配信機構 0件」は結論として正しいが、`grep -rn 'ledger' .claude/hooks/` は**3ヒットする**（`amadeus-mint-presence.ts:4` / `:37`、`amadeus-audit-logger.ts:67`）。全件を実読し、いずれも監査シャードの append-only ledger を指す語彙で選挙 ledger と無関係と確定した（`cid:requirements-analysis:absence-claim-grep-verify`）。
- 追加所見（Developer 報告外）: 本区間で追加されたテストに**番号重複が3組**ある（`t366` = 3ファイル、`t367` = 2ファイル、`t368` = 3ファイル。`ls tests/integration tests/unit` の実測）。`cid:code-generation:swarm-test-number-reservation` が守られなかった実測であり、本 intent の新規テスト採番は `t371` より後を使う。テスト引用は `tNNN` 短形でなくフルパスで書く（`cid:requirements-analysis:mechanism-cite-verify-at-draft` 追補）。
- 現在マーカーの降格: 直前の現在断面 `260730-open-bug-batch-2`（observed `c42ef4d77`）を本節の新設に伴い履歴へ全文保存のまま降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Base 選定根拠: 記録済みの observed 3件（`c42ef4d77` / `278d61d8e` / `22ee27dbe`）はいずれも現 HEAD の**祖先ではない**。squash マージ運用で record ブランチの observed が `main` に残らない既知現象であり、`cid:reverse-engineering:rescan-base-ancestry`（祖先性を判定してから base を採用）に従い merge-base 復元で `a38a1f4d3` を採用した（`git merge-base --is-ancestor a38a1f4d3 HEAD` exit 0、距離25）。本 intent の observed `3f73823b1` は `origin/main` 系譜のコミットであり、次回 RE での非祖先化を避ける（`cid:reverse-engineering:c2-observed-mainline-commit`）。
- Updated artifacts: 実質更新8件 = `architecture.md`（3バグの機構節 + 区間の構造変化）、`code-structure.md`（患部配置・区間の機械集計・テスト番号重複）、`code-quality-assessment.md`（根因確度と品質所見8件）、`business-overview.md`（利用者影響と delivery boundary）、`component-inventory.md`（対象コンポーネントと新規9モジュール）、`api-documentation.md`（3件が触れる内部契約と区間の新契約）、`technology-stack.md`（構成カウントの変化 core tools 79→88）、`dependencies.md`（Bolt 間の交差判定 — #1773 × #1772 が**交差する**）。加えて本ファイルと per-intent `re-scans/260730-open-bug-batch-3.md`。
- Per-intent record: `re-scans/260730-open-bug-batch-3.md`。

## 実行メタデータ（履歴: 260730-open-bug-batch-2）

- Date: `2026-07-30T15:34:39Z`
- Base commit: `8b8016f62`（observed の祖先、`git merge-base --is-ancestor 8b8016f62 HEAD` exit 0）
- Observed commit: `c42ef4d77ef79d4230efe4fdac5d0d7abf7155f2`
- Distance: `12 commits`
- 区間規模: `116 files changed, 4276 insertions(+), 181 deletions(-)`。生成面（`dist/`）・self-install 面・`amadeus/` record を除く比較断面は `26 files changed, 997 insertions(+), 81 deletions(-)`。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 5件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1750](https://github.com/amadeus-dlc/amadeus/issues/1750)（Ideation SKIP スコープで初回 auto-mirror create が Inception 完了まで遅延）、[#1749](https://github.com/amadeus-dlc/amadeus/issues/1749)（phase boundary 成果物名の不一致）、[#1742](https://github.com/amadeus-dlc/amadeus/issues/1742)（非成果物へのステージセンサー発火）、[#1735](https://github.com/amadeus-dlc/amadeus/issues/1735)（codex ハーネスで auto-solo-election が不発）、[#1734](https://github.com/amadeus-dlc/amadeus/issues/1734)（promote:self の scope-grid キー順 churn）
- Scan mode: Developer の静的差分スキャンを上流入力とし、Architect が主要引用を observed commit で独立再確認する直列構成。テストは未実行。
- 区間の主要変化: degrade スコープの per-unit directive で `{unit-name}` を実ディレクトリへ解決（#1760 `e839b20ce`、`degradeUnitDirectories()` / `degradeUnitResolutionError()` 新設）、SKILL.md の new-work 経路ツール名修正（#1753 `042237263`）、TLC 標準モジュール parse の tmpdir 追従（#1745 `8bb81c2e7`）。残りは前 intent の record 同期・dist 畳み込み・metrics スナップショット。
- 引用再確認の相違: Developer 報告の主要引用は**全件一致**（boundary 4種・intent-capture 発行元・phase-check 正準名・誤記18ファイル・センサー matches-only フィルタ・election 2箇所・SKILL.md 唯一所在・promote-self 非対称・HEAD churn 非再現）。関数の行**範囲**表記に3点の軽微な精密化 — (a) `scopeGridInSync` は `:130-142`（報告 `:130-144`） (b) `mergeScopeGrid` は `:147-160`（報告 `:147-159`） (c) `hasPersistedMirrorBoundary` は宣言 `:359`・呼び出し `:464`（報告は `:458-465` として呼び出し側のみを指していた）。いずれも所在・意味論は一致し、結論に影響しない。
- 現在マーカーの降格: 直前の現在断面 `260730-skill-reviewer-fixes`（observed `278d61d8e`）を本節の新設に伴い履歴へ降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Base 選定根拠: 直前の現在節が宣言する observed `278d61d8e` は現 HEAD の**祖先ではない**（`git merge-base --is-ancestor` exit 1）。その前の `22ee27dbe` も同様に非祖先（exit 1）。squash マージ運用で record ブランチの observed が `main` に残らない既知現象であり、`cid:reverse-engineering:rescan-base-ancestry`（祖先性を判定してから base を採用）に従い、HEAD の祖先である `8b8016f62` を差分 base として採用した。
- Updated artifacts: 実質更新4件 = `architecture.md`（5バグの機構節）、`code-structure.md`（患部配置と区間の構造変化）、`code-quality-assessment.md`（根因確度と品質所見6件）、`business-overview.md`（利用者影響と delivery boundary）。判断1行のみ4件 = `technology-stack.md` / `component-inventory.md` / `api-documentation.md` / `dependencies.md` — 本区間で構成カウント・コンポーネント集合・公開契約・依存方向のいずれも変化がなく、5バグはすべて既存構成内の欠陥のため、現在マーカーの整合（`cid:reverse-engineering:c3-relabel`）を保つ目的で判断1行の現在節のみを置いた。加えて本ファイルと per-intent `re-scans/260730-open-bug-batch-2.md`。
- Per-intent record: `re-scans/260730-open-bug-batch-2.md`。

## 実行メタデータ（履歴: 260730-skill-reviewer-fixes）

- Date: `2026-07-30T12:39:53Z`
- Base commit: `22ee27dbef9027203658a6cd98bf97501c4b222c`（observed の祖先、`git merge-base --is-ancestor` exit 0）
- Observed commit: `278d61d8efcea278bfefd2b384c22fcf72e717ab`
- Distance: `34 commits`
- 区間規模: `951 files changed, 54850 insertions(+), 8428 deletions(-)`。生成面（`dist/`）・self-install 面・record を除く比較断面は `340 files changed, 16513 insertions(+), 2547 deletions(-)`。
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`
- Delivery boundary: 2件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1736](https://github.com/amadeus-dlc/amadeus/issues/1736)（SKILL.md が new-work 経路で `amadeus-utility.ts next --new-intent` を指示するツール名誤り）、[#1711](https://github.com/amadeus-dlc/amadeus/issues/1711)（units-generation SKIP スコープで `{unit-name}` が未解決のまま reviewer-runtime へ渡り produces 実在検査で落ちる）
- Scan mode: Developer の静的差分スキャンを上流入力とし、Architect が主要引用を observed commit で独立再確認する直列構成。テストは未実行。
- 区間の主要変化: `bugfix` → `fix` スコープ改名と `self-*` スコープ4種の dogfood 5ハーネス自己インストール面への集約（新センサー `amadeus-self-scope-consistency` 付き）、Kimi subagent の caller-authorization 拒否層の新設、mirror boundary 自動発火とワークフロー完了の2相化。core tools は base 76 → observed 79（新規3件）、sensors は 6 → 7。
- 引用再確認の相違: Developer 報告の3点を observed で訂正した — (a) `amadeus-utility.ts` の `default:` は `:6182`（報告の `:6179` は不一致、`switch (subcommand)` = `:6088` は一致） (b) `stage-protocol.md` の「unchanged directive JSON」規定は `:898`（報告の `:897` は不一致） (c) `amadeus-mirror-policy.ts` と `team-up-codex-safety-wait.ts` は **新設ではなく既存の変更**（`git diff --name-status 22ee27dbe 278d61d8e` で両者 `M`、base にも実在）。本区間の新規 core tool は `amadeus-caller-authorization.ts`（122行）、`amadeus-sensor-self-scope-consistency.ts`（231行）、`amadeus-workflow-completion.ts`（110行）の3件のみ。
- 現在マーカーの降格: 直前の現在断面 `260729-open-bug-batch`（observed `22ee27dbe`）を本節の新設に伴い履歴へ降格した（`cid:reverse-engineering:c3-relabel`）。共有 codekb 8成果物の line 3 現在ヘッダも同様に降格し、本 intent 断面を新しい現在節として追記した。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。
- Updated artifacts: `technology-stack.md`、`component-inventory.md`、`architecture.md`、`api-documentation.md`、`code-structure.md`、`business-overview.md`、`dependencies.md`、`code-quality-assessment.md`、本ファイル、および per-intent `re-scans/260730-skill-reviewer-fixes.md`。
- Per-intent record: `re-scans/260730-skill-reviewer-fixes.md`。

## 実行メタデータ（履歴: 260729-open-bug-batch）

- Date: `2026-07-29T07:06:38Z`
- Base commit: `ca8ff0af40d6250edffe42246d3f5538819c22af`（observed の祖先、`git merge-base --is-ancestor` exit 0）
- Observed commit: `22ee27dbef9027203658a6cd98bf97501c4b222c`
- Distance: `13 commits`
- 区間規模: `624 files changed, 71100 insertions(+), 26206 deletions(-)`。生成面・record・metrics等を除く比較断面は `215 files changed, 16982 insertions(+), 7844 deletions(-)`。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`、Depth `Minimal`、Test Strategy `Comprehensive`
- Delivery boundary: 6件を1 Intentで追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)
- Focus: [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667)、[#1664](https://github.com/amadeus-dlc/amadeus/issues/1664)、[#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)、[#1662](https://github.com/amadeus-dlc/amadeus/issues/1662)、[#1336](https://github.com/amadeus-dlc/amadeus/issues/1336)、[#1607](https://github.com/amadeus-dlc/amadeus/issues/1607)、および進行中 OTel Intent [#1679](https://github.com/amadeus-dlc/amadeus/issues/1679) との衝突。
- Scan mode: Developer の静的 live-code scan を完全な上流入力として使った differential refresh。Architect は主要引用（timeout 120/180秒、t224診断欠落、parallel checkout status、coverage diff、safety-wait 50ms、completion→audit seal）と区間/件数を observed commit で再確認した。テストは未実行。
- 区間の主要変化: Intent Mirror Project 同期スタック、Bun-only test runner 契約、CLI/SDK/TUI test mechanisms、gated/unset swarm routing、番号回答の意味解決。#1607 / #1664 はこの最新 mirror/journal 断面を基準にする。
- OTel 分離: 別 worktree `otel-improvement` は source 未変更で、未コミットの CodeKB は latest reachable trunk ではない。内容を読まず、本 scan へ混ぜていない。衝突評価は Developer scan の source-level 分析だけを採用した。
- Working tree: 本 scan 開始時点で `amadeus/spaces/default/intents/intents.json` と `260729-open-bug-batch/` に別作業の未コミット変更が存在した。これらを変更・復元せず、CodeKB 9成果物と本 intent の re-scan 記録だけを更新した。
- Updated artifacts: `business-overview.md`、`architecture.md`、`code-structure.md`、`api-documentation.md`、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`reverse-engineering-timestamp.md`。
- Per-intent record: `re-scans/260729-open-bug-batch.md`。

## 実行メタデータ（履歴: 260728-slop-cleanup）

- Date: `2026-07-28`
- Base commit: `none`（既存 codekb の最新 observed `afb93a825...` は現 HEAD の祖先ではなく、差分 base として不適格。現 HEAD の実測を正とした）
- Observed commit: `ca8ff0af40d6250edffe42246d3f5538819c22af`
- Release reference: `v0.1.6` = `68f2d6699ccb8148c0427b1ff56d37116e565f89`（observed の祖先、`v0.1.6..observed` は 47 commits、1,939 files changed、188,699 insertions、830,609 deletions）
- Scope: `amadeus-bugfix`、Minimal、Brownfield、単一 repo `amadeus`
- Focus: 5 パス・3 カテゴリの確定 Slop — `amadeus-journal.ts` の失効コメント、`amadeus-observability.ts` の未使用 `registered`、Markdown 3 件の空白診断
- Scan summary: Bun/TypeScript の既存構造、7 harness 面、正本 + 7 dist + 5 self-install の同期境界、対象 test / lint / typecheck を確認。HTTP server / database はなく、外部境界は CLI、GitHub、OTLP/HTTP JSON
- 更新成果物: 共有 codekb 9 件と per-intent `re-scans/260728-slop-cleanup.md`
- Sensor 代替: codekb path が既存 sensor filter と一致しないため成功とは扱わず、10 ファイルの H2 数、競合マーカー、現在マーカー、Mermaid 構文、対象パス限定 `git diff --check` を機械確認する

## 実行メタデータ（履歴: 260727-plugin-verb-skills）

- Date: `2026-07-28`
- Base commit: `0c4709102cfa1d13e5aca6b49c65f31a903d72f2`（前 intent `260727-e2e-plugin-conformance` の observed。`git merge-base --is-ancestor 0c4709102 HEAD` **exit 0 = 祖先**、`git rev-list --count 0c4709102..HEAD` = **16**。cid:reverse-engineering:rescan-base-ancestry)
- Observed commit: `afb93a825917220660a3d9bbfdb23d83474b94a6`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `plugin-dev`、ブランチ `worktree-plugin-dev`）
- 区間規模: `git diff --shortstat 0c4709102..HEAD` = **192 files changed, 5529 insertions(+), 956 deletions(-)**（測定 ref: observed `afb93a825`）。record 除外は `git diff --name-only 0c4709102..HEAD | grep -vc '^amadeus/'` = **161**。面別内訳は `git diff --name-only 0c4709102..HEAD | awk -F/ '{print ($2!=""? $1"/"$2 : $1)}' | sort | uniq -c | sort -rn` 出力の転記で `amadeus/spaces` **31**（record）/ `docs/reference` **22** / `docs/guide` **18** / `tests/integration` **9** / `dist/{opencode,kiro-ide,kiro,kimi,cursor,codex,claude}` 各 **7** / `packages/framework` **6** / `dist/plugins` **6** / `tests/unit` **4** / `.{opencode,kimi-code,cursor,codex,claude}/tools` 各 **4** / `docs/harness-engineering` **2**。
- 区間の内訳: 主系統は `git log --oneline 0c4709102..HEAD` 転記で **`f1d561904`（[PR #1596](https://github.com/amadeus-dlc/amadeus/pull/1596) 積み残し 7 Issue バッチ）** — #1591 裁定 B のホストルート統一 / #1592 の 2 段 recompile / #1586 の FS 実測 baseline / #1585 の doctor レンダラ一本化 / #1575 の定数一本化 / #1589 の t341 E2E + 専用 blocking CI ジョブ。これに release `68f2d6699`（**v0.1.6**）、docs 3 本（`3eba39a90` #1584 / `d5e8912f0` #1587 / `daa18009e` #1600）、metrics スナップショット `713fe139b`（#1599）が続く。**前 intent（260727-e2e-plugin-conformance）が要件化した 4 Issue はこの区間で全て着地済み**であり、本 scan はその着地後断面を確定する。
- Scope: `amadeus-feature`（intent `260727-plugin-verb-skills`）、Brownfield、単一 repo `amadeus`
- Focus: plugin 面の **CLI 動詞体系とスキル面**（plugin 導入 UX の CLI/スキル層）。走査対象は (a) `amadeus-plugin.ts` の動詞・結果 union・exit code 規約とエントリ 3 層 (b) `amadeus-utility.ts` の subcommand dispatch と `plugin` 委譲の不在 (c) `amadeus-runner-gen.ts` の runner 生成入力とドリフト検査（compose 済みホストでの `check` 破綻 = [#1598](https://github.com/amadeus-dlc/amadeus/issues/1598) の機序）(d) スキル正本 `packages/framework/core/skills/` の投影行列。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。差分区間 + 本 intent の対象面（plugin CLI / utility dispatch / runner-gen / skills 投影）に限定して走査した。上流入力は Developer スキャン結果（実測済みスキャンノート、全文読了）。
- 主要な確定事項: (A) **plugin CLI は 4 動詞のみ**（`compose` / `drop` / `doctor` / `status`、`amadeus-plugin.ts:71-75` 判別 union・`:100-106` USAGE・`:146-153` `parsePluginCliArgs`）で `install` 動詞は不在。結果 union は `:87-94` の 7 値、exit code 規約は `renderPluginCliResult:645-670`（成功 0 / doctor は degraded で 1 / usage-error 2 / failure 1）、エントリは `runPluginCli:634-642` → `renderPluginCliResult:645` → `handlePluginCli:674-676`（in-process seam）→ `:678` `import.meta.main` の 3 層。 (B) **ホストルートが `#1591` 裁定 B で統一された** — `defaultPluginHostRoot:293-297` / `pluginHostRootFromHook:305-311` / エンジン読取 `amadeus-graph.ts:pluginsHostRoot:2021-2023` が同じハーネスディレクトリへ解決する。 (C) **recompile が 2 段化された**（`spawnRecompile:253-263` が `amadeus-graph.ts compile` → `amadeus-runtime.ts compile` の順、いずれか失敗で false）。 (D) **`amadeus-utility.ts` に `plugin` case は存在しない**（`switch (subcommand)` `:5945`、`grep -n '"plugin"'` = **0 hit**）— 委譲型の先例は `handleMigrate:5900` のみ。 (E) **runner-gen は plugin stage を識別できない** — `isRunnableStage:88-90` は `phase !== "initialization"` のみを見るため、compose 済みホストでは plugin stage が runnable と判定され `handleCheck:363-385` が MISSING で exit 1 になる（#1598 の機序）。 (F) **スキル投影は manifest 側の明示選択**で自動ではない — `amadeus-mirror` は 7 面すべて、`amadeus-election` は claude / codex / kimi の **3 面のみ**（`find dist -type d -name amadeus-election` 実測）。
- Architect 段の独立再検証と **訂正 3 件**: 上流スキャンノートの記述を observed `afb93a825` に対して spot-check し、次の 3 点を訂正した — (1) `amadeus-plugin-compose.ts` の行数は **1488**（`wc -l` 実測。従前成果物および上流の 1469 は失効） (2) SessionStart hook 正本 `core/hooks/amadeus-plugin-compose.ts` は **25 行**（同上、従前の 23 は失効） (3) 区間の record 除外ファイル数は **161**（`grep -vc '^amadeus/'` 実測、上流の 159 は不一致）。その他の核心 file:line（`amadeus-plugin.ts:71-75`/`:100-106`/`:146-153`/`:159-174`/`:195-197`/`:206`/`:253-263`/`:265-282`/`:293-297`/`:305-311`/`:313-316`/`:322`/`:329-331`/`:368`/`:401`/`:457`/`:472`/`:634-642`/`:645-670`/`:674-676`/`:678`、`amadeus-utility.ts:5945`/`:6033`/`:216`/`:5900`、`amadeus-runner-gen.ts:75-77`/`:88-90`/`:118`/`:342`/`:363`、`amadeus-graph.ts:1666`/`:2021-2023`、`plugin-projection.ts:42`/`:56`/`:64`/`:584`/`:598`、`promote-self.ts:37`/`:186`、`t129:203-208`/`:221`、`ci.yml:146`/`:165`/`:678`）は直読一致で **訂正 0 件**（cid:reverse-engineering:cite-shift-vs-nonshift-separation）。
- 測定 ref: 本節および本 scan で更新した全成果物の数値・SHA・file:line は observed `afb93a825` での `git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --shortstat` / `git diff --name-only … | awk | sort | uniq -c` / `git log --oneline` / `git ls-files … | grep -c` / `grep -n` / `sed -n` / `find` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 更新した成果物（9 件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md`（#1596 着地後の plugin アーキテクチャ = ホストルート統一・2 段 recompile・E2E/CI 面の新節、旧「現在」節は履歴降格）/ `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` / `api-documentation.md` / `business-overview.md` / `technology-stack.md` / `dependencies.md`。旧「現在」マーカー（`260727-e2e-plugin-conformance`）は本ファイルおよび body 4 成果物（`architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md`）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。**履歴節の当時記述（4 Issue が未解消だった断面）は削除せず保存**する。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter に構造的に不適合で発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として更新 9 成果物へ `grep -c '^## '`（H2 ≥ 2）と正準 3 語彙の conflict マーカー検査（ヒット 0、cid:code-generation:conflict-marker-grep-before-commit）を機械実行した。
- Delivery boundary: 本 scan は codekb 9 成果物の差分更新のみを成果物とし、コード・テスト・CI 設定・生成配布物・intent record / state / audit・GitHub Issue への書込は一切行わない。設計判断（`plugin` を `amadeus-utility` の subcommand へ委譲するか / plugin 動詞にスキル面を与えるか / #1598 の runner-gen 除外機構をどこへ置くか）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260727-e2e-plugin-conformance）

- Date: `2026-07-27`
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（intent 指定。`git merge-base --is-ancestor 1673c433209c74820881c75a0816bbce3fb2d512 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c433..HEAD` = **60**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `0c4709102cfa1d13e5aca6b49c65f31a903d72f2`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `plugin-dev`、ブランチ `worktree-plugin-dev`）
- 区間規模: `git diff --shortstat 1673c433..HEAD` = **1830 files changed, 316726 insertions(+), 7366 deletions(-)**（測定 ref: observed `0c4709102`）。面別内訳は `git diff --name-only 1673c433..HEAD | awk -F/ … | sort | uniq -c | sort -rn` 出力の転記で `amadeus/spaces/default` **639**（record）/ `dist/kimi` **301** / `.kimi-code` **296** / `docs` **73** / `tests/integration` **64** / `tests/unit` **48** / `dist/plugins` **37** / `.claude` **29** / `.opencode` **27** / `.cursor` **26** / `.codex` **26** / `dist/{opencode,kiro-ide,kiro,codex,claude}` 各 **25** / `packages/framework/core` **24** / `dist/cursor` **24** / `metrics` **20** / `packages/framework/harness` **17** / `tests/fixtures` **13** / `scripts` **8** / `packages/setup/src` **6** / `tests/smoke` **3** / `tests/e2e` **2** / `plugins` **2** / `tests/conformance` **1**。
- 区間の内訳: 大半は (a) intent record **639** (b) 第 7 ハーネス Kimi Code の着地（`dist/kimi` 301 + `.kimi-code` 296、#1522）(c) 全ハーネス dist 再生成。plugin/E2E に関わる主系統（`git log --oneline 1673c433..HEAD` 転記）は `f8fe817c5`（#1554 plugin walking skeleton — engine relocation / CLI / claude projection / auto-compose hook）、`a03944748`（#1568 U3-U8 全 7 ハーネス追従 — 全面投影・フック配線・doctor 観測・activation policy・適合スイート・docs）、`0e21b7c08`（#1569 INSTALL.md のコピー先を `.amadeus-plugin-src/` へ整合）、`499a65488`（#1518 discovery の dangling symlink スキップ）、`1edf2abfb`（#1535 discovery overhead ゲートを比率 AND 絶対 floor へ）。**`tests/e2e/` の区間変更は 2 ファイルのみ**（`t-print-kimi-doctor.serial.test.ts` / `t-print-kimi-status.serial.test.ts`）で、plugin 二大着地は e2e 層に一切テストを追加していない — これが #1589 の一次事実。
- Scope: `amadeus-bugfix`（intent `260727-e2e-plugin-conformance`）、Brownfield、単一 repo `amadeus`
- Focus: 4 Issue — **#1575**（`PACKAGE_HARNESSES` 同名 export の値衝突: `scripts/promote-self.ts:184` の 5 値 vs `scripts/plugin-projection.ts:42-50` の 7 値。5 値の canonical は `plugin-projection.ts:56` `SELF_INSTALL_HARNESSES`）、**#1585**（standalone doctor が 0-plugin ホストで exit 0 / stdout 0 バイト。`amadeus-plugin.ts:591-593` が 0 件 degrade を持つ `doctorPluginRows:534-536` を通らない）、**#1586**（drop 後に `plugins/<name>/stages/` 等 3 階層が空ディレクトリとして残存。`amadeus-plugin-compose.ts:1150` mkdir recursive ⇔ `:1154` rm ファイルのみの非対称。判定側 `amadeus-plugin.ts:377` は record のみを見る）、**#1589**（plugin の e2e 検証面が不在: `git ls-files tests/e2e/ | grep -c plugin` = **0**、plugin テスト計 **24** は全て unit/integration/fixtures）。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。差分区間 + 本 intent の対象面（plugin / doctor / drop / E2E / 配布面）に限定して走査した。上流入力は Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`（594 行、全文読了）。
- 主要な確定事項: (A) **plugin 現行アーキテクチャ**は projection（`scripts/plugin-projection.ts` → `dist/plugins/` 中立バンドル + 7 面 `INSTALL.md`）→ discovery（staging root `amadeus-plugin.ts:277` `.amadeus-plugin-src`）→ CLI 4 動詞 → 合成エンジン → graph discovery（`amadeus-graph.ts:2011-2013`）→ orchestrate 到達（`amadeus-orchestrate.ts:1017-1034` / 呼び出し `:2289`）の一方向連鎖で、SessionStart auto-compose hook（正本 `core/hooks/amadeus-plugin-compose.ts`、**23 行**の薄いラッパ）が `dist/claude/.claude/settings.json.example:34-46` に配線される。 (B) **ホストスナップショットにディレクトリ語彙が無い**（`amadeus-plugin.ts:204-223` はファイルのみ）ため計画層・検証層のどこにも #1586 を捕捉する概念がない。 (C) **既存 plugin テストの盲点 4 種** — recompile スタブ（`t299:75-78`、ヘッダ `:1-13` が自認）、`hashSurface` のファイルバイト限定（`t299:88-101`、`:94-97` で空ディレクトリを構造的に無視）、e2e 0 件、出荷面（dist コピー）を読むテストが 0 件（唯一の spawn `t299:206` も正本パス）。 (D) **e2e は既定 CI で走らない** — `tests/run-tests.ts:125`（`--ci` = smoke+unit+integration）/ `:126`（`--release` = +e2e）、`.github/workflows/ci.yml:163` = `bun run test:ci -- -P 4` のみ。tests/e2e/ に置くだけではリグレッションガードにならず、実行トリガーを要件で決める必要がある。 (E) **tests/e2e/ の既習様式は 2 系統** — 出荷 dist ツリーを tmp へコピーして駆動する live gate 付き（`t-print-kimi-doctor.serial.test.ts:1-37`、Kimi クレジット消費・既定 skip）と、実バイナリ spawn + fetch shim のオフライン既定（`setup-install.test.ts:1-19`）。#1589 は後者の様式に載せうる。
- 測定 ref: 本節および本 scan で更新した全成果物の数値・SHA・file:line は observed `0c4709102` での `git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --shortstat` / `git diff --name-only … | awk | sort | uniq -c` / `git log --oneline` / `git ls-files … | grep -c` / `grep -n` / `sed -n` / `find` / `ls … | wc -l` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer コードスキャン結果 `scan-notes.md`。Architect 段の独立再検証で核心の file:line・件数を observed `0c4709102` に対して spot-check し **訂正 0 件**（`amadeus-plugin.ts:277`/`:377`/`:534-536`/`:591-593`、`amadeus-plugin-compose.ts:1149-1156`（`:1150` mkdir / `:1154` rm）、`promote-self.ts:184`、`plugin-projection.ts:42`/`:56`、`amadeus-orchestrate.ts:913`/`:1017-1019`/`:2289`、`amadeus-graph.ts:2011-2013`、`t299:94-97`/`:205-208`、`run-tests.ts:125-126`、`ci.yml:163`、`settings.json.example:34-46`、`dist/plugins` 10 ファイル、行数 613/1469/295/23、plugin テスト 24 / e2e 83 / serial 35 / e2e-plugin 0 をいずれも直読・コマンド出力で一致確認。cid:reverse-engineering:cite-shift-vs-nonshift-separation）。
- 更新した成果物（9 件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md`（plugin 現行アーキテクチャと 4 Issue の欠陥所在の新節）/ `code-quality-assessment.md`（テスト層の盲点 6 シグナルと e2e 既習様式の新節）/ `code-structure.md`（区間の面別内訳と対象ファイル配置の新節）/ `component-inventory.md`（実行系・検証系コンポーネント棚卸しの新節）/ `business-overview.md` / `technology-stack.md` / `dependencies.md` / `api-documentation.md`（以上 4 件は本 intent 断面の追記）。旧「現在」マーカー（`260727-install-doc-mismatch`）は本ファイルおよび body 4 成果物（`architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md`）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として更新 9 成果物へ `grep -c '^## '`（H2 ≥ 2）と、正準 3 語彙（開始・終了・diff3 base の各マーカー）による conflict マーカー検査（ヒット 0、cid:code-generation:conflict-marker-grep-before-commit）を機械実行した。
- Delivery boundary: 本 scan は codekb 9 成果物の差分更新のみを成果物とし、患部コード（`amadeus-plugin.ts` / `amadeus-plugin-compose.ts` / `promote-self.ts`）・テスト・CI 設定・生成配布物・intent record / state / audit・GitHub Issue への書込は一切行わない。修正方式（#1575 の canonical 統合先、#1585 の standalone レンダラ是正形、#1586 の除去側対称化 vs `baselineRestored` の FS 実測化、「baseline 復元」にエンジン dot-state を含めるかの境界定義、#1589 の e2e 様式選択と実行トリガー）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260727-install-doc-mismatch）

- Date: `2026-07-27`
- Base commit: `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`（前 intent `260726-plugin-host-delivery` の observed。`git merge-base --is-ancestor 0d83aa48b886fe85cd977569c0e7b3015b84d3e5 HEAD` **exit 0 = 祖先**、`git rev-list --count 0d83aa48b..HEAD` = **70**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `46a75f2e7c53aaa475a19cc217d10c9172ad4129`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `fix-plugin`、ブランチ `fix/plugin`）
- 区間規模: `git diff --name-only 0d83aa48b..HEAD | wc -l` = **458 files**（測定 ref: observed `46a75f2e7`）。面別内訳は `git diff --name-only 0d83aa48b..HEAD | awk -F/ '{print $1"/"$2}' | sort | uniq -c` 出力の転記で amadeus/spaces **192** / dist **111**（うち `dist/plugins` **37**）/ tests **55**（integration 32 / unit 16 / smoke 2 / conformance 1 / harness 1）/ packages/framework **16**（core 10・harness 6）/ .kimi-code **16** / .claude **13** / docs **12** / .cursor **10** / .codex **10** / .opencode **9** / scripts **4** / plugins **2**。
- 区間の内訳: **本区間はほぼ全体が前 intent `260726-plugin-host-delivery`（plugin ホスト配信）の Construction である。** 前回 RE（observed `0d83aa48b`）は同 intent の inception 段で実施されており、その時点では plugin-composition / `dist/plugins` / トップレベル `plugins/` は**未着地**（前節が「区間内で完全に無変更」と記録したとおり）だった。本区間 `0d83aa48b..46a75f2e7` はその Construction 本体（U2–U8）を含み、`dist/plugins`（7面 install bundle）・`plugins/`（authoring source）・composition engine の core 再配置がすべて**この区間で新規着地**した。主系統（`git log --oneline 0d83aa48b..HEAD` より）: U2 walking-skeleton + engine core 再配置（`f8fe817c5` / [PR #1554](https://github.com/amadeus-dlc/amadeus/pull/1554)）、U3 host-projection-all（`250265adb`、§12a 是正 `30b3afc99`）、U4 hook-wiring（`a6b20dfe4`）、U5 doctor（`a0b15e1ab`）、U6 activation-policy（`8ae1ef058`）、U7 conformance（`14b004f55`、t188）、U8 docs-sync（`60eb7517e` / `4858fb8d7`）。周辺: promote-self kimi 配線（`e688c9f79` / `f1905d7cd`）、mirror 非対称是正 [#1553](https://github.com/amadeus-dlc/amadeus/issues/1553)（`82df115ae`）、t177 flake 修正 [#1565](https://github.com/amadeus-dlc/amadeus/pull/1565)（`46a75f2e7`）。
- Scope: `amadeus-bugfix`（intent `260727-install-doc-mismatch`）、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1569](https://github.com/amadeus-dlc/amadeus/issues/1569) — plugin の **INSTALL.md / docs が案内するコピー先** と **CLI discovery が実際に走査するステージング先** の不一致。ユーザー裁定 **A**（installDoc / docs を `.amadeus-plugin-src/<name>/` へ修正、**CLI discovery が正**）。欠陥は前 intent の U3 host-projection-all（`250265adb`）で導入された。対象面: discovery（正）`packages/framework/core/tools/amadeus-plugin.ts:278`、installDoc（誤）`scripts/plugin-projection.ts:593`、`dist/plugins/formal-model-check/<face>/INSTALL.md`（6面）、docs `docs/guide/19-plugins.md:183`（EN）+ `19-plugins.ja.md:175`（JA）、テスト棚卸し（t307 / t299 / t302 / t328 / t338 ほか）。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。上流入力は Developer スキャン結果（実測済みスキャンノート）。Architect 段で #1569 対象面の全 file:line・件数を observed `46a75f2e7` で独立再実測し、**訂正 0 件**（`amadeus-plugin.ts:278` `pluginSourceRootOf` / 呼び出し 3 経路 `:288`/`:323`/`:405`、`plugin-projection.ts:593` `Copy this bundle's …` / SELF_INSTALL_HARNESSES `:56` = 5 面、docs `:183`/`:175`、dist 6 INSTALL.md、t307 `:53`/`:60` の非アサート、`.amadeus-plugin-src` の test 配置 6 箇所、`plugin-projection.ts` の `.amadeus-plugin-src` grep = **0 hit** をいずれも実測一致）。
- 測定 ref: 本節および本 scan で更新した全成果物の数値・SHA・file:line は observed `46a75f2e7` での `git rev-parse` / `git rev-list --count` / `git diff --name-only` / `grep -n` / `grep -c` / `sed -n` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 更新した成果物（9件 + 新規 re-scan 記録）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md`（以上は本 intent の新節を追加）/ `dependencies.md` / `technology-stack.md` / `api-documentation.md` / `business-overview.md`（以上は区間の plugin 面変化と #1569 の最小追記）。加えて per-intent 記録 `re-scans/260727-install-doc-mismatch.md` を新規作成。旧「現在」マーカー（`260726-plugin-host-delivery`）は本ファイルおよび body 4 成果物（architecture / code-structure / component-inventory / code-quality-assessment）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コード（`plugin-projection.ts` / docs / `dist/plugins`）・テスト・intent record / state / audit・生成配布物・GitHub Issue への書込は一切行わない。修正方式（共有定数化で discovery↔installDoc の一致を構造強制するか、文言のみ是正するか / docs 二重管理の扱い / 回帰テストの不変量固定先）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260727-docs-impl-sync）

- Date: `2026-07-27`（intent slug 基準）
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（`chore(metrics): record snapshot (#1501)`、2026-07-26。`git merge-base --is-ancestor 1673c4332 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c4332..HEAD` = **47**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `aabc0527d96344420cf8236967763b81ce82ac83`（= 現 HEAD、`git rev-parse HEAD` 実測、ブランチ `main`）
- **base 選定の経緯（squash 運用起因の非祖先 observed 群）**: conductor がブリーフィングした base `ad1ff5de9`（前 intent `260726-answer-manual-binding` の observed）は `git merge-base --is-ancestor ad1ff5de9 HEAD` = **exit 1 = 非祖先**で採用不能。`re-scans/` 71 ファイル + ledger から抽出した **80 SHA** を全数祖先判定した結果、**祖先 30 / 非祖先 49**。**直近 5 observed（`ad1ff5de9` / `09c669901` / `f9a0fb86a` / `e39402224` / `0d83aa48b`）はいずれも非祖先**で、これは Bolt worktree のスカッシュマージ運用（org.md § Way of Working）により worktree 上の observed SHA が `main` の履歴に存在しないことに起因する。祖先のうち距離最小は `1673c4332`=**47**（次点 `e12259ba7`=49、`11f1ad61f`=53）で、cid:reverse-engineering:rescan-base-ancestry の「日付最新でなく HEAD の祖先かつ距離最小」に従い `1673c4332` を採用した。**この 47 コミット区間は前 4 intent（mirror-envelope-lf / crossreviewed-bug-batch / mirror-state-split / t258-p95-flake / answer-manual-binding）の RE が非祖先 base で部分的にしか走査できなかった面を含む**（cid:reverse-engineering:rescan-prompt-record-sync が警告する base 退行の実例）。
- 区間規模: `git diff --shortstat 1673c4332 HEAD` = **1602 files changed, 282182 insertions(+), 6842 deletions(-)**。record（`amadeus/`）除外で `git diff --numstat … | grep -v $'\t'amadeus/ | awk` = **1034 files, +212379 / -6817**（測定 ref: observed `aabc0527d`）。トップレベル内訳（`git diff --name-only … | sed 's|/.*||' | sort | uniq -c`）= `dist` **444** / `.kimi-code` **294**（新規セルフインストール面）/ `tests` **109** / `packages` **42** / `.claude` **25** / `.opencode` **24** / `.codex` **23** / `.cursor` **22** / `metrics` **18** / `docs` **18** / `scripts` **7** / その他 8。**生成物面（dist + 5 セルフインストールツリー）= 832**、正本コード（`packages/framework` 36 + `packages/setup` 6 + `scripts` 7）= **49**。
- Scope: `amadeus-document`、Brownfield、単一 repo `amadeus`
- Focus: **docs と実装の乖離の同期**。区間で着地した 7 番目のハーネス（Kimi Code）と plugin walking skeleton が、利用者向け docs の **ハーネス数・投影面数・hook 数**の記述へ伝播していない。中核の実測は下記「乖離クラスタ」。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間 47 コミットの正本 49 ファイルと `docs/` 18 ファイルを対象に差分走査し、docs 側の陳腐化は現 HEAD の実ファイル直読 + `grep -ci` で確定した。
- **乖離クラスタ A — README のハーネス数（区間内で導入）**: `README.md:5`「running natively inside **six** coding-agent harnesses」/ `:67`「extending the four shipped upstream to **six**」/ `:78-83` ハーネス表 **6 行**（Kimi 行なし）。`README.ja.md:5`「**6つ**のコーディングエージェントハーネス」/ `:78-83` 同。`grep -ci kimi README.md` = **0**、`grep -ci kimi README.ja.md` = **0**。実態は `ls -d packages/framework/harness/*/ | wc -l` = **7**（claude / codex / cursor / kimi / kiro / kiro-ide / opencode）。`git diff --name-only 1673c4332..HEAD -- README.md README.ja.md` = **0 行**（= Kimi 着地 PR #1522 が README を更新せず、**本区間で陳腐化が発生**）。対照として `docs/guide/harnesses/README.{md,ja.md}` は区間内で更新され Kimi 行を持つ（正）。
- **乖離クラスタ B — plugin 投影面数（区間内で導入）**: `docs/guide/19-plugins.md` は `:14-15`「the **six** packaged harness faces differ from the **four** self-install faces」/ `:70` / `:131` / `:148` 見出し「Six packaged faces, four self-install faces」/ `:150-156`（列挙に kimi なし）。`docs/guide/19-plugins.ja.md` も「6 つのパッケージ面、4 つのセルフインストール面」で同型。両ファイルとも `grep -ci kimi` = **0**。実態は `scripts/plugin-projection.ts:41-49` `PACKAGE_HARNESSES` = **7**（kimi 追加）、`:55` `SELF_INSTALL_HARNESSES` = **5**（`["claude","codex","cursor","opencode","kimi"]`）。base 断面（`git show 1673c4332:scripts/plugin-projection.ts`）では `:46-53` が 6、`:59` が 4 で、**6→7 / 4→5 の遷移は本区間内**（`git diff --name-only … -- docs/guide/19-plugins.md docs/guide/19-plugins.ja.md` = 0 行 = 未追随）。
- **乖離クラスタ C — EN/JA 対訳の非同期（8 ファイル、区間内で導入）**: 12 番目の hook（`packages/framework/core/hooks/amadeus-plugin-compose.ts`、`ls packages/framework/core/hooks/ | wc -l` = **12**）の着地に伴い EN 側 8 ファイルが更新されたが、JA 対訳は **1 ファイルも更新されていない**。`git diff --name-only 1673c4332..HEAD -- docs/` の 18 件のうち、EN のみ変更で JA 対がないのは `docs/amadeus-files.md` / `docs/guide/01-getting-started.md` / `docs/guide/12-cli-commands.md` / `docs/guide/15-troubleshooting.md` / `docs/guide/glossary.md` / `docs/reference/01-architecture.md` / `docs/reference/06-hooks-and-tools.md` / `docs/reference/11-contributing.md` の **8 件**。JA 側の残存旧数値は `docs/reference/06-hooks-and-tools.ja.md`「11個」= **7 出現 / 5 行**（`:5` / `:13` ×3 / `:15` / `:50` / `:496`）、`docs/guide/15-troubleshooting.ja.md:39`「11 個すべての TypeScript フック」（列挙も 11 個で新 hook 欠落）、`docs/guide/glossary.ja.md:45`「11 個のフックを使い」、`docs/reference/01-architecture.ja.md:476`「11個のフック」。`grep -c 'plugin-compose' docs/reference/06-hooks-and-tools.ja.md` = **0**（EN は **2**）。
- **未裁定仮説（欠陥断定しない）**: EN 側の是正方針が不整合の疑い — 6 ファイルは件数語を除去（count-free 化、cid:code-generation:count-comment-sync-on-catalog-change の推奨形）だが `docs/reference/06-hooks-and-tools.md` は `:5` / `:13` / `:15` / `:52` で硬数値「twelve」「Eleven of the twelve」を採用している。どちらを正準様式とするかは requirements-analysis 以降の**判断事項**として記録する。
- **非欠陥判定（スコープ膨張防止）**: (D) `docs/reference/06-hooks-and-tools.md` に CLI ツール目録 46 件の全数記載がないことは章スコープ外であり欠陥ではない。 (E) 「11 domain-expert agents」を主張する 20 ファイルは domain-expert 限定の表現として**正**（`ls packages/framework/core/agents/*.md | wc -l` = **14** は 11 domain + reviewer 2 + composer 1 の内訳）。ただし `docs/reference/01-architecture.md:60`「**Eleven** flat agent files」と `.ja.md:60`「**11個**のフラットなエージェントファイル」は **flat agent files = 14** を主張しており誤り — ただしこれは **区間外の pre-existing** 乖離で、本 intent のスコープ判断は requirements-analysis で行う。
- 区間の主要実装変更（docs が追随すべき面）: (1) **Kimi Code ハーネス追加**（#1522 / #1549 / #1551、`packages/framework/harness/kimi/` 8 ファイル + `.kimi-code/` 294 ファイル）。 (2) **plugin walking skeleton**（#1554）— `packages/framework/core/tools/amadeus-plugin.ts` **+454 新設 CLI**（4 verb: compose / doctor / drop / status、`:95-101` USAGE）、`scripts/plugin-composition.ts` → `packages/framework/core/tools/amadeus-plugin-compose.ts` **移設**（+111/-7、現 1469 行）、`packages/framework/core/hooks/amadeus-plugin-compose.ts` **+23 = 12 番目の hook**（SessionStart、CLI の薄いラッパで合成ロジック非再実装）。 (3) **metrics ダッシュボード**（#1500 / #1504）— `scripts/metrics-visualize.ts` **+292 新設**（自己完結 HTML、決定的レンダリング、`--check` バイト比較ドリフトガード）、`docs/guide/23-metrics-dashboard.{md,ja.md}` は**対訳同時着地（正）**、`metrics/*.json` = **141 件**。 (4) **mirror v1 統一**（#1553 / #1559 / #1537）— legacy「Mirror Issue」フィールド読取を全廃（`grep -rn 'Mirror Issue"' packages/framework/core/tools/*.ts` = コメント 1 行のみ）、`amadeus-mirror.ts` は +73/-303 で **357 行**へ縮小、mirror 系 **16 モジュール**構成。 (5) **election 強化**（#1517 / #1516 / #1523、`amadeus-election.ts` +61/-16）。 (6) **CI 分割・bench ゲート**（#1528 / #1507 / #1508 / #1557、`.github/workflows/ci.yml` の job = changes / typecheck / lint / distribution-contract / tests / drift-check / distribution-benchmark / -aggregate / -release-gate / coverage-head / coverage-base / coverage / metrics-snapshot / formal-model-check / ci-success）。
- docs 構造スナップショット: `find docs -name '*.md' | wc -l` = **197**（EN **100** / JA **97**）。非対訳 EN 3 件（`docs/guide/team-messaging.md` / `docs/guide/publishing-setup.md` / `docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md` — research は凍結記録で対訳対象外という**仮説**、裁定は後続）。孤児 JA **0**。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `aabc0527d` の実ファイル直読、および `git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --shortstat` / `git diff --numstat … | awk` / `git diff --name-only … | sed | sort | uniq -c` / `git show <base>:<path>` / `grep -ci` / `grep -c` / `grep -o … | wc -l` / `ls -d … | wc -l` / `find … | wc -l` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer コードスキャン結果（本 RE の read-only scan、全文読了）。Architect 段の独立再検証で核心の主張を observed `aabc0527d` に対して全数 spot-check し、**訂正 2 件**を確定した — (i) ブリーフィングの `kimi-hooks.ts +401（新）` は**実在しないファイル名**で、実体は `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts` **+352** と `amadeus-kimi-adapter.ts` **+28**（`git diff --numstat` 実測、cid:requirements-analysis:mechanism-cite-verify-at-draft）。 (ii) ブリーフィングの「docs 20」は実測 **18**（`git diff --name-only … | grep -c '^docs/'`）。他の主張（base 祖先性・距離 47・1034/+212379/-6817・harness 7・PACKAGE 7 / SELF_INSTALL 5・hook 12・agents 14・docs 197/100/97・README kimi 0 hit・19-plugins kimi 0 hit・EN 専用 8 ファイル）は全て一致。
- 更新した成果物（9 件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` / `technology-stack.md` / `dependencies.md` / `api-documentation.md` / `business-overview.md`。加えて per-intent 記録 `re-scans/260727-docs-impl-sync.md` を新規作成。旧「現在」マーカー（`260726-answer-manual-binding` および取り残されていた `260726-plugin-host-delivery`）は計 **6 箇所**の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として更新 9 成果物 + 新規 re-scan 記録へ `grep -c '^## '` を実行し H2 ≥ 2 を機械確認した。結果表は `re-scans/260727-docs-impl-sync.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、`docs/` 本体・README・正本コード・生成配布物・GitHub Issue・intent record / state / audit への書込は一切行わない。是正方針（README/19-plugins の 7/5 更新、JA 8 ファイルの対訳同期、EN 側の count-free vs 硬数値の正準様式、pre-existing な「Eleven flat agent files」を本 intent で扱うか）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-answer-manual-binding）

- Date: `2026-07-26`（intent slug 基準。RE 実行は `2026-07-27`）
- Base commit: `09c669901385ad44e9a5b378b8d8903eebbc184c`（前 intent `260726-t258-p95-flake` の observed。`git merge-base --is-ancestor 09c669901 HEAD` **exit 0 = 祖先**、`git rev-list --count 09c669901..HEAD` = **2**。候補中で祖先かつ距離最小（`f9a0fb86a`=距離4 / `e39402224`=非祖先 / `1673c4332`=距離42）。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `ad1ff5de9785af38f3c845b64372b65e8b73bb4e`（= 現 HEAD、`git rev-parse HEAD` 実測）
- 区間規模: `git diff --numstat 09c669901..HEAD | grep -v 'amadeus/spaces/' | wc -l` = **0**（測定 ref: observed `ad1ff5de9`）。区間 2 コミット `f8c068975`（前 intent RE+RA record）/ `ad1ff5de9`（前 intent CG+B&T record）はいずれも record-only の snapshot で、**コード/dist/self-install 面は区間内 0 変更**。対象面の交差確認 `git diff --name-only 09c669901..HEAD | grep -iE "mirror-lifecycle|mirror-coordinator|t282|coordinator"` = **0 hit**（mirror answer/guard スタックは区間内で完全に不変）。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1548](https://github.com/amadeus-dlc/amadeus/issues/1548) **bug / P?・S?（トリアージ参照）** — mirror lifecycle の **manual-boundary ask への answer が構造的に不成立**。manual create（非終端 receipt を残す）＋後続 prompt モード boundary の reconciliation で `expectedPrompt.event.boundary.kind === "manual"` の ask が永続化されるが、`runMirrorLifecycleAnswer`（`amadeus-mirror-lifecycle.ts:969-985`）が answer 転送時に `manualOperation` / `invocationId` を渡さないため、冒頭の manual guard（`:257-265`）で `Manual Mirror lifecycle requires an operation and invocation ID.` を返して常に error 終了し、正規の answer 経路（coordinator `driveMirrorBoundary`→`handlePromptAnswer`）へ到達不能。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間はコード変更ゼロ（record 2 コミットのみ）のため、患部 mirror スタック（`amadeus-mirror-lifecycle.ts` / `-coordinator.ts` / `-types.ts`）は base 時点から不変。#1553（v1 読取統一）は着地済みで本コードは分割後の姿。RE は現 HEAD の実ファイル直読で確定した（欠陥は区間の退行ではなく guard 導入コミット `2bb63f6b8`（#feat complete automatic mirror modes、2026-07-25）から現存）。
- 主要な確定事項: (A) **根本原因 = answer 転送の欠落**。`runMirrorLifecycleAnswer`（`:969-985`）は `boundary: expected.event.boundary` を転送するが `manualOperation` / `invocationId` を渡さない。 (B) **guard が answer を免除しない**。`runMirrorLifecycleBoundary` 冒頭（`:257-265`）は `boundary.kind === "manual"` かつ両フィールド欠落で error 終了し、`expected.event.boundary.kind === "manual"` な answer を常に弾く。 (C) **修正案 (b)（answer 側での補填）は永続情報だけで実現可能** — manual 経路の元値（`parseManualArgs` `:445-447`）は `invocationId === boundary.instance` かつ `manualOperation === operation` なので、answer 側で `manualOperation = expected.operation`・`invocationId = expected.event.boundary.instance`（types `:118-124` `MirrorExpectedPrompt` + `:28`/`:30-34` から再構成可）を補填すれば元値と一致し guard を字義充足する。 (D) **修正案 (a)（guard に `&& !request.answer`）は防御を毀損しない** — `driveMirrorBoundary`（coordinator `:713-714`）は answer 有りで常に `handlePromptAnswer` へ分岐し、その先の `prompt-approved` 権限分岐（`:292-303`）は `invocationId` / `manualOperation` を一切参照しない（invocationId 消費 `:304-308`・manualOperation 消費 `:573-577` はいずれも非 answer 経路専用）。answer なし manual decision 経路には guard がそのまま残る。 (E) **stale 遡及ゼロ** — committed record の `amadeus-state.md` 5 件はすべて `"expectedPrompt":null`（`bindingId` 付き非 null は 0 件）で、修正後の遡及回復手順は不要。 (F) **テスト gap** — t282（998 行）の answer 往復テスト（`:579`）は全て `intent-capture-approved` boundary、manual テスト（`:832`）は ask→answer 往復を経ず直接呼び。**manual boundary ask を answer で貫通する往復テストが不在**で、regression-first の落ちる実証はこの往復を新設する必要がある。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `ad1ff5de9` の実ファイル直読、`git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --numstat … | grep -v` / `git diff --name-only … | grep -iE` / `git ls-files … | wc -l` / `grep -rl` / `grep -rEn` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer コードスキャン結果 `re3-dev-scan-result.md`（本 RE の read-only scan、全文読了。本 intent record には `scan-notes.md` が生成されず scratchpad に出力されたため、確定事実は本鮮度ポインタと `re-scans/260726-answer-manual-binding.md` に永続化する）。Architect 段の独立再検証で、核心の file:line を observed `ad1ff5de9` で spot-check し **訂正 0 件**（lifecycle guard `:253-265` / answer forward `:969-985` / request type `:56-65` / `parseManualArgs` `:445-447` / coordinator executionAuth `:304-312` / manualOperation consume `:573-577` / driveMirrorBoundary answer 分岐 `:713-714` / prompt-approved 分岐 `:292-303` / types `:118-124`・`:28`・`:30-34` / 配布 13 コピー / expectedPrompt 5 件全 null をすべて直読一致で確認、cid:reverse-engineering:cite-shift-vs-nonshift-separation）。ブリーフィングの `:340-346` / `:1052-1067` は #1553 のモジュール分割前の stale 値のため全て現 HEAD で再解決した。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md`（answer/guard/handlePromptAnswer の経路断面と両修正案の安全性根拠の新節を追加）/ `code-quality-assessment.md`（manual ask→answer 往復のテスト gap と欠陥クラスの新節を追加）。他 6 成果物（`code-structure.md` / `component-inventory.md` / `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`）は区間にコード変更ゼロのため「本 intent 断面: 対象外（変更なし）」の 1 行注記のみ（無変更温存優先、cid:reverse-engineering:c1）。加えて per-intent 記録 `re-scans/260726-answer-manual-binding.md` を新規作成。旧「現在」マーカー（`260726-t258-p95-flake`）は本ファイルおよび body 2 成果物（`architecture.md` / `code-quality-assessment.md`）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新した成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（`re3-dev-scan-result`）への実参照を各成果物本文で機械確認 (c) 旧「現在」マーカー降格の残存 grep を実施した。結果表は `re-scans/260726-answer-manual-binding.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コード（mirror スタック）・t282 テスト・coverage allowlist・GitHub Issue・intent record / state / audit・生成配布物への書込は一切行わない。修正方式（案 (a) guard 免除 vs 案 (b) answer 側補填、往復 regression テストの新設、配布 13 コピー同期）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-t258-p95-flake）

- Date: `2026-07-26`（intent slug 基準。RE 実行は `2026-07-27`、observed commit `09c669901` の author 日時も `2026-07-27 02:04 +0900`）
- Base commit: `f9a0fb86abaa2450d559cd04b4ee889d2271fd71`（前 intent `260726-mirror-state-split` の observed。`git merge-base --is-ancestor f9a0fb86a HEAD` **exit 0 = 祖先**、`git rev-list --count f9a0fb86a..HEAD` = **2**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `09c669901385ad44e9a5b378b8d8903eebbc184c`（= 現 HEAD、`git rev-parse HEAD` 実測）
- 区間規模: `git diff --shortstat f9a0fb86a HEAD` = **32 files changed, 3709 insertions(+), 5 deletions(-)**（測定 ref: observed `09c669901`）。**32 ファイルすべて `amadeus/` 配下**（前 intent `260726-mirror-state-split` の RE+RA / CG+B&T record + codekb diff-refresh + `intents.json` + `memory/project.md`。`git diff --name-only f9a0fb86a HEAD | sed 's|/.*||' | sort -u` = `amadeus` のみ）。`git diff --name-only f9a0fb86a HEAD | grep -vc '^amadeus/'` = **0** — **source/test/CI ファイルの区間内変更はゼロ**。区間 2 コミットは `2a52729fe`（前 intent RE+RA record）/ `09c669901`（前 intent CG+B&T record）でいずれも record snapshot（`git log --oneline f9a0fb86a..HEAD`）。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1511](https://github.com/amadeus-dlc/amadeus/issues/1511) **bug / P2 / S3-MAJOR** — `tests/integration/t258-lifecycle-transaction.test.ts` の**絶対 p95 latency 予算**（`:461` `archiveP95Ms <= 500`、`:462` `recoveryP95Ms <= 750`）が CI 共有ランナーのジッタで偽赤になるフレーク（可視赤・回避策=再実行・機能影響なし）。RSS 予算（`:463` `rssDifferenceP95MiB <= 96`）は noop 差分ベースのため該当外。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間に source/test/CI 変更が **ゼロ**のため、患部 t258 とその実装面（`tests/`, `packages/`, `.github/`）は base 時点から不変。RE は現 HEAD の実ファイル直読で確定した（欠陥は区間の退行ではなく `2e157d7fe`（#1424、t258 追加時）から現存）。
- 主要な確定事項: (A) **欠陥箇所 = t258 `:461-462` の絶対 latency ceiling 500/750ms**。`p95()`（`:430-433`）は nearest-rank `sorted[Math.ceil(len*0.95)-1]`（len=100 なら `sorted[94]`）で上位 5 サンプルの超過は許容、**6/100 超過で初めて fail**。 (B) **予算 500/750 は #1424（`2e157d7fe`、t258 と同一コミットで導入）のユーザー選択 round number** — intent `260723-archived-status-guard` の nfr-requirements で Options「500ms/750ms, 1s/2s, N/A, Other」から A 案を選択（record 実在）。CI 実測 p95 は **archive 41.177ms / recovery 29.314ms**（同 intent code-summary、予算の約 12〜25 倍のヘッドルーム）で、**noise floor から導出されていない裸マジックナンバー**（`:461-463` に rationale コメントなし）。 (C) **機序** = child helper（`tests/helpers/lifecycle-transaction-benchmark-child.ts`、size=10000）が 10,000 行 registry/audit の**実 FS transaction**（`spawnSync` 1 プロセス起動、elapsed は transaction 区間のみ）を測り、`bun run test:ci -- -P 4`（`.github/workflows/ci.yml:162` name / `:163` run）の**並列度 4 integration tier**（専用 perf ジョブ・リトライ・負荷分離なし）で IO/CPU 競合しスパイク → 絶対 ceiling を 6/100 超が跨ぐと偽赤（cid:code-generation:fanout-load-settle-before-integration / cid:code-generation:rerun-red-reattribution クラス）。 (D) **同型先例 2 件が修正様式を確立済み** — `tests/lib/plugin-discovery-overhead-gate.ts`（#1525）は「**相対比 AND 絶対 noise floor**」（`additionalMs/baseline > 0.2` **AND** `additionalMs > 10ms`）+ 判定述語の計測ループ分離 + fail-closed、`scripts/mirror-distribution-benchmark-aggregate.ts`（#1507）は median 基準 + 絶対 spread noise floor（予算の 5%）。t258 は RSS 用に **noop baseline を既に測っており**（`:444`）、archive/recovery も noop 相対へ転用できる素材が既存（事実。方式は設計段で裁定）。 (E) **same-root（cid:code-generation:same-root-inventory）**: `tests/integration/t257-status-registry-migration.test.ts:240-241`（`strictReadP95Ms <= 100` / `migrationP95Ms <= 250`）が**同根・#1511 未報告**（同じ #1424 由来・同じ 10,000-entry child benchmark）。`t259-guard-integration.test.ts:209/211` は既に **baseline 相対**（`p95(archived)-p95(allowed) <= 100ms` / RSS `<= 16MiB`）で #1511 クラス非該当（参照実装）。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `09c669901` の実ファイル直読、`git diff --shortstat` / `git diff --name-only … | grep -vc` / `git rev-list --count` / `git log --oneline` / `grep -rn` / `sed -n` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer コードスキャン結果 `re2-dev-scan-result.md`（本 RE の read-only scan、全文読了。本 intent record には `scan-notes.md` が生成されず scratchpad に出力されたため、確定事実は本鮮度ポインタと `re-scans/260726-t258-p95-flake.md` に永続化する）。Architect 段の独立再検証で、核心の file:line を observed で spot-check し **訂正 0 件**（`:461-463` assert / `:430-433` p95 / `:444-447` noop baseline / `t257:240-241` / same-root grep = t257・t258 のみ / `ci.yml:162` name・`:163` run / `:2` `// @test-size medium` / `:466` `120_000` をすべて直読一致で確認、cid:reverse-engineering:cite-shift-vs-nonshift-separation）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `code-quality-assessment.md`（t258/t257 の絶対 p95 契約フレーク構造と同型先例ゲート様式の新節を追加）/ `architecture.md`（性能ゲート系の 2 様式 = 絶対 ceiling vs 相対+floor の短い断面を追加）。他 6 成果物（`code-structure.md` / `component-inventory.md` / `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`）は区間に source/test 変更ゼロのため「本 intent 断面: 対象外（変更なし）」の 1 行注記のみ（無変更温存優先、cid:reverse-engineering:c1）。加えて per-intent 記録 `re-scans/260726-t258-p95-flake.md` を新規作成。旧「現在」マーカー（`260726-mirror-state-split`）は本ファイルおよび body 4 成果物（`architecture.md` / `code-quality-assessment.md` / `code-structure.md` / `component-inventory.md`）の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel）。
- Sensors: RE ステージが宣言する 3 センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新した成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（`re2-dev-scan-result`）への実参照を各成果物本文で機械確認 (c) 旧「現在」マーカー降格の残存 grep を実施した。結果表は `re-scans/260726-t258-p95-flake.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部テスト（t258/t257）・child helper・CI 設定・coverage allowlist・GitHub Issue・intent record / state / audit・生成配布物への書込は一切行わない。修正方式（archive/recovery の noop 相対 + noise floor 複合述語 vs 予算緩和、判定述語の計測ループ分離、t257 同根の同一 PR 修正 or 別 Issue 化、専用 perf ジョブ分離の是非）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-mirror-state-split）

- Date: `2026-07-26`
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（前々 intent `260726-crossreviewed-bug-batch` の observed。`git merge-base --is-ancestor 1673c4332 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c4332..HEAD` = **38**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `f9a0fb86abaa2450d559cd04b4ee889d2271fd71`（= 現 HEAD、`git rev-parse HEAD` 実測）
- 区間規模: `git diff --shortstat 1673c4332 HEAD` = **1225 files changed, 215089 insertions(+), 2682 deletions(-)**（測定 ref: observed `f9a0fb86a`）。面別内訳は record（`amadeus/`）**333** / 実装正本（`packages/framework/core/`）**15** / harness 正本（`packages/framework/harness/`）**12** / dist **389** / tests **86** / docs **10** / self-install（`.claude/`）**15** / その他 **359**（`git diff --name-only … | grep -c` 出力の転記）。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1547](https://github.com/amadeus-dlc/amadeus/issues/1547) + [Issue #1534](https://github.com/amadeus-dlc/amadeus/issues/1534) の**同根修正** — mirror の状態表現分裂。lifecycle は **v1 sentinel ブロックのみ**を書き、status/orchestrate は **legacy「Mirror Issue」フィールド**を読む write⇔read 非対称（#1547）。legacy 経路で生成された marker 無し 10 record は relink/adopt とも fail-closed で **in-tool 復旧経路ゼロ**（#1534）。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。**mirror スタック 8 モジュール**（`amadeus-mirror.ts` / `-lifecycle` / `-executor` / `-state-store` / `-state-codec` / `-provenance` / `-coordinator` / `-state-reducer`）はいずれも `git log --oneline 1673c4332..HEAD -- <path>` の**出力 0 行**で無変更を機械確認した。したがって分裂は区間の退行ではなく base 以前から現存する。
- 主要な確定事項: (A) **Write は v1 ブロックのみ**（executor `:71` / lifecycle `:629` → state-store `:158` `mutateMirrorStateAtomic` → codec `:38-39` sentinel）。 (B) **Read 3 箇所は legacy field**（status `amadeus-mirror.ts:169` `getField(…, "Mirror Issue")`、orchestrate `:314` / `:3522` の `hasMirrorIssue`）。lifecycle create 後も status は `mirror-missing`（`:249-258` `compareMirrorStatus(snapshot, null)`）を報告。 (C) **legacy writer は CLI 実行時不到達** — `writeMirrorIssueField`（`:363`）の唯一の呼び手 `:413` は `handleCreate` 内で `main`（`:570-585`）から到達しない dead code。 (D) **偽 green の機序** = real-create → status の e2e 不在。status テスト（`t232`）は `snapshot({ mirrorIssue: 1161 })` で legacy field を直接シードし、create は lifecycle stub 化で実 lifecycle を走らせない。 (E) **#1534 は marker 無きで復旧不能** — marker 唯一の書き手 `renderMirrorMarker`（`amadeus-mirror-provenance.ts:47`）を legacy 経路が呼ばず、relink（`amadeus-mirror-lifecycle.ts:785` `marker.kind !== "parsed"` fail-closed）も `verifyOwnership`（`:165` `missing-marker`）も拒否する。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `f9a0fb86a` の実ファイル直読、`git diff --shortstat` / `git diff --name-only … | grep -c` / `git log --oneline` / `git ls-files … | wc -l` / `grep -n` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer スキャン結果 `amadeus/spaces/default/intents/260726-mirror-state-split/inception/reverse-engineering/scan-notes.md`（全文読了）。Architect 段の独立再検証で **2 件の訂正**を検出した — (1) **scan §6 の repair relink 行番号**: `runRepairRelink` は observed で **`:775`**（呼び出し `:925`）、`parseMirrorMarker` **`:784`**、`if (marker.kind !== "parsed")` **`:785`**、error message **`:788`**（scan-notes の `:783` / `:788` / `:789-793` は単発ずれ、cid:reverse-engineering:cite-shift-vs-nonshift-separation）。 (2) **scan §1 の「欠陥面は区間内未変更」の精密化**: `amadeus-mirror.ts` と lifecycle スタック 7 モジュールは区間内 0 変更で正しいが、`amadeus-orchestrate.ts` は区間内で [PR #1521](https://github.com/amadeus-dlc/amadeus/pull/1521)（dedup refactor、`8 insertions / 29 deletions`）により変更されている。ただし変更ハンク（`:102` / `:116` / `:1288` / `:3019`）に欠陥 reader 行 `:314` / `:3522` は含まれず（`grep -c "hasMirrorIssue\|Mirror Issue"` = 0）、両 reader は observed で `:314` / `:3522` に正しく解決する。その他の write⇔read 非対称の file:line はすべて直読で一致（訂正 0）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md`（mirror write⇔read の Interaction を Mermaid+テキストで新設）/ `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md`（以上は本 intent の新節を追加）/ `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`（以上は区間の公開挙動変化・状態表現分裂の最小追記）。加えて per-intent 記録 `re-scans/260726-mirror-state-split.md` を新規作成。旧「現在」マーカー（`260726-mirror-envelope-lf`）は本ファイルおよび body 4 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel、cid:reverse-engineering:re-timestamp-merge-resolution の様式）。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（`scan-notes.md`）への実参照を各成果物本文で `grep -c 'scan-notes'` により機械確認 の2点を実施した。結果表は `re-scans/260726-mirror-state-split.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コード（mirror スタック）・テスト fixture・coverage allowlist・GitHub Issue・intent record / state / audit・生成配布物への書込は一切行わない。修正方式（read の v1 片寄せ vs write の legacy 二重化、dead legacy 群の扱い、legacy 10 record の in-tool 復旧設計、互換フォールバックの是非）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-mirror-envelope-lf）

## 実行メタデータ（履歴: 260726-plugin-host-delivery、2026-07-26）

- Date: `2026-07-26`
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（`git merge-base --is-ancestor 1673c4332 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c4332..HEAD` = **43**。cid:reverse-engineering:rescan-base-ancestry。注: 前回 observed `e39402224` は現 HEAD の**非祖先**と実測した — `git merge-base --is-ancestor e3940222480b15d9cf10dd0a97df6a35a7ffb7d5 HEAD` **exit 1**。squash マージ運用では record の observed が現 HEAD の祖先でない場合があるため、祖先である `1673c4332` を base に採用した）
- Observed commit: `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `fix-plugin`、ブランチ `fix/plugin`）
- 区間規模: `git diff --shortstat 1673c4332..HEAD` = **1239 files changed, 217578 insertions(+), 2683 deletions(-)**（測定 ref: observed `0d83aa48b`）。面別内訳は `git diff --name-only 1673c4332..HEAD | grep -c` 等の転記で packages **33** / tests **86** / scripts **7** / .github **1**。`tests/` 配下の新規ファイルは `git diff --name-only --diff-filter=A … -- tests/ | wc -l` = **29**（うち `*.test.ts` は **15** 本 — kimi 群・metrics t298 群・setup 群・plugin-discovery-overhead-gate）。
- 区間の内訳（`git log --oneline 1673c4332..HEAD` 全43件の主系統）: (a) **Kimi Code CLI ハーネス追加** `a45b01bd3`（[PR #1522](https://github.com/amadeus-dlc/amadeus/pull/1522) — 第7ディストリ面・self-install 第5面） (b) **metrics 可視化** `aef8fad20` / `8fd9d4138`（[PR #1500](https://github.com/amadeus-dlc/amadeus/pull/1500) / [PR #1504](https://github.com/amadeus-dlc/amadeus/pull/1504) — `scripts/metrics-visualize.ts`、CI render+drift-check） (c) **mirror gateway envelope 修正** `3b87d1027`（[PR #1537](https://github.com/amadeus-dlc/amadeus/pull/1537) — `--paginate --slurp` 廃止・`FIND_PER_PAGE=100` の明示ページ walk・bare-LF ステータス行回収 = 前 intent `260726-mirror-envelope-lf` の Focus #1498 の解消） (d) **plugin discovery perf ゲート再設計** `1edf2abfb`（[PR #1535](https://github.com/amadeus-dlc/amadeus/pull/1535) — 相対比 0.2 + 絶対フロアの AND。注: ブリーフィングは #1525 としていたが、`git log` 実測は **#1535**） (e) CI 検証ジョブ分割 `4e95162e3`（[PR #1528](https://github.com/amadeus-dlc/amadeus/pull/1528)） (f) 前 intent のクロスレビュー済みバグ 6 修正の着地（#1516/#1517/#1518/#1521/#1523/#1524）+ benchmark dispersion gate 修正 `1886a2567`（[PR #1507](https://github.com/amadeus-dlc/amadeus/pull/1507)） (g) 残りは record 同期・metrics スナップショット・`origin/main` マージ。
- Scope: `amadeus-feature`（intent `260726-plugin-host-delivery`）、Brownfield、単一 repo `amadeus`
- Focus: **plugin 導入 UX**。`scripts/plugin-projection.ts` の self-install 面が「closed four → **closed five**」へ拡張された（`SELF_INSTALL_HARNESSES = ["claude", "codex", "cursor", "opencode", "kimi"]`、`:60`）一方、**plugin-composition / formal-model-check / `dist/plugins` / トップレベル `plugins/` は区間内で完全に無変更**（`git log --oneline 1673c4332..HEAD -- <各パス>` および `git diff --name-only … | grep -c` の**出力 0 件**で反証確認済み）。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。上流入力は Developer スキャン結果（実測済みスキャンノート）。Architect 段で主要主張を独立再実測し、**1件の PR 番号訂正**（perf ゲート再設計 #1525 → 実測 **#1535**）を検出した。
- 測定 ref: 本節および本 scan で更新した全成果物の数値・SHA は observed `0d83aa48b` での `git rev-parse` / `git rev-list --count` / `git diff --shortstat` / `git diff --name-only … | grep -c` / `git log --oneline` / `grep -n` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 更新した成果物（8件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` / `technology-stack.md` / `dependencies.md` / `api-documentation.md`（区間の公開挙動変化の最小追記）。`business-overview.md` は区間内に業務境界の変化が該当しないため無変更。旧「現在」マーカー（`260726-mirror-envelope-lf`）は本ファイルおよび body 4 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel。`grep -n "、現在、\|（現在:" *.md` の残存ヒットが本 intent `260726-plugin-host-delivery` の節のみであることを機械確認）。
- Delivery boundary: 本 scan は codekb の差分更新のみを成果物とし、実装コード・intent record / state / audit・生成配布物への書込は一切行わない。

## 実行メタデータ（履歴: 260726-mirror-envelope-lf）

- Date: `2026-07-26`
- Base commit: `1673c433209c74820881c75a0816bbce3fb2d512`（前 intent `260726-crossreviewed-bug-batch` の observed。`git merge-base --is-ancestor 1673c4332 HEAD` **exit 0 = 祖先**、`git rev-list --count 1673c4332..HEAD` = **27**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `e3940222480b15d9cf10dd0a97df6a35a7ffb7d5`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `.claude/worktrees/bugfix`、ブランチ `worktree-bugfix`）
- 区間規模: `git diff --shortstat 1673c4332 HEAD` = **322 files changed, 20142 insertions(+), 2027 deletions(-)**（測定 ref: observed `e39402224`）。面別内訳は record（`amadeus/`）**137** / 実装（`packages/`・`tests/`・`scripts/`・`.github/`）**58** / dist + self-install **114**（いずれも `git diff --name-only 1673c4332 HEAD | grep -c` 出力の転記）。
- ブリーフィングとの差異: ブリーフィングは区間 **23 コミット**としていたが、observed での実測は **27**（`git rev-list --count`）。直近の `origin/main` マージ（`e39402224`）以降の前進分を含むためで、本 codekb は実測値 27 を採る（cid:requirements-analysis:numbers-from-command-output-only）。
- 区間の内訳（`git log --oneline 1673c4332..HEAD` 全27件の主系統）: (a) **前 intent `260726-crossreviewed-bug-batch` のクロスレビュー済みバグ 6 修正の着地** — `da94f232c`（[PR #1516](https://github.com/amadeus-dlc/amadeus/pull/1516) election verify の自己相関除去 = [#1457](https://github.com/amadeus-dlc/amadeus/issues/1457)）/ `6aa1eb3eb`（[PR #1517](https://github.com/amadeus-dlc/amadeus/pull/1517) `Election.parse` の fail-closed 棄却 = [#1459](https://github.com/amadeus-dlc/amadeus/issues/1459)）/ `499a65488`（[PR #1518](https://github.com/amadeus-dlc/amadeus/pull/1518) plugin discovery の dangling symlink skip = [#1462](https://github.com/amadeus-dlc/amadeus/issues/1462)）/ `071cb2f7b`（[PR #1521](https://github.com/amadeus-dlc/amadeus/pull/1521) core tools 共有知識の重複排除）/ `2f76f79a4`（[PR #1523](https://github.com/amadeus-dlc/amadeus/pull/1523) `reportDelivery` の distributed transition 配線 = [#1458](https://github.com/amadeus-dlc/amadeus/issues/1458)）/ `a41035c63`（[PR #1524](https://github.com/amadeus-dlc/amadeus/pull/1524) bare `intents/` ルートへの audit シャードを fail-closed 拒否 = [#1377](https://github.com/amadeus-dlc/amadeus/issues/1377)）/ `1886a2567`（[PR #1507](https://github.com/amadeus-dlc/amadeus/pull/1507) benchmark dispersion gate の単一スパイク耐性 = [#1489](https://github.com/amadeus-dlc/amadeus/issues/1489)） (b) `4e95162e3`（[PR #1528](https://github.com/amadeus-dlc/amadeus/pull/1528) CI 検証ジョブの分割） (c) `aef8fad20` / `8fd9d4138`（[PR #1500](https://github.com/amadeus-dlc/amadeus/pull/1500) / [PR #1504](https://github.com/amadeus-dlc/amadeus/pull/1504) metrics ダッシュボード） (d) 残りは record 同期・metrics スナップショット・`origin/main` マージ。
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1498](https://github.com/amadeus-dlc/amadeus/issues/1498) **P1/S2** — `amadeus-mirror-gateway.ts` の HTTP envelope パーサが実 `gh` 出力を解釈できず、auto-mirror の 5 verb すべてが `invalid-response` で不成立になる欠陥。クロスレビュー 2/2 が Issue 本文の機序記述（主因 = `--slurp` 先頭の `[`）を訂正しており、本 scan はその訂正を独立再現している。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。**患部 `amadeus-mirror-gateway.ts` 系は区間内で完全に無変更**であることを `git log --oneline 1673c4332..HEAD -- '*amadeus-mirror-gateway*'` の**出力 0 行**で機械確認した（`t272` / `t270` / `amadeus-mirror-lifecycle.ts` も同様に 0 行）。したがって欠陥は区間の退行ではなく base 以前から存在し、クロスレビュー時点（実測 ref `9ea9a6160`）の観測は observed でもそのまま有効で、行番号も一致する。
- 主要な確定事項: (A) **主因は bare-LF ステータス行**。`gh 2.96.0` の `--include` はステータス行のみ LF 終端・ヘッダ行は CRLF で出力するのに対し、パーサ `:196` `const eol = bin.indexOf("\r\n", pos);` は CRLF 前提で終端を探すため `:198` の `STATUS_LINE_RE` が不一致となり `:199` で `malformed` に落ちる（実バイトへ実 `parseHttpEnvelope` を適用した対照実測: 実バイト → `{"kind":"malformed"}` / ステータス行のみ LF→CRLF 置換 → `{"kind":"ok","statuses":[200]}`）。 (B) **影響は 5 verb 全部** — `--slurp` を含まない `viewArgv` 経路（`:138`）でも malformed。 (C) **find の `--slurp` は interleave 文法**で、過去 record の設計宣言（`security-design.md:37`）が要求する「P 個の HTTP block 連続 + 単一 JSON 配列」とは構造的に別物。 (D) **CI が緑のままなのは fixture が自作 CRLF だから**（`t272:61`、`grep -c 'HTTP/'` = **1**）— 実 `gh` 出力を一度も通していない検証劇場クラス。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `e39402224` の実ファイル直読、`git diff --shortstat` / `git diff --name-only … | grep -c` / `git log --oneline` / `git ls-files … | wc -l` / `grep -n` / `grep -c` / `wc -l` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。
- 上流入力: Developer スキャン結果 `amadeus/spaces/default/intents/260726-mirror-envelope-lf/inception/reverse-engineering/scan-notes.md`（全文読了）。Architect 段の独立再検証では **file:line の訂正 0 件** — 照合対象（`amadeus-mirror-gateway.ts` の `:138` / `:179` / `:195` / `:196` / `:198` / `:199` / `:215` / `:220` / `:495` / `:509` / `:525-534` / `:649-650` / `:656-657` / `:665` / `:669-670` / `:690-691` / `:704-705` / `:718-719`、`t272:61`、`projections.ts:26`、`amadeus-mirror-lifecycle.ts:29`、`security-design.md:37`、allowlist の gateway 行ピン 5 件）はすべて直読で一致した（cid:reverse-engineering:cite-shift-vs-nonshift-separation）。数値も再実測で一致（`wc -l` = **724** 行、`git ls-files "*amadeus-mirror-gateway*"` = **12** パス、`grep -c 'HTTP/' tests/unit/t272-…` = **1**）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `code-quality-assessment.md` / `component-inventory.md`（以上は本 intent の新節を追加）/ `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`（以上は区間の公開挙動変化の最小追記）。加えて per-intent 記録 `re-scans/260726-mirror-envelope-lf.md` を新規作成。旧「現在」マーカー（`260726-crossreviewed-bug-batch`）は本ファイルおよび body 4 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel。`grep -n '^## .*現在' amadeus/spaces/default/codekb/amadeus/*.md` の残存ヒットが本 intent `260726-mirror-envelope-lf` の節のみであることを機械確認）。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（`scan-notes.md`）への実参照を各成果物本文で `grep -c 'scan-notes'` により機械確認 の2点を実施した。結果表は `re-scans/260726-mirror-envelope-lf.md` の「センサー不適用と代替検証」節。
- 本 scan 完了直後の HEAD 前進（cid:reverse-engineering:upstream-cite-reresolve-on-shift）: 合成の途中で conductor が `origin/main` を取り込み、HEAD は `e39402224` → **`ccdabd323b8fa56ae8794584f51aec2e68e888ba`** へ前進した（`9e3d6d2fb` metrics snapshot [#1533](https://github.com/amadeus-dlc/amadeus/pull/1533) / `a45b01bd3` **Kimi Code CLI ハーネス追加** [#1522](https://github.com/amadeus-dlc/amadeus/pull/1522) / `3442beec3` metrics snapshot [#1531](https://github.com/amadeus-dlc/amadeus/pull/1531) を含む）。**本節および body 成果物の file:line は測定 ref `e39402224` のまま有効** — 前進後の HEAD で再実測しても `amadeus-mirror-gateway.ts` は 724 行・`:196` `const eol = bin.indexOf("\r\n", pos);` で不変（`git log e39402224..HEAD -- '*amadeus-mirror-gateway*'` のヒットは kimi ハーネス追加による**新規配布コピー 2 パスのみ**でソース変更ではない）。影響を受けたのは配布コピー数だけで、`git ls-files "*amadeus-mirror-gateway*"` は **12 → 14**（`.kimi-code/tools/` と `dist/kimi/.kimi-code/tools/` が追加。`cmp -s` で配布 12 コピーすべて正本とバイト一致を再実測）。あわせて `origin/main` から並行 intent `260725-kimi-harness` の RE 節が codekb へ合流したが、同節は合流時点で既に「履歴」ラベルであり本 intent の「現在」マーカーと競合しない。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コード（`amadeus-mirror-gateway.ts` およびその配布コピー）・テスト fixture・allowlist・GitHub Issue・intent record / state / audit・生成配布物への書込は一切行わない。修正方式（単一系の LF/CRLF 両対応、find の interleave 対応 vs `--slurp` 撤去、過去 record の誤宣言の扱い）は後続の requirements-analysis 以降で裁定する。

## 実行メタデータ（履歴: 260726-crossreviewed-bug-batch）

- Date: `2026-07-26`
- Base commit: `e12259ba78b8c56bf3572c9bfd44a7bdf84d681c`（前 intent `260726-grant-scope-gate` の observed。`git merge-base --is-ancestor e12259ba7 HEAD` **exit 0 = 祖先**、`git rev-list --count e12259ba7..HEAD` = **2**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `1673c433209c74820881c75a0816bbce3fb2d512`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree ブランチ `worktree-bugfix`）
- 区間規模: `git diff --shortstat e12259ba7 HEAD` = **52 files changed, 3024 insertions(+), 48 deletions(-)**（測定 ref: observed `1673c4332`）。うち正本（`packages/framework/core/`）の実装変更は `git diff --stat e12259ba7 HEAD -- packages/framework/core/` = **`amadeus-lib.ts` 1ファイル、35 insertions(+) / 3 deletions(-)** のみで、残りは dist×6 + self-install×4 の生成物増幅・テスト・record である。
- 区間の内訳（`git log --oneline e12259ba7..HEAD` 全2件）: `10d8bcfbb`（[PR #1499](https://github.com/amadeus-dlc/amadeus/pull/1499) = [Issue #1497](https://github.com/amadeus-dlc/amadeus/issues/1497) standing grant の gate スコープ判定を scope-grid 由来解決へ修正）/ `1673c4332`（record snapshot のみ、コード面の変更なし）
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: **クロスレビュー済みバグ7件のバッチ** — [#1489](https://github.com/amadeus-dlc/amadeus/issues/1489) P2/S3（Intent Mirror benchmark 分散ゲートの偽赤）/ [#1457](https://github.com/amadeus-dlc/amadeus/issues/1457) P2/S3（`handleVerify` が `verifySelf` へ自己相関引数 = 検証劇場）/ [#1377](https://github.com/amadeus-dlc/amadeus/issues/1377) P3/S3（audit シャードが bare `intents/audit/` へ書かれる）/ [#1459](https://github.com/amadeus-dlc/amadeus/issues/1459) P3/S3（`Election.parse` が空 choices・重複 internalNo・重複 voter を無音受理）/ [#1462](https://github.com/amadeus-dlc/amadeus/issues/1462) P3/S4（`discoverPluginStageFiles` が dangling symlink で raw ENOENT）/ [#1458](https://github.com/amadeus-dlc/amadeus/issues/1458) P3/S4（既定 subagent 経路で distributed timeline 未記録・`reportDelivery` が dead export）/ [#1388](https://github.com/amadeus-dlc/amadeus/issues/1388) P3/S4（`team-up.sh` codex 経路の初期プロンプト一発供給・watcher arming 検証欠如 — **FR-6 既決との関係が要精査**）
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間2コミットのうち実装面1件を直読したうえで、**対象7件の患部は区間内で無変更**であること（区間の正本 diff が `amadeus-lib.ts` の #1497 修正のみ）を `git diff --stat` の出力で機械確認した。すなわち7件はいずれも区間の退行ではなく、区間より前から存在する欠陥である。
- 主要な確定事項: 7件中6件は**対操作の非対称**（cid:requirements-analysis:symmetric-pair-review）に還元できる — #1377 は `auditShardDir` の fail-closed に対する `auditFilePath` / `stateFilePath` の bare-root フォールバック、#1462 は stages 判定の `existsSync` ガードに対する plugin 名フィルタの `statSync` 無ガード、#1459 は `voters` 側の `.length === 0` 検査に対する `choices` 側の欠落、#1457 は「self-reference 回避」を明言する doc コメントに対する caller 配線の逸脱、#1458 は「`reportDelivery` が mint する」設計意図に対する配線の不在（dead export）、#1489 は判定側 noise floor とワークロード別予算の不整合。#1388 のみ性格が異なり、検証除外が **FR-6 として明示的に既決**である（`team-up.sh:1098-1099` のコメント）。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `1673c4332` の実ファイル直読、`git diff --shortstat` / `git diff --stat` / `git log --oneline` / `git ls-files … | wc -l` / `grep -n` / `grep -c` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only）。
- 上流入力: Developer スキャン結果 `amadeus/spaces/default/intents/260726-crossreviewed-bug-batch/inception/reverse-engineering/scan-notes.md`（全文読了）。Architect 段の独立再検証で **1件の行番号訂正**を検出した — scan-notes が `mirror-distribution-benchmark-aggregate.ts:30` とした `if (minimum <= 0) return true;` は observed で **`:32`**（`grep -n "minimum <= 0"` 出力）。`:20` / `:33-35` / `:61-62` ほか他の file:line はすべて直読で一致を確認した（cid:reverse-engineering:cite-shift-vs-nonshift-separation）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `component-inventory.md` / `code-structure.md` / `code-quality-assessment.md`（以上は本 intent の新節を追加）/ `api-documentation.md` / `dependencies.md` / `business-overview.md` / `technology-stack.md`（以上は区間に新規公開契約・新規依存エッジが無い旨の最小追記）。加えて per-intent 記録 `re-scans/260726-crossreviewed-bug-batch.md` を新規作成。旧「現在」マーカー（`260726-grant-scope-gate`）は本ファイルおよび body 5 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel。`grep -rn "、現在、\|（現在:" amadeus/spaces/default/codekb/amadeus/` の残存ヒットが本 intent `260726-crossreviewed-bug-batch` の節のみであることを機械確認）。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物 + 新規 re-scan 記録に `grep -c '^## '` を実行し H2 ≥ 2 を機械確認（全件充足。内訳は `re-scans/260726-crossreviewed-bug-batch.md` の「センサー不適用と代替検証」節） (b) 上流入力（`scan-notes.md`）への実参照が各成果物本文に存在することを `grep -c 'scan-notes'` で機械確認 の2点を実施した。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コードへの修正、Issue 操作、intent record / state / audit / 生成配布物への書込は一切行わない。7件の修正可否・方式（特に #1388 の性格判定と #1458 の2案）は後続の requirements-analysis 以降で確定する。

## 実行メタデータ（履歴: 260726-metrics-visualization）

- Date: `2026-07-26`
- Base commit: `11f1ad61f5ea4942332da5bd6e3e433c44aa4cab`（前 intent `260725-worktree-ref-fixes` の observed。`git merge-base --is-ancestor 11f1ad61f 1c43438df` exit **0** = 祖先、`git rev-list --count 11f1ad61f..1c43438df` = **5**。いずれも本 scan で再実測。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `1c43438df0348fed63c5fe88af46c9417258d4e0`（= 現 HEAD、`git rev-parse HEAD` 実測。ブランチ `main`）
- 区間規模: `git diff --shortstat 11f1ad61f 1c43438df` = **452 files changed, 68457 insertions(+), 2792 deletions(-)**（測定 ref: observed `1c43438df`）。実装面は2系統のみ（solo standing grants / worktree hooks 修正）で、残りは record・audit・生成配布物。
- 区間の内訳（`git log --oneline 11f1ad61f..1c43438df` 全5件）: `bbd74a942`（chore(metrics): record snapshot、[PR #1490](https://github.com/amadeus-dlc/amadeus/pull/1490)）/ `77d871d57`（feat(grants): standing delegation grants を solo mode で利用可能にする、[PR #1483](https://github.com/amadeus-dlc/amadeus/pull/1483)）/ `272f4bd58`（chore(metrics): record snapshot、[PR #1491](https://github.com/amadeus-dlc/amadeus/pull/1491)）/ `e12259ba7`（fix(hooks,tests): worktree セッションのパス／ref 解決ファミリを修正、[PR #1493](https://github.com/amadeus-dlc/amadeus/pull/1493)、#1482 / #1481 / #1455、refs #1492）/ `1c43438df`（Merge branch 'main'）
- Scope: `amadeus-feature`、Depth Standard、Brownfield、単一 repo `amadeus`
- Focus: `metrics/` スナップショットの可視化機能。既存 metrics サブシステム（`scripts/metrics-snapshot.ts` / `metrics-timeseries.ts` / `metrics-retention.ts`、ci.yml `metrics-snapshot` job、`metrics/*.json` **123 件**）の現況把握と、可視化機能の再利用 seam・挿入点・既習様式の同定が本 scan の主眼。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間5コミットの実装面を直読したうえで、**本 intent の重点である metrics サブシステムは区間内で完全に無変更**であることを `git diff --name-only 11f1ad61f 1c43438df -- scripts/ .github/` の**出力 0 行**で機械確認した。すなわち metrics 面の現況は区間より前から安定しており、可視化の挿入 seam は observed HEAD の直読で確定できる。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `1c43438df` の実ファイル直読、および `git diff --numstat` / `grep -n` / `ls | wc -l` の出力からの転記による（cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts）。上流 Developer スキャン結果の file:line は本 Step 3 で全数スポット再実測し、不一致は下記および `re-scans/260726-metrics-visualization.md` に訂正として記録した。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` / `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md`。加えて per-intent 記録 `re-scans/260726-metrics-visualization.md` を新規作成。
- 上流主張の訂正（本 scan で再実測）: (1) `resolveProjectDirFromHook` の所在は前 intent 記録の `amadeus-lib.ts:247` → observed で **`:269`**（PR #1483 / #1493 による +22 行シフト、cid:reverse-engineering:upstream-cite-reresolve-on-shift） (2) `package.json` の scripts エントリは 16 → 実測 **15**（うち metrics 系 **0**） (3) 正本 diff の行数はスキャン結果と numstat で乖離（`amadeus-state.ts` +540 → 実測 **+467 −73**、`amadeus-orchestrate.ts` +188 → **+184 −4**、`amadeus-directive.ts` +168 → **+127 −41**、`amadeus-lib.ts` +160 → **+202 −29**）。本 codekb は numstat 実測値を採る。 (4) snapshot collectors の定義行は `:71-110` → 実測 **`:72-110`**。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物すべてに `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（Developer スキャン結果）の参照を各成果物本文で直接検証（file:line のスポット再実測を含む）の2点を実施した。結果は `re-scans/260726-metrics-visualization.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新のみを成果物とし、実装コード・intent state・memory・`intents.json`・生成配布物には一切書き込まない。可視化機能の方式（挿入点、出力形式、CI 配線）は後続の requirements-analysis 以降で確定する。

## 実行メタデータ（履歴: 260726-grant-scope-gate）

- Date: `2026-07-26`
- Base commit: `11f1ad61f5ea4942332da5bd6e3e433c44aa4cab`（前 intent `260725-worktree-ref-fixes` の observed。`git merge-base --is-ancestor 11f1ad61f e12259ba7` exit 0 = 祖先、`git rev-list --count 11f1ad61f..e12259ba7` = **4**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `e12259ba78b8c56bf3572c9bfd44a7bdf84d681c`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree `.claude/worktrees/1497-standing-grant-scope-gate`）
- 区間規模: **452 files changed, +68,457 / -2,792**（測定 ref: observed `e12259ba7`）。大半は dist×6 + self-install×4 の生成物増幅で、正本の実装面は 2 コミットに閉じる。
- 区間の内訳（`git log --reverse 11f1ad61f..e12259ba7` 全4件）: `bbd74a942`（record のみ）/ `77d871d57`（[PR #1483](https://github.com/amadeus-dlc/amadeus/pull/1483) solo standing grants）/ `272f4bd58`（record のみ）/ `e12259ba7`（[PR #1493](https://github.com/amadeus-dlc/amadeus/pull/1493) worktree パス／ref 修正）
- Scope: `amadeus-bugfix`、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1497](https://github.com/amadeus-dlc/amadeus/issues/1497) — standing grant の scope 解決。`standingGrantSatisfiesGate`（`amadeus-lib.ts:3985-4017`）が composed scope（`amadeus-*`）を解決できない `stage.scopes` を直読する構造欠陥。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間4コミットのうち実装面 2 件を直読し、患部機構は **PR #1483 で新規に持ち込まれた面**として精査した。
- 主要な確定事項: (A) composed scope では `inScope()` が全 stage で false → `crossesPhaseBoundary` 恒真 → 既定グラントが全ゲート ineligible（#1497 本体、無音 no-op） (B) 同じ `inScope` により `isFirstConstructionGate` が恒偽 → **walking-skeleton 除外が無音不発**（未報告、project.md Forbidden / Mandated への現在進行の違反）。A と B は**単一の根本原因から出る 2 症状**。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `e12259ba7` の実ファイル直読、`grep -n` / `wc -l` / `find` 出力、および `python3 -c json` による `stage-graph.json`（32 stages / `scopes` 語彙 10 / キー欠落 0）・`scope-grid.json`（15 scope キー）・`.coverage-patch-allowlist.json`（`amadeus-lib.ts` 行ピン 4 件）の直接読取からの転記（cid:requirements-analysis:numbers-from-command-output-only）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `component-inventory.md` / `code-structure.md` / `code-quality-assessment.md`（以上は本 intent の新節を追加）/ `api-documentation.md` / `dependencies.md`（区間の新規公開契約・新規エッジを最小追記）/ `business-overview.md` / `technology-stack.md`（冒頭ブロックのみ）。加えて per-intent 記録 `re-scans/260726-grant-scope-gate.md` を新規作成。旧「現在」マーカー（`260725-worktree-ref-fixes`）は本ファイルおよび body 4 成果物の H2 見出しで履歴ラベルへ降格した（cid:reverse-engineering:c3-relabel。`grep -rn "、現在、\|（現在:"` の残存ヒットが本 intent `260726-grant-scope-gate` の節のみであることを機械確認）。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、代替として (a) 更新9成果物すべてに `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（Developer スキャン結果）の参照を各成果物本文で直接検証 の2点を実施した。
- Delivery boundary: 本 scan は codekb の差分更新と per-intent re-scan 記録のみを成果物とし、患部コードへの修正、intent record / state / audit / 生成配布物への書込は一切行わない。#1497 の修正方式（`inScope` の解決方式差し替え、fixture 是正、per-unit 軸の扱い）は後続の requirements-analysis 以降で確定する。

## 実行メタデータ（履歴: 260725-worktree-ref-fixes）

- Date: `2026-07-26`
- Base commit: `ec624022ff65cc8b3912001f768bd66ec41a0e39`（前 intent `260725-teamup-attach-latency` の observed。`git merge-base --is-ancestor ec624022f 11f1ad61f` exit 0 = 祖先、`git rev-list --count ec624022f..11f1ad61f` = **10**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `11f1ad61f5ea4942332da5bd6e3e433c44aa4cab`（= 現 HEAD、`git rev-parse HEAD` 実測。worktree ブランチ `worktree-bugfix-1482-1481-1455`）
- 区間規模: `git diff --shortstat ec624022f 11f1ad61f` = **143 files changed, 22167 insertions(+), 725 deletions(-)**（測定 ref: observed `11f1ad61f`）。実装面は `team-up.sh` 系1系統のみ（正本+harness 表層4+dist 6、tests 3件）で、残りは record/audit。
- 区間の内訳（`git log --reverse ec624022f..11f1ad61f` 全10件）: `dcadcce17`（前 intent inception checkpoint）/ `294df1281`（watcher 検証の適用可否ガード）/ `22829d0b8` / `a0febedd2` / `872919958`（Merge [PR #1477](https://github.com/amadeus-dlc/amadeus/pull/1477)）/ `c4c9531ee` / `6248fdac4`（[PR #1484](https://github.com/amadeus-dlc/amadeus/pull/1484) actas 移行）/ `f54ce2b5e`（[PR #1486](https://github.com/amadeus-dlc/amadeus/pull/1486) record 同期）/ `8eeab33e5`（[PR #1488](https://github.com/amadeus-dlc/amadeus/pull/1488)）/ `11f1ad61f`（[PR #1487](https://github.com/amadeus-dlc/amadeus/pull/1487) worktree checkout 並列化）
- Scope: `amadeus-bugfix`、Depth Minimal、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1482](https://github.com/amadeus-dlc/amadeus/issues/1482)（EnterWorktree セッションの Stop hook が本線 state を読む）+ [Issue #1481](https://github.com/amadeus-dlc/amadeus/issues/1481)（worktree で t257/t258/t259 が ref 解決失敗で常赤）+ [Issue #1455](https://github.com/amadeus-dlc/amadeus/issues/1455)（t257 `currentGitSha` の common-dir loose ref 未解決 — #1481 と同根）
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間10コミットの実装面を直読したうえで、**患部（`amadeus-lib.ts` / `amadeus-stop.ts` / t257 / t258 / t259）は区間内で無変更**であることを `git diff --name-only ec624022f 11f1ad61f -- <5パス>` の**空出力**で機械確認した。すなわち本 intent の3 Issue はいずれも区間の退行ではなく、区間より前から存在する欠陥である。
- 測定 ref: 本節および本 scan で更新した全成果物の file:line・件数は observed `11f1ad61f` の実ファイル直読と、worktree `.claude/worktrees/bugfix-1482-1481-1455` 上での git plumbing 実測（`git rev-parse --git-dir` / `--git-common-dir`、`ls`、`grep -c`）による。件数はすべて grep/wc 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only）。
- 更新した成果物（9件）: `reverse-engineering-timestamp.md`（本ファイル）/ `architecture.md` / `code-quality-assessment.md` / `code-structure.md` / `component-inventory.md` / `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md`。加えて per-intent 記録 `re-scans/260725-worktree-ref-fixes.md` を新規作成。
- Sensors: RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch）。**センサー成功として扱わず**、代替として (a) 更新9成果物すべてに `grep -c '^## '` を実行し H2 ≥ 2 を機械確認 (b) 上流入力（Developer スキャン結果）の参照を各成果物本文で直接検証 の2点を実施した。詳細は `re-scans/260725-worktree-ref-fixes.md` の「センサー不適用と代替検証」節。
- Delivery boundary: 本 scan は codekb の差分更新のみを成果物とし、患部コードへの修正は行わない。3 Issue の修正方針（rung 順序の裁定、helper の git plumbing 化と共有化）は後続の requirements-analysis 以降で確定する。

## 実行メタデータ（履歴: 260725-teamup-launch-hardening）

- Date: `2026-07-25`
- Base commit: `ec624022ff65cc8b3912001f768bd66ec41a0e39`（前 intent `260725-teamup-attach-latency` の observed。`git merge-base --is-ancestor` exit 0、`git rev-list --count` = **9**。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `4a0f91ad07dbe17c6477b7fe9b52a0e9ab4532ba`（= 現 HEAD、`git rev-parse HEAD` 実測。ブランチ `feat/teamup-actas-migration-and-worktree-parallel`）
- 区間規模: `git diff --stat ec624022f..4a0f91ad0` = **65 files changed, 6516 insertions(+), 54 deletions(-)**（測定 ref: observed `4a0f91ad0`）。実装面は `team-up.sh` 11 面 × `+31/-8` と tests 2 件のみで、残りは record/audit。
- 区間の内訳: [PR #1477](https://github.com/amadeus-dlc/amadeus/pull/1477)（merge `872919958`、実装 `294df1281` = watcher 検証の適用可否ガード、Issue #1449）+ 本 intent の ideation 記録（`5219bbd54` / `a3ab8dff4` / `4a0f91ad0`）+ 前 intent の record checkpoint。
- Scope: `amadeus-feature`、Depth Standard、Test Strategy Minimal、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1476](https://github.com/amadeus-dlc/amadeus/issues/1476)（bug / P1 / S2-CRITICAL — 初期プロンプトの actas 移行）+ [Issue #1478](https://github.com/amadeus-dlc/amadeus/issues/1478)（enhancement / P2 — `git worktree add` の並列化）の2ユニット同時対応。
- 差分リフレッシュ（cid:reverse-engineering:c1）: フルスキャン不実施。区間9コミットの実装面（`team-up.sh` の diff 全文、tests 2件）を直読し、外部 agmsg スキル側の主張は前 intent の記録を**再実測して追認**した。
- 測定 ref: 本ファイル記載の file:line・件数はすべて observed `4a0f91ad0` の実ファイル直読、および repo 外・非バージョン管理の外部スキル `~/.agents/skills/agmsg/`（読取 2026-07-25）による。`git worktree add` の並列度別実測値は本 intent の `ideation/feasibility/feasibility-assessment.md`（測定 ref: `c4c9531ee`、隔離環境、実施後完全撤去）からの引用であり、本 scan では再実行していない。
- 更新した成果物: 本ファイル（鮮度ポインタ + 旧「現在: 260725-teamup-attach-latency」→履歴ラベル化、cid:reverse-engineering:c3-relabel）、`architecture.md`（PR #1477 の適用可否ガード現況、actas 移行後に検証が再発火する経路、`mux_attach` との順序関係、worktree 直列作成の位置づけ）、`code-quality-assessment.md`（#1384 の保護が現在不在、テストが sentinel を自前で書く構造、worktree 直列作成）、`code-structure.md` / `component-inventory.md`（`WATCHER_SKIP_ANNOUNCED` 等の追加と行番号の更新）、`re-scans/260725-teamup-launch-hardening.md`（新規）。`business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` は本 intent 由来の構造変化なしのため「変更なし、確認済み」一行のみ追記。
- Sensors: RE ステージの宣言センサー3種（required-sections / upstream-coverage / answer-evidence）は codekb 出力パスが sensor filter（`**/{amadeus-docs,intents}/**` と `**/*-questions.md`）に構造的に不適合で発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない**。代替として (1) 更新した全成果物の `## ` 見出しが 2 以上あることを `grep -c '^## '` で機械確認、(2) 上流入力（`ideation/feasibility/feasibility-assessment.md`、Issue #1476 / #1478、実コード file:line）の本文実参照を直接検証した。
- Delivery boundary: codekb 9成果物 + 本 intent の re-scan 記録のみ更新。実装・テスト・state・audit・生成配布物・commit・PR 操作は未実施。

## 実行メタデータ（履歴: 260725-teamup-attach-latency）

- Date: `2026-07-25`
- Base commit: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`（`re-scans/` の到達可能な observed のうち HEAD の祖先で距離最小。cid:reverse-engineering:rescan-base-ancestry）
- Observed commit: `ec624022ff65cc8b3912001f768bd66ec41a0e39`（= 現 HEAD、`git rev-parse HEAD` 実測）
- Base ancestry / distance: `git merge-base --is-ancestor <base> HEAD` exit 0、`git rev-list --count <base>..HEAD` = **125**
- 区間規模: `git diff --stat <base>..<observed>` = **1018 files changed, 274683 insertions(+), 4573 deletions(-)**（測定 ref: observed `ec624022f`）
- Scope: `amadeus-bugfix`、Depth Minimal、Test Strategy Minimal、Brownfield、単一 repo `amadeus`
- Focus: [Issue #1449](https://github.com/amadeus-dlc/amadeus/issues/1449) — `team-up.sh` 起動が約200秒かかる問題。**起動レイテンシの解消のみ**がスコープ。
- 症状（実 launch 実測、2026-07-25、3人構成 leader+engineer×2、隔離インスタンス `bench`）: `T+200.85s team-up.sh EXIT (rc=1)`、armed になったメンバー **0 / 3**、`ERROR: agmsg watcher never armed for: leader engineer-1 engineer-2 (after 1 re-send(s))`。Claude Code は3プロセスとも正常起動し `herdr agent list` 上 `agent_status: idle`。
- 根本原因（本 scan で独立に裏取り）: `verify_watchers_armed` が待つ ready sentinel は **actas モードの watcher しか書かない**が、`team-up.sh` が投入する初期プロンプトは `/agmsg mode monitor`（monitor モード）である。モード不一致により sentinel は**構造的に一度も生成されない** → 検証は常に全員 unarmed でタイムアウトし、`mux_attach` を待ち budget 全量ぶんブロックする。
- 測定 ref: 本ファイル記載の file:line・件数はすべて observed `ec624022f` の実ファイル直読、および外部 agmsg スキル `~/.agents/skills/agmsg/`（repo 外・非バージョン管理、読取時刻 2026-07-25）による。
- 更新した成果物: 本ファイル（鮮度ポインタ + 旧「現在: 260725-mirror-review-fixes」→履歴ラベル化、cid:reverse-engineering:c3-relabel）、`architecture.md`（actas/monitor モード不一致の機序を新設、260724 節の失効数値を訂正）、`code-quality-assessment.md`（「常に失敗する検証ゲート」= 検証劇場クラス + テストスタブによる検出不能性）、`code-structure.md`・`component-inventory.md`（HEAD 行番号への更新と欠陥所在の登録）、`re-scans/260725-teamup-attach-latency.md`（新規）。`business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` は本 intent 由来の構造変化なしのため「変更なし、確認済み」一行のみ追記（cid:reverse-engineering:c1）。
- Sensors: RE ステージの宣言センサー3種（required-sections / upstream-coverage / answer-evidence）は codekb 出力パスが sensor filter に構造的に不適合で発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わず**、H2 構成（各成果物の `## ` 見出し ≥2、直読確認）と上流入力参照（Issue #1449 / 実 launch 実測ログ / 実コード file:line）を直接検証した。
- Delivery boundary: codekb 9成果物 + 本 intent の re-scan 記録のみ更新。実装・テスト・state・audit・生成配布物・commit・PR 操作は未実施。

## 実行メタデータ（履歴: 260725-solo-standing-grants）

- Date: `2026-07-25`
- Base: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`
- Observed: `4491310cc0b432eb404524ef30a7d8a0a3f68f73`
- Focus: [Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466)
- Reference only: [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は凍結試作で参考のみ、実装前提にしない。
- Method: Developer scan の結論を Architect が canonical code と既存テストで照合し、shared CodeKB の先頭 current view と per-intent re-scan に合成。実装方式は確定していない。
- Conclusion: standing grant は監査イベントのまま維持する。solo route / report に grant identity がなく route / commit race がある。commit 時不適格には mutation 前の typed non-error human-approval fallback が必要。具体方式は未決定。
- Diff / verification: 373 files、`+71,339/-811`。grant core は base..observed で無変更、orchestrate plugin 系は `+109/-3` の同時編集面。関連178テスト、dist 6 harness check、promote 4面 check は成功。`bun run check` は `tsc: command not found`（exit 127）で未判定。
- Delivery boundary: 実装コード、intent state、memory、`intents.json`、generated dist は変更していない。

## 実行メタデータ（履歴: 260725-mirror-review-fixes）

- Date: `2026-07-25T01:35:20Z`
- Base commit: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`（この intent に先行記録がないため、到達可能な `re-scans/` の observed commit のうち HEAD に最も近い `260724-watcher-timeout-fix` を採用）
- Observed commit: `70336937529f5be31c011de5d368c0f03e534506`（[PR #1469](https://github.com/amadeus-dlc/amadeus/pull/1469) head、`git rev-parse HEAD` 実測）
- Base ancestry / distance: `git merge-base --is-ancestor <base> HEAD` exit 0、`git rev-list --count <base>..HEAD` = 49
- Scope: `amadeus-bugfix`、Depth Minimal、Test Strategy Comprehensive、Brownfield、単一 repo `amadeus`
- Focus: PR #1469 の検証済みレビュー修正面。Mirror lifecycle の未完了 outcome exit、prompt 回答 CLI 欠落と binding 不一致、legacy mutation verb、config safe read TOCTOU、state codec の未エスケープ C0 制御文字、Cursor/OpenCode coverage source 正規化、関連 tests/CI。
- Diff focus: `packages/framework/core/tools`、coverage helper/smoke test、`ci.yml` の23ファイル、`+10,319/-161`。正本コードの大宗は Mirror lifecycle 一式。
- Findings: [review thread 1](https://github.com/amadeus-dlc/amadeus/pull/1469#discussion_r3648935678)、[review thread 2](https://github.com/amadeus-dlc/amadeus/pull/1469#discussion_r3648935682)、[review thread 3](https://github.com/amadeus-dlc/amadeus/pull/1469#discussion_r3648935684) のP1 3件に、config/codec/coverage の実測3件を加えた6クラスタ。詳細は `architecture.md` と `code-quality-assessment.md`。
- Baseline: focused 7 test filesを `bun test` で実行し、127 pass / 0 fail / 274 expect()（16.68秒）。現行テストは green だが6欠陥条件を直接検証していない。
- Per-intent record: `re-scans/260725-mirror-review-fixes.md`
- Delivery boundary: codekb 9成果物とこの intent の re-scan 記録のみ更新。実装、tests、state、audit、生成配布物、commit、PR mutation は未実施。

## 実行メタデータ(履歴: 260725-kimi-harness)

- Date: 2026-07-25
- Observed at: `d31b8a5db5798ef761f3871ca66824c87530afb4`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260725-kimi-harness`(新ハーネス「kimi」/ `.kimi-code` を本 AI-DLC フレームワーク repo へ追加する intent)
- Scope: `amadeus-feature`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Focus: differential refresh + kimi ハーネス追加に向けた移植面(harness-porting surface)の再測定
- Method: differential refresh。base `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`(前回 scan `260724-watcher-timeout-fix` の observed)、observed `d31b8a5db5798ef761f3871ca66824c87530afb4`、`git merge-base --is-ancestor 6d4df9056 HEAD` exit 0、distance `git rev-list --count 6d4df9056..HEAD`=105。`260724-harness-provenance` の observed `2d0da11d` は現 HEAD の**非祖先**(exit 1、squash マージ着地で観測点が HEAD 系統に無い)のため base 不適格。記録済み observed のうち祖先かつ距離最小の `6d4df9056` を採用(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `d31b8a5db` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間件数(105)・diff 規模(624 files, +103965/−1957。非 record 295 files, +34617/−1957)はコマンド出力からの転記(numbers-from-command-output-only)。
- 現行結論: 区間の構造変化はハーネス関連 4 クラスタに集中。(1) **ハーネス検出クラスタの新規分離**(`58053fa61`): 新規 `packages/framework/core/tools/amadeus-harness.ts`(137 行、base 非存在)へ `HarnessType`(:5-12)/`HARNESS_DIR_TO_TYPE`(:14-22)/`KNOWN_HARNESS_DIRS`(:34-40)/`KNOWN_RULES_SUBDIR`(:53-57)と検出手続き群が `amadeus-lib.ts` から移管。lib は import(:7-14)+型 re-export(:15-18)+compat facade(:152-166)へ縮退(区間 +21/−99)し、呼び出し側契約は不変。(2) **plugin 同梱モデル変更**(`47d5e3f9c`): plugin は harness 中立バンドル `dist/plugins/<name>/` のみで出荷、per-harness `<harnessDir>/plugins/` 投影は廃止(`scripts/package.ts:316` `projectPluginsIntoHarnessTree` は read-source 会計のみの no-op)。`dist/plugins/formal-model-check/` が初のバンドル(base では `dist/plugins/` 非存在)。(3) **plugin 信頼層**(`f67b931c2` + `454194231`): `scripts/plugin-composition.ts`(+138/−15)に sha256 `contentDigest`・stage index 検証(`parseStages` :293)・journal 信頼付与(`validJournal` :813、sha256 形式 :826)・drop 時ドリフト拒否。(4) **intent birth での harness provenance 記録**(`dc1eeba20`): `amadeus-lib.ts` +78/−9、`amadeus-utility.ts` +3/−0、新テスト t269(unit+cli)/t270/t271 + t144-harness-seam.cli。**kimi 移植面の要点は 3 つの閉集合の非対称**: `scripts/plugin-projection.ts:46-53` `PACKAGE_HARNESSES`(6 面)vs 同 :59 `SELF_INSTALL_HARNESSES`(4 面)vs `amadeus-swarm.ts:100` `HARNESS_VALUES`(4 面、cursor/opencode を意図的除外 — kimi 追加は opt-in で `resolveDriver` :118-136 が未知値を fail-closed 拒否)。packager 本体は manifest 自動発見(`scripts/package.ts:85-91`、コメント :80-84)で新ハーネス追加に編集不要。`packages/framework/harness/` は base・HEAD とも同じ 6 dir で新ハーネス dir は区間内未追加。kimi の雛形は cursor/manifest.ts(75 行)と codex/emit.ts(375 行)。バージョンは `amadeus-version.ts:4` AMADEUS_VERSION="0.1.5"。
- Per-intent record: `re-scans/260725-kimi-harness.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260724-watcher-timeout-fix」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`code-structure.md`(amadeus-harness.ts 新規分離と lib facade 化 + kimi 移植面目録を先頭 current view に新設)、`component-inventory.md`(amadeus-harness.ts + plugin 信頼層コンポーネント登録 + 移植面を current view 化)、`architecture.md`(plugin 中立バンドル出荷モデル + 3 閉集合非対称を先頭 current view に新設)、`code-quality-assessment.md`(区間の新テスト t269/t270/t271/t144-harness-seam + t252 信頼層更新を current view に追記)、`re-scans/260725-kimi-harness.md`(新規)。他 body 4 成果物(business-overview / api-documentation / technology-stack / dependencies)は本文温存で「変更なし、確認済み」一行のみ追記(区間変化は 4 成果物のドメイン外。plugin-composition の node:crypto は stdlib で依存変化なし。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。kimi ハーネス本体の実装は未着手。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ（履歴: 260724-watcher-timeout-fix）

- Date: 2026-07-24
- Observed at: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260724-watcher-timeout-fix`([Issue #1449](https://github.com/amadeus-dlc/amadeus/issues/1449) — `packages/framework/core/tools/team-up.sh` の `verify_watchers_armed`(:1139-1178)が 1 メンバー unarmed で既定 `WATCHER_READY_TIMEOUT=90` 秒 ×(`WATCHER_RESEND_MAX=2`+1)= 最大 270 秒(4.5 分)`mux_attach` を構造上ブロックする性能問題。正常系はオーバーヘッドほぼゼロ = 実測 59.1ms)
- Scope: `amadeus-bugfix`(Depth Minimal)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、observed `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、`git merge-base --is-ancestor a81c11dde HEAD` exit 0、distance `git rev-list --count a81c11dde..HEAD`=155。base は祖先(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `6d4df9056` のワークツリー実ファイル直読、および repo 外 read-only の agmsg skill(`~/.agents/skills/agmsg/scripts/spawn.sh`)直読(cid:measurement-ref-in-artifacts)。diff 規模(1762 files, +217563/−3536。team-up.sh は 1462 行の新規パス、テスト 197 行)・配布 11 コピー・タイムアウト値(90×(2+1)=270)はコマンド出力からの転記(numbers-from-command-output-only)。
- 現行結論: 性能問題の核心は `packages/framework/core/tools/team-up.sh:1139-1178` `verify_watchers_armed` の二重ループ(外側 = 再送 `max_attempts = WATCHER_RESEND_MAX + 1` = 3 :1141、内側 = 1 秒刻みポーリング最大 `WATCHER_READY_TIMEOUT`=90 秒 :1156)が **:1442-1445 で :1448 `mux_attach` の直前に無条件実行**されること。1 メンバーでも armed しないと最大 90×3=270 秒 attach をブロックする。導入は区間内 2 コミット — `42c9341d8`(#1391、`verify_watchers_armed` 検証ロジック本体、#1384 修正)+ `0d24c6f93`(#1421、`scripts/team-up.sh` → `packages/framework/core/tools/` へ移動 + 配布 11 コピー生成、ロジック不変)。原因の所在=**設計(受容されたリスクの先送り)**: `260722-teamup-prompt-race/inception/requirements-analysis/requirements.md` FR-4(:17)で 90 値を `spawn.sh:132 READY_TIMEOUT=90` verbatim に接地(根拠あり)、FR-3 [e4] 留保(:16)で「起動レイテンシが将来問題化した場合のみ `--no-wait` を再検討」と本問題を予見・先送り、FR-5 [e5] 留保(:18)で「exit code 分岐は mux_attach より前に検証完了が前提」と attach 前ブロックを契約化。実装は設計どおりで逸脱なし。agmsg spawn.sh(:576-588)は**単発 90 秒待ちで再送ループ無し**(値は一致・構造は非対称、team-up.sh が独自に ×3 増幅)。テストは `WATCHER_READY_TIMEOUT: "0"`(test:79)でタイミングを無被覆。区間 a81c11dde..HEAD のバグ面はこの 2 コミットに限局し、他 codekb body 成果物(architecture 除く新規知識は本欠陥クラスタのみ)のドメインは不変。
- Per-intent record: `re-scans/260724-watcher-timeout-fix.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260723-marker-heading-exemption」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`code-quality-assessment.md`(#1449 の性能欠陥「watcher arming 検証が mux_attach を最大 270 秒ブロック」節を先頭 current view に新設)、`architecture.md`(agmsg watcher arming 検証の launch シーケンス上の位置と mux_attach ブロッキング機序を新設)、`code-structure.md`(team-up.sh の packages 昇格 + watcher 検証関数群の配置)、`component-inventory.md`(`verify_watchers_armed` ほか watcher 検証コンポーネント群の登録)、`re-scans/260724-watcher-timeout-fix.md`(新規)。他 body 4成果物(business-overview / api-documentation / technology-stack / dependencies)は本文温存で「変更なし、確認済み」一行のみ追記(#1449 は既存 bash ツールの制御フロー性能問題でドメイン外。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。区間フォーカス正本変更は #1391/#1421 の既着地分のみで、本 intent の修正は未着手。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260724-harness-provenance)

- Date: 2026-07-24T11:34:46Z
- Observed at: `2d0da11d022565bf4a613da9fbcccf078716f8f4`
- Intent: `260724-harness-provenance`([Issue #1452](https://github.com/amadeus-dlc/amadeus/issues/1452) — AI ハーネス種別を `amadeus-state.md` / stage `memory.md` に記録する機能)
- Scope: `amadeus-feature`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、observed `2d0da11d022565bf4a613da9fbcccf078716f8f4`、distance 186。Developer スキャン→Architect 合成の直列。
- 現行結論（当時）: provenance 機能の seam は、birth-time の state template、4見出しを保つ memory diary、既存 harness-dir resolver、bun 書込に非発火の sensor 境界に限定される。
- Per-intent record: `re-scans/260724-harness-provenance.md`
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。

## 実行メタデータ(履歴: 260723-marker-heading-exemption)

- Date: 2026-07-23T01:37:10Z
- Observed at: `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260723-marker-heading-exemption`([Issue #1296](https://github.com/amadeus-dlc/amadeus/issues/1296) — required-sections センサーの汎用 ≥2-H2 floor が単一行 timestamp / [Answer] 様式 questions の marker 成果物へ無条件適用され、意図的に H2 を欠く marker が常に `pass:false` になる。既決ノルム E-FVEPD が要求する marker 免除がセンサー実装に未反映)
- Scope: `bugfix`(Depth Minimal)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`(直近 freshness pointer `re-scans/260722-teamup-prompt-race.md` の observed)、observed `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`、`git merge-base --is-ancestor a81c11dde HEAD` exit 0、distance `git rev-list --count a81c11dde..HEAD`=13。base は祖先かつ距離最小(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `ffc79aad9` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。diff 規模(96 files, +7226/−17。非 record 51 files, +1660/−16)・stage marker 20件・intents corpus 391 questions+22 timestamp・配布 11コピー×2 はコマンド出力からの転記(numbers-from-command-output-only)。
- 現行結論: #1296 の根本原因は `amadeus-sensor-required-sections.ts:141` の `pass = h2_count >= 2` が全成果物へ**無条件適用**され、marker(単一行 timestamp / [Answer] questions)を免除する分岐が不在なこと。ELIGIBILITY GATE(`:167-186`、stem 判別 `:173`)は template 面のみ免除し floor は維持(`:184-185` verbatim `keeping the generic >=2-H2 floor.`)。再利用候補は `amadeus-graph.ts:801-808` `templateEligibleArtifacts` の suffix 弁別(`!a.endsWith("-questions")` / `!a.endsWith("-timestamp")`)で、これは既決規範 E-FVEPD(cid:practices-discovery:e-fvepd-marker-heading-floor)が要求する挙動そのもの — 規範は免除を要求するがセンサーが未実装という乖離。修正は「文書化済み仕様への回復」であり仕様変更ではない。再現(read-only 診断): timestamp marker で `{"pass":false,"h2_count":0,"findings_count":2}`、questions marker でも同様に floor FAIL。原因の所在=**実装**(規範 E-FVEPD が定めた免除挙動をセンサースクリプトが実装していない)。区間 a81c11dde..HEAD の非 record 差分(`scripts/team-up.sh` ほか)はバグ面と無交差でセンサー正本・graph・manifest・stage marker 宣言は不変。
- Per-intent record: `re-scans/260723-marker-heading-exemption.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260722-teamup-prompt-race」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`code-quality-assessment.md`(#1296 の欠陥クラス「marker 成果物への required-sections floor 誤適用」節を先頭 current view に新設、旧「現在」= 260722-teamup-prompt-race を履歴へ降格)、`re-scans/260723-marker-heading-exemption.md`(新規)。他 body 7成果物(architecture / code-structure / component-inventory / technology-stack / api-documentation / business-overview / dependencies)は**本文温存**で、先頭の 260722 current marker「(…、現在)」→「(…、履歴)」の label のみ降格(c3-relabel — 単一 current view を code-quality + 本鮮度ポインタに一意化。#1296 のセンサー面はこれら7成果物のドメイン外で新規節なし)。実質の新規知識は「required-sections floor が marker を無条件 FAIL させる+graph suffix 弁別が再利用可+E-FVEPD 規範との乖離」の1クラスタのみで code-quality-assessment + per-intent record に集約(区間非交差でセンサー正本・graph・manifest・stage marker は不変。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。区間フォーカス正本変更0件のため dist 11コピーは base と同一。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260723-t241-ci-residency)

- Date: 2026-07-23T00:57:42Z(scan-notes 実行時刻の転記)
- Observed at: `78bce87615b985d0151f604c915c6aab1d6ba9f1`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260723-t241-ci-residency`([Issue #1294](https://github.com/amadeus-dlc/amadeus/issues/1294) — `tests/e2e/t241-election-machine-executor.test.ts` のヘッダが「CI-resident」(FR-0 機械実行器の常設証明、ADR-6 layer (i))を自称するが、PR CI(`--ci`)は e2e 層を実行しない)
- Scope: `bugfix`(Depth Minimal)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`(前回 scan `260722-teamup-prompt-race` の observed)、observed `78bce87615b985d0151f604c915c6aab1d6ba9f1`、`git merge-base --is-ancestor` exit 0、distance `git rev-list --count base..HEAD`=35。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `78bce876` のワークツリー実ファイル直読(Developer scan、cid:measurement-ref-in-artifacts)。区間件数(35)・diff 規模(224 files, +10774/−16)はコマンド出力からの転記(numbers-from-command-output-only)。
- ★本バグ面は base..HEAD で無変更: `git diff --numstat <base>..HEAD -- tests/e2e tests/run-tests.ts tests/run-tests.sh tests/gen-coverage-registry.ts .github/workflows package.json` = **0 行(出力空)**。欠陥コード(t241 の e2e 配置・CI tier 定義・ワークフロー)は base より前(intent `260718-election-ts-foundation`、導入 PR #1235)に導入済みで、差分リフレッシュ区間 35 コミットとは無交差。差分リフレッシュとしては「バグ面ドリフトなし」を確定。
- 現行結論: `tests/e2e/t241-election-machine-executor.test.ts` はヘッダ(:1 verbatim `// t241 — FR-0 machine executor (ADR-6 layer (i), CI-resident, Bolt 4).`)で「CI-resident」、本文(:4-5)で「strongest standing proof of FR-0」を自称するが、`tests/e2e/` 配置ゆえ自動 CI で非実行。`--ci`(`run-tests.ts:197-202`)は smoke+unit+integration のみ(runE2e 非設定)、e2e は `--release`/`--all`(:203-211)= ローカル手動用の `test:all`(package.json:14-16)のみ。`ci.yml`(:114/:152/:227 が `test:ci`/`coverage:ci`)・`release.yml`(test ステップ無し)・`formal-verification.yml`(:12 workflow_dispatch)いずれも `--e2e`/`--release`/`test:all` 0 ヒットで e2e 非実行。**決定的原因所在は実装逸脱**: ADR-6(`application-design/decisions.md:41-48`)Decision が layer (i) 機械実行器を「integration テストで固定する」と明記しているのに、実装(#1235)が `tests/e2e/` に配置し CI 実行範囲との整合検証を欠いた(cid:bug-intent-linkage、原因所在=設計は正・実装が逸脱)。回復先の実在: integration に election CLI spawn 兄弟 6 本既存(t235/t236/t240/t242/t244 + t-formal-verif-arm-s-blind、`--ci` で CI 実行済み)、t241 は spawnSync+fs→`classifyTestSize`=medium で integration MAX=medium に適合(clean)、`gen-coverage-registry.ts` 未登録。sibling t237(:1-5「Layer: e2e」)は CI-resident 非自称の健全対照。
- Per-intent record: `re-scans/260723-t241-ci-residency.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260722-teamup-prompt-race」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、codekb body 8成果物(先頭 current view に本 intent の外科的追加、旧「現在」節は履歴へ降格 — bugfix Minimal 相応で本文温存)、`re-scans/260723-t241-ci-residency.md`(新規)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260722-teamup-prompt-race)

- Date: 2026-07-22T22:03:26Z
- Observed at: `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`(現 HEAD `git rev-parse HEAD` 実測一致)
- Intent: `260722-teamup-prompt-race`([Issue #1384](https://github.com/amadeus-dlc/amadeus/issues/1384) — `scripts/team-up.sh` の fresh セッションで初期プロンプト `/agmsg mode monitor` が Claude Code TUI 起動レースで消失し watcher が起動しない。再現率 5/6)
- Scope: `bugfix`(Depth Minimal)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、`git merge-base --is-ancestor` exit 0、distance `git rev-list --count base..HEAD`=101。日付がより新しい非祖先 observed(`545e69c8` 等)は exit 1 で除外(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `a81c11dde` のワークツリー実ファイル直読、および repo 外 read-only の agmsg skill(`~/.agents/skills/agmsg/`)直読(cid:measurement-ref-in-artifacts)。区間件数(101)・diff 規模(2593 files, +349417/−5289)はコマンド出力からの転記(numbers-from-command-output-only)。
- 現行結論: `scripts/team-up.sh` の claude member 起動経路は初期プロンプト `/agmsg mode monitor` を一発勝負で渡し(`:800` init_prompt 固定、`:830-832` 起動組立、`run-claude.sh` 末尾 `exec claude ... "$@"`)、TUI 起動レースで取りこぼされても再送・検証が一切ない。pane 起動(`:429`/`:447`)は cmd を一度 exec するのみ、`start_safety_wait_supervisors()`(`:338-395`)は `:340` `[ "$RUNTIME" = "codex" ] || return 0` で claude runtime には readiness 検証が構造的に不在。対照として agmsg `spawn.sh:576-588` は ready センチネル(`agmsg_ready_path` `lib/actas-lock.sh:69-73`、touch 側 `watch.sh:294-310`)出現までブロックする handshake を持つ(default `--ready-timeout` 90s `spawn.sh:46-47`)。原因の所在は**設計(一般化漏れ)**: 直近 intent `260721-teamup-safety-wait` が起動後の pane readiness 検証を Codex 専用に新設(`team-up.sh:212-395`,`:1259` + 新規 `team-up-codex-safety-wait.ts` +567)したが claude 経路へ一般化せず、watcher arming の回帰テストも現状ゼロ(既存 team-up テストは init_prompt/`agmsg mode monitor`/ready/watch を参照しない)。
- Per-intent record: `re-scans/260722-teamup-prompt-race.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「現在: 260720-upstream-sync-230」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、codekb body 8成果物(先頭 current view に本 intent の外科的追加、旧「現在」節は履歴へ降格 — bugfix Minimal 相応で本文は温存)、`re-scans/260722-teamup-prompt-race.md`(新規)。
- Delivery boundary: 実装・修正コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260720-upstream-sync-230)

- Date: 2026-07-20T06:43:32Z
- Observed at: `545e69c836d46f7bec2fa351c8e668026eb5fad5`
- Intent: `260720-upstream-sync-230`（upstream `awslabs/aidlc-workflows` v2.2.0→v2.3.0 の承認済み24 ADOPT/ADAPT を Amadeus へ同期）
- Scope: `amadeus`（Depth Standard / Test Strategy Comprehensive）
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering` (2.1)
- Method: differential refresh。base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `545e69c836d46f7bec2fa351c8e668026eb5fad5`、`git merge-base --is-ancestor` exit 0、distance 32。次点 `591b6a2a` は distance 84、日付が新しい非祖先 observed は exit 1 で除外。
- Focus: plugin/schema/package/compose/test/docs、6 harness 適応を含む24 ADOPT/ADAPT。SKIP 6件は EQUIVALENT/生成物/フォーク固有として境界維持。
- Measurement ref: Developer scan の observed HEAD 実ファイル直読。差分865 files、`+48,636/-241`、core tools 30、hooks 11、agents 14、stages 32、sensors 5、harness 69 files/6面、TS 621、tests 461。詳細 file:line と24判定は `architecture.md` 、品質検査は `code-quality-assessment.md` に記録。
- Current conclusion: MISSING 19 / PARTIAL 4 / EQUIVALENT 候補 1。明確な縮小候補は `swarm-batch-advance`、`gate-next-stage-naming` は PARTIAL、plugin 機構が最大 block。
- Updated artifacts: body 8成果物、本 freshness pointer、`re-scans/260720-upstream-sync-230.md`。既存本文は履歴として温存し、先頭の current view のみ追加／更新。
- Delivery boundary: 実装コード、dist/self-install 再生成、commit、PR 操作は本 scan で未実施。
- Base source of truth: 本 intent の per-intent record。共有 timestamp は freshness pointer であり、次回の differential base は `re-scans/` の到達可能 observed から決める。

## 実行メタデータ(履歴: 260720-formal-verif-experiment)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `1865bc902ff5ecb1e51caefc339aae18e015431b`(`git rev-parse HEAD` 実測一致。merge commit — origin/main 取込後の断面)
- Intent: `260720-formal-verif-experiment`(選挙 CLI に対する形式検証(PBT / モデル検査)実験ハーネスの実現可能性 RE。既知5欠陥 #1268 / #1273 三系 / #1277 を「型緑・意味赤」の外科的注入面として使い検出力を実証する実験の下地観測)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。`re-scans/*.md` 43ファイルを `Observed at` / `Observed commit` / 既存小文字ヘッダの様式差込みで全数走査し、観測 SHA を抽出できた42ファイルの祖先性と距離を機械照合した。自己 scan を除く距離最小の祖先 observed は `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`260719-goa-multiseg-ecode` / `260719-cursor-complete-clear`、`git merge-base --is-ancestor a326f47bc 1865bc902` exit 0、`git rev-list --count a326f47bc..1865bc902`=**29**)であり、これを base に採用(rescan-base-ancestry)。非祖先 observed `c2e4975ff` の merge-base `bd147dc7b`(距離47)を使った旧選定を訂正した。observed=`1865bc902`。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `1865bc902` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間件数(29)はコマンド出力からの転記(numbers-from-command-output-only)。区間フォーカス変更は3コミット(#1268=`ea6acac53` / #1273=`a6f4a4522` / #1277=`e1fd1826b`)・4ファイル(model / store / record / 本体。transport は変更0件)で、いずれも本実験が再注入対象とする既知5欠陥の修正そのもの。
- 現行結論: 選挙 CLI 5ファイル(model 464 / store 261 / record 224 / transport 207 / 本体 589 = 計1745行)に対し、既知5欠陥(#1268 winner=GoA 軸 model :445-463 / #1273-2a invalid-timestamp model :253 / #1273-2b amend 経路 `parseKindRef`:194-203・store :150-158 / #1273-2c per-voter `resolveBallots` model :431・本体 :381,:459 / #1277 timeline record :212-213)はいずれも**型緑・意味赤の外科的注入が可能**で、4欠陥が分離可能性=高・2b のみ中(2b/2c は意味連鎖)。選挙テスト(unit t234/t238/t239・integration t235/t236/t240/t242・e2e t237/t241)に **fast-check 使用ゼロ**、PBT 参照様式は setup-semver/setup-manifest/t204 の3本(固定 `PBT_SEED`・`numRuns` 100・`AMADEUS_PBT_DEEP=1` で 50k・dist コピー import の unit 層)。CI 面: `ci.yml` の `test:ci` は smoke+unit+integration のみで e2e 除外(package.json:15)、**t241(機械実行器)は「CI-resident」自称(:2-6)だが PR CI で未実行 = FR-0 意図との乖離(確信度高)**。実験ハーネスは unit/integration 層配置で CI+coverage 両ゲートに載る。CLI `--project` override(本体 :577-578)実在で scratch 隔離可能。原因の所在=**実験下地の観測**(バグ修正でなく形式検証実験の feasibility 確認)。
- Per-intent record: `re-scans/260720-formal-verif-experiment.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260720-diary-autogen-guard」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260720-formal-verif-experiment.md`(新規)。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 選挙 CLI 詳細は re-scans 管轄で `architecture.md`/`code-structure.md` と矛盾なし、実質の新規知識は 5欠陥の注入面確定・fast-check 不在と PBT 参照様式・t241 の CI-resident 自称と PR CI e2e 非実行の乖離・`--project` override による scratch 隔離の1クラスタのみで per-intent record に集約。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間フォーカス正本には既知5欠陥を修正した3コミット・4ファイルの変更があり、Observed の現行断面から逆変換可能な注入面を確定した。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260720-diary-autogen-guard)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `0b11036d5d990c9f5de98dc172222d8e2df4928a`(`git rev-parse HEAD` 実測一致、engineer-1 worktree)
- Intent: `260720-diary-autogen-guard`([Issue #1279](https://github.com/amadeus-dlc/amadeus/issues/1279) — stage diary 自動生成が engineer-1 環境でのみ無音不発。同スコープ・同コードの engineer-3 は全ステージ ✅)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`37f8cf5e67cef77adfd82ef292303790f756c8fd`(直前の鮮度ポインタ `re-scans/260720-ballot-received-at.md` の Observed、全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor 37f8cf5e6 HEAD` exit 0 実測、`git rev-list --count 37f8cf5e6..HEAD`=**17**。tally observed `262a86db9`=dist33・record 宣言 base `a326f47bc`=dist53 はいずれも祖先だが非最小のため base に採らず。rescan-base-ancestry / 距離最小の祖先を採用)、observed=`0b11036d5d990c9f5de98dc172222d8e2df4928a`。区間 `37f8cf5e6..HEAD`=17コミットは全て `record(ballot-received-at)` 工程記録+1 audit で、フォーカス正本 `amadeus-orchestrate.ts`(chokepoint :1168-1172)・`amadeus-lib.ts`(`relativeRecordDir`/`activeIntent`/`resolveProjectDir`)への `git log 37f8cf5e6..HEAD -- <両ファイル>`=**0件** = Observed=HEAD ワークツリー実測が base 断面と同一。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、確約級引用4クラスタ(`resolveProjectDir`:211-235 / `activeIntent`:1059-1084 / `relativeRecordDir`:1217-1226 / chokepoint `amadeus-orchestrate.ts`:1172 + `codekbCtxFor`:889-891)を独立スポット再実測し反証なし)。
- 測定 ref: 全 file:line は Observed=HEAD `0b11036d5` の engineer-1 worktree 実ファイル直読(cid:measurement-ref-in-artifacts)。intent-dir 件数(e1=46)はコマンド出力からの転記(numbers-from-command-output-only)。環境固有バグのため決定的再現は scratchpad の read-only probe のみ(正本・配布コピー未改変、instrumentation-syntax-check 準拠、cwd 変更・checkout/stash/reset・record/state 書換 verb 不使用)。
- 現行結論: diary 自動生成の可否は chokepoint の guard `if (recordPrefix !== null && codekbCtx) ensureStageDiary(...)`(`amadeus-orchestrate.ts:1172`)で決まり、**❌ 枝は例外なく `recordPrefix === null`**(`codekbCtx` は `codekbCtxFor` :889-891 が常に object を返すため実 `next` 経路では never falsy — 除外)。`recordPrefix === null ⟺ activeIntent(pd) === null`(`relativeRecordDir`:1224 が null を返す)。e1 は intent record dir が46件あり lone-intent fallback(`activeIntent`:1080 `records.length === 1`)は発火しないため、`activeIntent` は `active-intent` cursor 解決に完全依存する。**pd(projectDir)が本質の可変軸**: `resolveProjectDir`:211-235 の優先順は ①--project-dir ②`CLAUDE_PROJECT_DIR` env ③script-path ④cwd で、②が③より先に効くためエンジンの pd は当該セッションの `CLAUDE_PROJECT_DIR` に支配される。cursor 非解決ツリー(main checkout=cursor 不在等)を指すと `activeIntent(pd)=null → recordPrefix=null → diary 無音 skip`。read-only probe で pd 差のみによる ✅/❌ の決定的反転を実証(e1 worktree=FIRES / main checkout=SKIPPED)。設計欠陥は guard が「pre-birth の正当 skip」と「intent 実在だが cursor/pd 解決失敗のバグ skip」を**無音で混同**すること(template-missing 枝は stderr 警告 :1121 を出すのに本 skip は無警告)。非対称性: audit/report/state 系は `--intent <record>` 明示アンカー(`amadeus-audit.ts:433`)で cursor 非依存のため、260719-tally の RE audit は tally 正シャードに着地しており「audit は正シャード・diary だけ不発」を説明する。原因の所在は**設計**(diary chokepoint に audit 同様の明示 intent アンカーを持たせず ambient cursor 解決のみに依存させた設計判断)。
- Per-intent record: `re-scans/260720-diary-autogen-guard.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260720-ballot-received-at」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260720-diary-autogen-guard.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「diary chokepoint guard が cursor/pd 非解決を無音 skip し pre-birth 正当 skip と混同+diary 経路が audit と非対称に ambient cursor 依存+pd 解決が `CLAUDE_PROJECT_DIR` 支配で環境固有」の1クラスタのみ。これは bugfix の環境依存挙動欠陥であり構造・API・依存・技術スタックの変化を伴わず、フォーカス正本の区間変更0件で本文と矛盾しない。詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間フォーカス正本変更0件のため dist ツリーは base と同一。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260720-hold-choice-resolution)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `f6ab1e48d321e11ab6355fa315d505e28bd0273b`(`git rev-parse HEAD` 実測一致、subject = `record(hold-choice-resolution): approval-handoff approved (ideation complete)`)
- Intent: `260720-hold-choice-resolution`([Issue #1267](https://github.com/amadeus-dlc/amadeus/issues/1267) — 選挙 CLI の hold-resolution に勝者 choice 指定を追加する。多肢 choice tie 由来の hold を人間解決する際、二値語彙 adopted/rejected では勝者 choice を表現できないギャップ。E-TCRCG e4 留保の履行)
- Scope: `amadeus`(enhancement — bugfix ではない)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小 = `re-scans/260719-ballot-failclosed-amend.md` の Observed。`git merge-base --is-ancestor 6f2455c43 f6ab1e48d` exit 0 実測、`git rev-list --count 6f2455c43..f6ab1e48d`=**87**)、observed=`f6ab1e48d321e11ab6355fa315d505e28bd0273b`。より新しい re-scan observed `37f8cf5e6`(260720-ballot-received-at)・`262a86db9`(260719-tally-choice-ruling)は本 HEAD の**非祖先**(`--is-ancestor` exit 1、並行 intent の squash tip)につき base 候補から除外(cid:reverse-engineering:rescan-base-ancestry / re-timestamp-merge-resolution)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、確約級引用5クラスタ+区間交差の帰属を独立スポット再実測 = **1点反証**あり)。
- 測定 ref: 全 file:line は Observed=HEAD `f6ab1e48d` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間変更は `git log/diff 6f2455c43..f6ab1e48d -- <path>`、crossing 帰属は `git blame`/`git show 6f2455c43:<file>` で実測。実データ census は本 worktree(engineer-2、`f6ab1e48d`)の `amadeus/**/elections/**/tally.json` 実測。
- 現行結論: 本 intent は**enhancement**(scope `amadeus`)で原因所在の該当なし。多肢 choice tie の hold(`model.ts:456` `{kind:"hold", reason:"tie"}`)を人間解決するとき、resolution 語彙 `tie: {adopted, rejected}`(`election.ts:70`、二値)は**勝者 choice を表現できない**。裁定は `rulingOverride`(`election.ts:389-393`)で `採用`/`不採用` へ二値写像され勝者 choice ラベルが描画に出ない。#1267 は `--resolution choice:<internalNo>` 形の受理を `renderPersistDraft` の winner 描画経路(`record.ts:120-131` established winner label 相当)へ合流させ、human-ruling-persist-through 準拠で record.md 反映まで実装する。拡張5面(語彙テーブル `election.ts:69-74` / fail-closed 検証 `:201-208` / 二値写像 `:389-393` / 永続 `HoldResolution` 型 `:89-94` / tie 発生源 `model.ts:442-456`)はすべて Observed に実在し機序確定。**1点反証(区間交差)**: Developer scan の「rulingOverride 本体は未変更(Bolt 4 由来)」は誤り — `rulingOverride`(`election.ts:389-393` + `record.ts:155/159` param)は区間内の **#1268(`ea6acac53`、2026-07-20)が `effective:TallyResult` established 合成から再形成した直近変更面**(`git blame` / `git show 6f2455c43:` 実測)。HOLD_RESOLUTIONS(:69-74)・handleHoldResolved(:190-226)の未変更判定は正しい。tie hold・resolution の本番実績ゼロ(本 worktree tally.json 51件は全て旧 outcome スキーマ、hold 0/winner-schema 0/非空 resolutions 0。Developer leader-tree 計数 62 との差は worktree ref 差で定性結論は一致)、tie hold-resolved / 採用分岐 / tie resolution 検証のテストも全欠落。e4 バッチ面(GoaLineCode/renderGoaLine/handleOpen/norm-metrics)は関数レベル非交差を裏取り。
- Per-intent record: `re-scans/260720-hold-choice-resolution.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260720-ballot-received-at」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260720-hold-choice-resolution.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「hold-resolution が tie 勝者 choice を表現できない enhancement ギャップ + 拡張面 rulingOverride が #1268 の直近変更面である crossing 事実 + tie hold/resolution の本番・テスト双方の空白」の1クラスタのみ。既存機構への機能追加であり構造・API・依存・技術スタックの現状を変えず、詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間 `scripts/` は #1268/#1273/#1277 の3本が変更しているが、本 intent の実装は未着手。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260720-ballot-received-at)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `37f8cf5e67cef77adfd82ef292303790f756c8fd`(`git rev-parse HEAD` 実測一致)
- Intent: `260720-ballot-received-at`([Issue #1262](https://github.com/amadeus-dlc/amadeus/issues/1262) — agmsg 中継票に受理側機械時刻 `receivedAt` が無く、中継遅延で timeline の `at` 列が非単調化し、正当な選挙が verify の `timeline-order` finding で完走不能になる)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`262a86db9b2a47b59ac0b1287e540295ca212378`(直近 re-scan `re-scans/260719-tally-choice-ruling.md` の Observed、全 `re-scans/*.md` observed のうち HEAD 祖先。`git merge-base --is-ancestor 262a86db9 HEAD` exit 0 実測)、observed=`37f8cf5e67cef77adfd82ef292303790f756c8fd`。区間 `262a86db9..HEAD`=16コミットだが `git log 262a86db9..HEAD -- scripts/ tests/ packages/`=**0件**(全て `record(tally-choice-ruling)` の工程記録コミット)で、フォーカス正本 `scripts/amadeus-election*.ts`+`tests/` は区間内無変更 = Observed=HEAD ワークツリー実測が base 断面と同一(rescan-base-ancestry 準拠)。#1268(tally winner 化)は本ブランチの区間には未着地(`scripts/` diff 0件で確認)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、確約級引用3クラスタ+反証2 grep を独立スポット再実測し反証なし)。
- 測定 ref: 全 file:line は Observed=HEAD `37f8cf5e6` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。回避運用の非単調実データは leader tree のリードオンリー実測(正規化コミット `5e96f8766`)、e2 交差は e2 worktree(branch `team/.../engineer-2` @ `67cf31165`)のリードオンリー実測。
- 現行結論: バグの一次原因は `scripts/amadeus-election-store.ts` の `appendBallot` が timeline イベントの `at` に投票者自己申告時刻 `ballot.submittedAt` をそのまま書く(:156 late lane / :166 normal lane、verbatim 再実測済み)ことにある。受理側機械時刻 `receivedAt` は scripts/tests/packages 全域 **0件**(反証 grep 実測)。verify の `verifySelf`(`amadeus-election-record.ts:179-183`、隣接 `at` の辞書式単調検査)が agmsg 中継票(sender submittedAt 保持のまま受理遅延)と CLI 直接票の混在で `cur < prev` を検出し `timeline-order` finding を返すため、`handleVerify`(`amadeus-election.ts:456-457`)が fail=exit 1 → 状態機械が `recorded`(=done)へ遷移不能。原因の所在は**設計** — timeline の時刻軸として submittedAt(投票者申告)を採用し受理境界の機械時刻を捨てる設計判断が intent `260718-election-ts-foundation`(Bolt 1〜4)でなされ、中継 vs 直接混在シナリオが requirements/functional-design/テストで未固定。distributed(`election.ts:304` `at: d.result.value.record.at`)/tallied(`store.ts:228` `at: talliedAt`)は既に機械時刻を使う非対称(symmetric-pair-review クラス)。実害は E-BFARA1/2/3(2026-07-19)で顕在化し、ユーザー承認のうえ timeline 配列を `at` 昇順ソート(時刻値不変・並び正規化のみ)して verify 通過させる暫定運用で回避(leader コミット `5e96f8766`)。e2 `260719-ballot-failclosed-amend`(#1252/#1253)と同一3ファイル(`amadeus-election-model.ts`/`-store.ts`/`.ts`)を編集する高交差=直列化 or merge 協調前提。
- Per-intent record: `re-scans/260720-ballot-received-at.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260719-tally-choice-ruling」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260720-ballot-received-at.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「timeline の `at` が submittedAt 軸で受理境界機械時刻を捨てる+verify 単調性検査が中継/直接混在で偽 fail+受理側 receivedAt の絶対不在(distributed/tallied との非対称)」の1クラスタのみ。これは bugfix の挙動欠陥であり構造・API・依存・技術スタックの変化を伴わず、フォーカス正本の区間変更0件で本文と矛盾しない。詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間 `scripts/` 変更0件のため dist 16ツリーは base と同一。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260719-tally-choice-ruling)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `262a86db9b2a47b59ac0b1287e540295ca212378`(`git rev-parse HEAD` 実測一致)
- Intent: `260719-tally-choice-ruling`([Issue #1261](https://github.com/amadeus-dlc/amadeus/issues/1261) — 選挙 CLI の `tally` が `choiceInternalNo` を裁定導出に使わず、多肢選挙で choice 多数を無視して GoA favor/against のみで outcome を決める)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`a326f47bc0146a3b4285552f42b92fd61fb343a7`(直近 re-scan `re-scans/260719-goa-multiseg-ecode.md` の Observed、全 `re-scans/*.md` observed のうち HEAD 祖先。`git merge-base --is-ancestor a326f47bc HEAD` exit 0 実測、`git rev-list --count a326f47bc..HEAD`=**20**。rescan-base-ancestry / 距離最小の祖先を採用)、observed=`262a86db9b2a47b59ac0b1287e540295ca212378`。区間 `a326f47bc..HEAD`=20コミットだが `git log a326f47bc..HEAD -- scripts/`=**0件**(工程記録+delegate 取込のみ)で、フォーカス正本 `scripts/amadeus-election*.ts` は区間内無変更 = Observed=HEAD ワークツリー実測が base 断面と同一。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、確約級引用3点を独立スポット再実測し反証なし)。
- 測定 ref: 全 file:line は Observed=HEAD `262a86db9` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。E-GMEBT 実データは leader tree `55af93d95` の `elections/E-GMEBT/` リードオンリー実測。区間変更は `git log a326f47bc..HEAD -- <path>` で実測。
- 現行結論: バグの一次原因は `scripts/amadeus-election-model.ts:321` `tally(_election, ballots)` が第1引数 election を明示 underscore で捨て、`choiceInternalNo` を裁定導出に一切参照せず GoA の favor/against 集計(FAVOR={1,2,3,6} / AGAINST={7,8})だけで `outcome:"adopted"|"rejected"` を決めること(:334-335)。`TallyResult`(:312-314)は choice 内訳フィールドを持たない。原因の所在は**設計** — tally は intent `260718-election-ts-foundation` Bolt 1 walking-skeleton の "minimal tally"(GoA-only)として導入され、以後の Bolt でも choice 集計が設計されなかった設計時欠落。choice は受理(model.ts:198)→ store(store.ts:161)→ materialize(store.ts:223)まで運ばれるが、tally で脱落し render(record.ts:107 rulingText は outcome のみ)へ流れる。verify(election.ts:440)は tally を recompute するため**修正は tally 一点に集約すれば verify も自動追随**する。隣接ギャップ: `Ballot.parse`(:184-204)の5分類 fail-closed に `unknown-choice` 照合がなく、unknown-voter と対称の欠落(symmetric-pair-review クラス)。実害は E-GMEBT で顕在(全票 GoA2 で favor=3/against=0 → `adopted` 誤描画、正は choice 多数 2-1 で不採用。leader 注記でユーザー裁定「不採用」へ是正済み)。tally 呼び出しは t234 の7箇所のみ(fixture は choiceInternalNo:1 固定)、choice 多数決の assert は全域0件。e2 `260719-ballot-failclosed-amend` と同一関数 `tally`(母集団 per-voter 化)+`Ballot.parse`(分類追加)で**強交差=直列化前提**。
- Per-intent record: `re-scans/260719-tally-choice-ruling.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260719-goa-multiseg-ecode」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260719-tally-choice-ruling.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「tally が choice-blind で裁定を導出+検証チェーン(verify recompute)が tally 修正に自動追随+受理段の unknown-choice 対称欠落」の1クラスタのみ。これは bugfix の挙動欠陥であり構造・API・依存・技術スタックの変化を伴わず、フォーカス正本の区間変更0件で本文と矛盾しない。詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。区間 `scripts/` 変更0件のため dist 20ツリーは base と同一。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260719-ballot-failclosed-amend)

- Date: 2026-07-20(Asia/Tokyo)
- Observed at: HEAD `6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`(`git rev-parse HEAD` 実測)
- Intent: `260719-ballot-failclosed-amend`(選挙 CLI の ballot 受理境界における fail-open / kind 無差別集計の RE。Issue #1252/#1253。本 intent は ideation 起点)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`591b6a2a222357f41061128f1b5a93c7f7a877be`、observed=`6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`。祖先性 `git merge-base --is-ancestor 591b6a2a2 6f2455c43` **exit 0 実測**、距離 `git rev-list --count 591b6a2a2..6f2455c43`=**65**。非祖先 observed(並行 squash tip 等)は base 候補から構造的に除外(cid:reverse-engineering:rescan-base-ancestry / re-timestamp-merge-resolution)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証ゼロ)。
- 測定 ref: 行番号・件数は observed HEAD `6f2455c43` の実ファイル直読、区間変更は `git log 591b6a2a2..6f2455c43 -- scripts/` で実測(measurement-ref-in-artifacts)。
- 現行結論: 選挙 CLI ballot 受理パイプラインの **fail-open 3点**(いずれも #1231/#1235 の設計時ギャップ、区間内退行ではない): (1) **kind 非読取** — `Ballot.parse`(`amadeus-election-model.ts:180`)が raw kind を無視し `kind:"original"` 固定(`:194`)、`parseBallotShape`(`:160-178`)も kind 非参照 → vote verb 経由の amend 投入経路が構造的に不在。(2) **normalizeAt 素通し** — `amadeus-election-transport.ts:87-91` が NaN 時に入力を無検証で返す fail-open(`:90`)。(3) **tally 無差別集計** — dup(`store.ts:131-133`)は amend 除外、`classifyLate`(`model.ts:296-298`)/`tally`(`model.ts:321-337`)は kind 非区別で original+amend の二重計上、`verify`(`election.ts:440` recompute)でも検出不能。実データ 12件は全 kind=original・全 late=[](amend/late ゼロ世代)。配布: `amadeus-election*.ts` は dist 投影0件、SKILL のみ3面(`.agents`/`.claude`/`contrib`)。
- Per-intent record: `re-scans/260719-ballot-failclosed-amend.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260718-election-ts-foundation」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260719-ballot-failclosed-amend.md`。**body 9成果物は全点温存**(churn 回避 — 実質の新規知識は選挙 CLI 受理境界の fail-open 3点のみで本 re-scan/scan-notes に収載、`architecture.md` には ballot 受理境界を扱う選挙 CLI アーキテクチャ節が不在で新設は churn。cid:reverse-engineering:c1)。
- Delivery boundary: 実装、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260719-goa-multiseg-ecode)

- Date: 2026-07-19(Asia/Tokyo)
- Observed at: HEAD `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`git rev-parse HEAD` 実測)
- Intent: `260719-goa-multiseg-ecode`([Issue #1226](https://github.com/amadeus-dlc/amadeus/issues/1226) — `parseGoaLine` の `GOA_HEAD_RE` がハイフン複節 E-code(`E-SDE-CG4` 等)を head 段で拒否)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor 6495e03a12d9e7149c2e80b59f171a90607a2d2c HEAD` exit 0 実測、`git rev-list --count 6495e03a..HEAD`=**178**。日付が新しい squash tip の非祖先 observed は cid:reverse-engineering:rescan-base-ancestry に従い除外)、observed=`a326f47bc0146a3b4285552f42b92fd61fb343a7`。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)。
- 測定 ref: 件数・行番号は observed HEAD `a326f47bc` のワークツリー実ファイル直読、区間変更は `git log 6495e03a..HEAD -- <path>` で実測(cid:measurement-ref-in-artifacts)。フォーカス正本 `amadeus-norm-metrics.ts`+dist+tests に触れた区間変更は2件のみ(`0ab3f22c4` Bolt 1 rank、`b48f89bf0` PR #1112 Bolt 2 で `parseGoaLine`/`GOA_HEAD_RE`/テスト固定を導入)。
- 現行結論: バグの一次原因は `packages/framework/core/tools/amadeus-norm-metrics.ts:157` `GOA_HEAD_RE = /^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/` が複節ハイフン E-code を許容しないこと(新規 regression でなく PR #1112 Bolt 2 の schema 設計時欠陥)。**ただし regex 修正は必要条件だが十分条件ではない**: team.md の実 GoA 行9行(distinct E-code)はすべてサブ問別スパース表記(`c1 1x2 2x1 / c2 …`)で canonical 8-bin 形は0行 — hyphen 許容後も bin 段 `:692`(`tokens.length !== 8`)で BINFAIL に反転し 9行中0行が parse する(`parseGoaLine` 直呼びで pass=0/headFail=8/binFail=1 を実測)。被害面は現状 **latent**: `parseGoaLine`/`parsePmCidLine` は蒸留(`collectMetrics`/`distillCandidates`)から集計消費されず、`:544` で `GoA-variance … NOT COLLECTED` を明示出力(header comment :38-44「aggregation is future」)。唯一の live consumer は `scripts/amadeus-election.ts:413 checkGoaLine` だが、round-trip する record.md 行は `scripts/amadeus-election-record.ts:77 renderGoaLine` が compressed 非ハイフン+canonical 8-bin で書くため #1226 を踏まない。同根の `PM_CID_RE :161` round= も非ハイフン制約(複節 round 実在0件・潜在のみ)。`scripts/amadeus-election-record.ts:34 GoaLineCode`(`GOA_LINE_CODE_RE=/^E-[A-Z0-9]+$/`、#1226 コメント :31)は #1226 の既知 write 段 workaround。テスト `t238-election-record.test.ts:104` が現行バグ挙動(hyphen 形の `parseGoaLine` 失敗)をピン留め = 修正で assertion 反転必須。
- Per-intent record: `re-scans/260719-goa-multiseg-ecode.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260718-election-ts-foundation」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260719-goa-multiseg-ecode.md`。**codekb body 8成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は「GOA_HEAD_RE 複節拒否+corpus スパース様式乖離+蒸留 parse-only」の1クラスタのみで、これは bugfix の欠陥挙動であり構造・API・依存・技術スタックの変化を伴わない。フォーカス正本の区間変更は2件のみで parse schema 以外の本文と矛盾せず、詳細は per-intent record に集約済み。cid:reverse-engineering:c1)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260719-cursor-complete-clear)

- Date: 2026-07-19(Asia/Tokyo)
- Observed at: HEAD `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`git rev-parse HEAD` 実測)
- Intent: `260719-cursor-complete-clear`([Issue #1248](https://github.com/amadeus-dlc/amadeus/issues/1248) — intent 完了後の active-intent カーソル残留により、完了済み intent のシャードへ無期限に監査追記が続くモグラ叩き)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`591b6a2a222357f41061128f1b5a93c7f7a877be`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor 591b6a2a2 HEAD` exit 0 実測、`git rev-list --count 591b6a2a2..HEAD`=**52**。base は 260717-state-mirror-fixes の observed に一致)、observed=`a326f47bc0146a3b4285552f42b92fd61fb343a7`。日付が新しい squash tip の非祖先 observed(`c2e4975ff` = 260718-election-ts-foundation、`594ba21d…` = 260718-hooks-config-conflict)は `--is-ancestor` exit 1 につき base 候補から除外(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- 測定 ref: 件数・行番号は observed HEAD `a326f47bc` の実ファイル直読、区間変更は `git log 591b6a2a2..HEAD -- <path>` で実測(measurement-ref-in-artifacts)。フォーカス面(カーソルライフサイクル・complete 経路・監査追記チェーン・フック群)の focus ファイル区間コミットは13件で **全13件が focus-hits=0**(`git show <sha> -- <focus files> | grep -icE` で機械計測)。区間の大宗は election TS 基盤 Bolt(#1227〜#1236)・swarm 三値化・codex hooks 分離でフォーカス面と非交差。
- 現行結論: **カーソルの set⇔clear 非対称が欠陥の核心**(symmetric-pair-review)。書き手は `setActiveIntentCursor`(`amadeus-lib.ts:1725-1733`、書込 `:1729`)と birth 時書込(`:2147`)の2箇所のみで、clear 経路はコードベースに不在。`handleCompleteWorkflow`(`amadeus-state.ts:1550-1680`)は status 前進(`:1668-1669` `updateIntentStatus`)のみでカーソルを触らず、完了 intent を指したまま残留する。監査追記チェーン全段(`appendAuditEntry`→`ensureAuditFile`→`auditFilePath`→`recordDir`→`activeIntent`)に status ゲートが無く、`activeIntent`(`:1059-1084`)は `records.includes(raw)`(`:1074`)のみで registry status を参照しない。追記到達フックは7つ(主犯 `mint-presence:73-74`)。欠陥は base 時点から現存し区間内退行なし。修正2案(エンジン側 complete 時 clear / フック側 status ゲート防御層)は requirements/選挙で確定。
- Per-intent record: `re-scans/260719-cursor-complete-clear.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260718-election-ts-foundation」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260719-cursor-complete-clear.md`、`architecture.md`(「active-intent カーソルの set⇔clear 非対称と監査ルーティング」節を新設 = 完了後シャード汚染の構造的機序)。**他 body 7成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識はカーソル set⇔clear 非対称と監査チェーンの status ゲート不在の構造的事実1点で、architecture.md へ集約。フォーカス面は既存構造の欠落(clear 経路不在)であり配置の追加・移動・品質評価の新規欠陥クラスタ導入を伴わない。cid:reverse-engineering:c1)
- Delivery boundary: 実装、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260718-election-ts-foundation)

- Date: 2026-07-19(Asia/Tokyo)
- Observed at: HEAD `c2e4975ff2abe0290d899fdbd04b856213175c7a`(`git rev-parse HEAD` 実測)
- Intent: `260718-election-ts-foundation`(選挙4類型ライフサイクルの決定的 TS 基盤 + user-invocable SKILL 薄ラップ。チーム内ツール・配布外(W-04)、ソロ選挙も輸送抽象で取込 = D-12。本 intent は ideation のみ)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`e9a001105`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小。`git merge-base --is-ancestor e9a001105 HEAD` exit 0 実測、`git rev-list --count e9a001105..HEAD`=**69**。base は 260717-swarm-dispatch-enum の observed に一致)、observed=`c2e4975ff2abe0290d899fdbd04b856213175c7a`。直前の鮮度ポインタが指した 260718-hooks-config-conflict の observed `594ba21d…` は `--is-ancestor`=**exit 1(非祖先)**の並行 squash tip につき base 候補から除外(cid:reverse-engineering:rescan-base-ancestry / re-timestamp-merge-resolution)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- 測定 ref: 件数・行番号は observed HEAD `c2e4975ff` の実ファイル直読、区間変更は `git log e9a001105..HEAD -- <path>` で実測(measurement-ref-in-artifacts)。フォーカス面(配布チャンネル/選挙 parse 資産/agmsg/mirror 前例/SKILL packaging/選挙ノルム)の区間変更は軽微(mirror 8行 = #1172 の `cd9865194`、norm メモリ追記のみ)。増分の大宗は codex-hooks 移行でフォーカス面と非交差。
- 現行結論: **反証課題「local overlay チャンネルが存在しない」は反証** — `contrib/skills/` overlay(`promote-self.ts:45-46,229-236`、ヘッダ :7-9)が正本→`.claude/skills`+`.agents/skills` を **dist 非対象**で投影(既存例 `amadeus-upstream-sync` = dist 0件・self-install 3件を `git ls-files` 実測)。W-04 整合の SKILL 配置経路。最有力実装前例は `scripts/amadeus-mirror.ts`(dist/投影いずれも非対象・`amadeus-lib` 決定的状態読取・判別ユニオン Result・exit code 契約)。GoA/PM parse 資産(`amadeus-norm-metrics.ts:157-161` + `parseGoaLine`:688/`parsePmCidLine`:704)は区間変更ゼロ・never-estimates で S-05 生成側と byte 互換の対(C-08)。選挙ノルム機械化対象=13 cid(In-Scope)、隣接6+は W-01/02/03 で out。ライフサイクル契約は区間無変更。
- Per-intent record: `re-scans/260718-election-ts-foundation.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260718-hooks-config-conflict」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260718-election-ts-foundation.md`、`architecture.md`(「contrib overlay 配布チャンネル(dist バイパス)」節を配布境界に新設)。**他 body 7成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は全点温存**(churn 回避 — 実質の新規知識は contrib overlay の存在1点のみ、他フォーカス面は区間無変更で本文と矛盾なし。cid:reverse-engineering:c1)
- Delivery boundary: 実装、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260718-hooks-config-conflict)

- Date: 2026-07-18(Asia/Tokyo)
- Observed at: HEAD `594ba21d636218558b711b371c286f16731fb081`（`git rev-parse HEAD` 実測）
- Intent: `260718-hooks-config-conflict`（[Issue #770](https://github.com/amadeus-dlc/amadeus/issues/770) — tracked `.codex/hooks.json` と agmsg monitor runtime state の所有権衝突。marker側は [PR #783](https://github.com/amadeus-dlc/amadeus/pull/783) で解決済み）
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定則）。base=`e9a001105d253e14affb77417423d9f0b0360f9e`（全 `re-scans/*.md` observed のうち HEAD の祖先で距離最小。`git merge-base --is-ancestor` exit 0、`git rev-list --count e9a0011..HEAD`=**8**）、observed=`594ba21d636218558b711b371c286f16731fb081`。Developer scan→Architect synthesisの直列に、外部 agmsg reader／writerの独立対称走査を追加。
- Focus: Codex `HOOK_WIRING`→example→active copy→trust reader、`promote-self` preserve、`run-codex.sh`／`team-up.sh`→agmsg shim／monitor、`delivery.sh`／SQLite JSON1 writer、mode reader、bridge restart、markerの現行不在、packaging／doctor／fixture／テスト空白。
- 測定 ref: HEAD三者は同一 blob `8eeff909b38467415fdd63a93631db74f91e5b4f`（1925 bytes／93 lines）。現 worktree active fileは2021 bytes／改行0／diff 1 insertion・93 deletionsで、Amadeus 9 commandを保持しagmsg SessionStart／SessionEnd各1件と絶対 pathを追加。base..observedは15 files・+842/-31だがフォーカス契約変更0件。agmsgはローカル実体1.1.7をread-only直読。
- 現行結論: root causeはtracked canonical activationとmutable per-machine runtime configが同じ`.codex/hooks.json`を所有すること。marker対策だけ、pretty-printだけ、Codex退役前提の運用だけでは恒久解にならない。active file untrack／ignoreとtracked static dispatcher + ignored sidecarは双方`【裁定待ち】`。
- Per-intent record: `re-scans/260718-hooks-config-conflict.md`
- 更新した成果物: `architecture.md`、`code-structure.md`、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、本ファイル、per-intent record。`business-overview.md`は事業目的不変、`api-documentation.md`はrepository所有の公開契約が未裁定のため温存。
- Delivery boundary: 実装、外部 agmsg変更、main merge/rebase、Issue close、PR作成・更新は本scanで実施していない。既存dirty `.codex/hooks.json` と旧intent state/auditは変更していない。
- Baseの真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有timestampはrepo-level freshness pointerであり、次回差分baseの真実源にはしない。

## 実行メタデータ(履歴: 260717-swarm-dispatch-enum)

- Date: 2026-07-18(Asia/Tokyo)
- Observed at: HEAD `e9a001105d253e14affb77417423d9f0b0360f9e`(`git rev-parse HEAD` 実測)
- Intent: `260717-swarm-dispatch-enum`([Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157) — `AMADEUS_USE_SWARM` の三値 enum 化 `unset`/`claude-ultra`/`codex-ultra` + Codex 通常経路のセッション内 native subagent 並列化。Mirror Issue #1182)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` observed のうち HEAD 祖先かつ距離最小。`git merge-base --is-ancestor 6495e03a12d9e7149c2e80b59f171a90607a2d2c HEAD` exit 0 実測、`git rev-list --count 6495e03a..HEAD`=**128**。rescan-base-ancestry)。日付が新しい squash tip の非祖先 observed は E-L63 に従い除外。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- Focus: `AMADEUS_USE_SWARM` 全数188(実コード読み取りゼロ・conductor SKILL prose 二値 dispatch)・三値化改修サイト(claude SKILL:61 / codex SKILL:57,171 / onboarding.fills.ts / kiro・kiro-ide 各1、opencode/cursor は SKILL 不在の欠落面)・referee 契約(`amadeus-swarm.ts` 789行、ステートレス prepare/check/finalize、driver 型 `DriverName` :88-89 は swarm 内に閉じる)・6監査イベント(`SWARM_*`、Fallback `driver="subagent"` ハードコード :293)・Codex exec per-unit worker 経路(`codex/SKILL.md:57,171` / `emit.ts:81`)・旧 driver stack 不在確認(`AMADEUS_SWARM_DRIVER` adapter/driver スタック未着地)・テスト9件・docs 契約(08-construction-and-swarm.md:201-213 / 17-skill-system.md)
- 測定 ref: 件数・行番号は observed HEAD `e9a001105` の実ファイル直読、区間変更は `git log 6495e03a..HEAD -- <path>` で実測(measurement-ref-in-artifacts)。swarm 正本 `amadeus-swarm.ts` の区間変更は0件。
- 現行結論: swarm 正本・SKILL invoke-swarm dispatch 指示・swarm テスト群は区間 `6495e03a..HEAD`(128コミット)で**区間変更ゼロ**。関心 seam の実行コード・構造・API・依存は実質無変更。`AMADEUS_USE_SWARM` はエンジンのコードパスに一切読まれず、すべて conductor 側 SKILL prose の二値(`== "1"`)dispatch 指示 — 三値 enum 化は主に SKILL prose と監査 driver 語彙・Fallback ハードコードの改修面。区間の実変更はいずれも本 intent フォーカス面外(CI リファクタ・coverage-patch-gate 新設・無関係な新テスト群)。既決 `cid:feasibility:c1-2`(Codex native subagent 並列成立・effort telemetry 観測不能)を適用。
- Per-intent record: `re-scans/260717-swarm-dispatch-enum.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260717-codekb-diff3-cleanup」→履歴ラベル化)、`re-scans/260717-swarm-dispatch-enum.md`。**codekb body 9成果物は全点温存**(churn 回避 — swarm 正本の区間変更ゼロ、再照合で本文との矛盾なし、cid:reverse-engineering:c1)。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260717-state-mirror-fixes)

- Date: 2026-07-18(Asia/Tokyo)
- Observed at: HEAD `591b6a2a222357f41061128f1b5a93c7f7a877be`(`git rev-parse HEAD` 実測、worktree = `origin/main` 一致)
- Intent: `260717-state-mirror-fixes`(bugfix batch: [Issue #1170](https://github.com/amadeus-dlc/amadeus/issues/1170) — set-status hook 経由の state.md 巻き戻り(checkbox `[-]` と Current Stage の lost-update)/ [Issue #1172](https://github.com/amadeus-dlc/amadeus/issues/1172) — `countStageProgress` が scope-SKIP を分母に混入)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` の observed のうち HEAD 祖先かつ距離最小。`git merge-base --is-ancestor 6495e03a... HEAD` exit 0、`git rev-list --count 6495e03a..591b6a2a`=126)。squash マージで feature tip が HEAD の非祖先になる新しい observed(`0b5e24f8` 等の squash tip 群)は `--is-ancestor` exit 1 につき除外(cid:reverse-engineering:rescan-base-ancestry)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- Focus: **#1170** — state.md 書込経路の全数列挙(11 hook grep で内容ライターは `.claude/hooks/amadeus-sync-statusline.ts:69-73` の set-status spawn が唯一)+ `handleSetStatus`(`amadeus-utility.ts:3666-3690`)の無ロック read-modify-write の race window 機序確定。**#1172** — `scripts/amadeus-mirror.ts:87-105` `countStageProgress` の SKIP 分母欠陥 + scope-SKIP の現行様式実測(`- [ ] <stage> — SKIP` 空 checkbox 形、format-currency-grep)
- 測定 ref: 件数・行番号は observed HEAD `591b6a2a2` の実ファイル直読(cid:measurement-ref-in-artifacts)。全 state 横断マーカー集計 `[ ] — SKIP`=717件 / `[ ] — EXECUTE`=70件 / `[x] — EXECUTE`=414件、`^- \[S\]` checkbox=**0件**(実コーパス不在)。区間 `6495e03a..591b6a2a`=126コミット
- 現行結論: **2欠陥の機序を確定**。#1170 は `handleSetStatus` が `withAuditLock` を取らず(エンジン RMW ハンドラは全て保護、`amadeus-state.ts:251-266`)、S0 スナップショット読み→全文上書きで engine の advance を lost-update する。audit 非 emit のため巻き戻りは state.md のみ = Issue 症状と一致。set-status は intent フラグなしで active intent に解決し set-status 同士も相互 lost-update。#1172 は分母除外条件が checkbox `[S]`(実コーパス0件の runtime jump marker)のみで、実 scope-SKIP 様式 `[ ] — SKIP`(717件)が `total++` に混入(18/32 を返す、期待 18/18)。checkbox(実行状態)と suffix(計画)の直交2フィールドを混同したのが根本原因。テスト空白2件(t232 が捏造 `[S]` fixture で偽 green / t145 は set-status 経路 concurrency 未カバー)
- Per-intent record: `re-scans/260717-state-mirror-fixes.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260717-codekb-diff3-cleanup」→履歴ラベル化)、`re-scans/260717-state-mirror-fixes.md`、`code-quality-assessment.md`(#1170/#1172 の2欠陥 + 2テスト空白の観測節を新設、旧「最新」= swarm-driver-migration marker を履歴へ降格 cid:reverse-engineering:c3-relabel)。**他7 body 成果物(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は全点温存**(churn 回避 — Focus seam の state ロック機構・core 中立層/表層境界は区間126コミットで不変。cid:reverse-engineering:c1)
- Delivery boundary: main merge/rebase、Issue close、GitHub 上のレビュー作成・更新操作は本 scan で実施していない。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260717-codekb-diff3-cleanup)

- Date: 2026-07-18(Asia/Tokyo)
- Observed at: HEAD `0b5e24f8ffeecb6648639adf4a8b1a257084efac`(`git rev-parse HEAD` 実測)
- Intent: `260717-codekb-diff3-cleanup`([Issue #1129](https://github.com/amadeus-dlc/amadeus/issues/1129) — 共有 CodeKB 2ファイルへ孤立した diff3 base sentinel と旧「最新」ヘッダ断片の branch hygiene)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- 手法: diff-refresh(cid:reverse-engineering:c1)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` の observed のうち HEAD 祖先かつ距離最小。`git merge-base --is-ancestor 6495e03a... HEAD` exit 0、`git rev-list --count 6495e03a..HEAD`=126)。次点祖先 `cf3dc88b...` は距離191、日付が新しい `46f51091...` は非祖先(exit 1)のため除外。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- Focus: 修正前 `9313fae4c...`、修正 commit `5e92d1516...`、`origin/fix/1027-state-set-fail-closed`、observed HEAD、`origin/main` の5 refで対象2ファイルを比較し、4 conflict marker語彙(`<<<<<<<` / `|||||||` / `=======` / `>>>>>>>`)と「最新」H2を全数走査。修正commitは2ファイル・4行削除でfix branchの祖先だが、HEAD/mainの祖先ではない。一方、HEAD/mainの対象2ファイルは同一で、4語彙はいずれも0件、「最新」H2は各1件。
- 測定 ref: 件数は上記各 git refへの `git show <ref>:<file> | awk`、系統は `git merge-base --is-ancestor`、内容同一性は `git diff --exit-code HEAD origin/main -- <file>` で実測。Issue は OPEN、`bug` / `P3` / `S4-MINOR` / `in-progress:amadeus`。
- 現行結論: 実行コード、構造、API、依存、technology stack、品質機構の変更はない。`amadeus-worktree.ts:549-568` は Git の `CONFLICT (` と unmerged indexだけを扱い、`tests/e2e/t03.test.ts:186-216` は通常merge conflictの検証で、孤立diff3 sentinel専用fixtureはない。既決 `cid:reverse-engineering:diff3-marker-vocab` を適用し、新規設計判断は導入しない。
- Per-intent record: `re-scans/260717-codekb-diff3-cleanup.md`
- 更新した成果物: 本ファイル(鮮度ポインタ + 旧「最新: 260717-mirror-issue-tool」→履歴ラベル化)、`re-scans/260717-codekb-diff3-cleanup.md`。他8 body成果物は全点温存(churn回避 — 実行コード・構造・API・依存に変化なし、cid:reverse-engineering:c1)。
- Delivery boundary: main merge/rebase、Issue close、GitHub上のレビュー作成・更新操作は本scanで実施していない。content cleanとfix commitの系統着地は別事実として追跡する。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260717-mirror-issue-tool)

- Date: 2026-07-17
- Observed at: HEAD `3d89916e6eb70f5d34683f8a7141ce1afe33d4b4`(`git rev-parse HEAD` 実測、conductor 本線 — scan-notes 参照)
- Intent: `260717-mirror-issue-tool`(`scripts/amadeus-mirror.ts` — intent を GitHub Issue へミラーする create / sync / close ツール)
- Scope: `amadeus`
- 手法: diff-refresh(cid:reverse-engineering:c1)。base=`6495e03a`(全 re-scans observed のうち HEAD 祖先・距離最小 dist=107 — rescan-base-ancestry、非祖先 observed `8e8cc9b1`/`5761e65c`/`6a23b0ec` は squash tip につき除外)。Developer スキャン→Architect 合成の直列(c3、再照合7点全一致・訂正なし)
- Focus: `amadeus-runtime.ts summary --json` 出力契約(`RuntimeSummary` :916-941、intent slug/record パス/Issue 番号を非含有)・intents.json 読み書き(`IntentRegistryEntry` :1548-1567 / `updateIntentStatus` :1930-1954 / `readIntentRegistry` :1615-)・park の機械可読表現(amadeus-state.md `## Runtime State` の Parked 2フィールド :607-636、intents.json は不変)・state parser(`getField` :3588-3599)・兄弟 CLI 様式(metrics-timeseries.ts main :188/import.meta.main :236、scripts lint/typecheck 自動配線 biome.json:41+tsconfig.json:19)・gh CLI 前例(repo 内不在=新規導入者)・完了2シグナル(:1652-1667)
- 現行結論: 関心 seam の canonical は区間107コミットで実質無変更。`summary --json` は集計カウントのみで intent 名・record リンク・Issue 番号を持たず、状態行の材料は intents.json + record ディレクトリ名 + state.md から別途取得が必要。park は intents.json に痕跡を残さず state.md の Parked フィールドが唯一の機械判定。gh 呼び出しは repo 内前例なく新規導入。close の機械検査 = intents.json status==complete または state.Status==Completed(human-confirmed complete-workflow 経由のみ書かれる)
- Per-intent record: `re-scans/260717-mirror-issue-tool.md`
- 更新した成果物: 本ファイル(鮮度ポインタ+旧「最新: 260716-teamup-resume-size-drift」→履歴ラベル化)、`re-scans/260717-mirror-issue-tool.md`。**codekb body は全点温存**(churn 回避 — 関心 seam の canonical は区間無変更、再照合で本文との矛盾なし。cid:reverse-engineering:c1)
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260716-teamup-resume-size-drift)

- Date: 2026-07-16
- Observed at: HEAD `5761e65ce73a82b055590a50f483161e5df2abca`(`git rev-parse HEAD` 実測、conductor 本線 — scan-notes 参照)
- Intent: `260716-teamup-resume-size-drift`(Issue #1081 — t-team-up-codex-resume の wall-clock drift。E-1081-FIX 裁定 C: size: large 宣言(PR #1090 着地済み)+短縮別 Issue #1087)
- Scope: `bugfix`
- 手法: diff-refresh(cid:reverse-engineering:c1)。base=`6495e03a`(全 re-scans observed のうち HEAD 祖先・距離最小 86 — rescan-base-ancestry、非祖先 observed は除外)。Developer スキャン→Architect 合成の直列(c3、再照合7点全一致)
- Focus: 対象テストの size/covers ヘッダ不在・test-size.ts の宣言パース(:279-291)と drift 上方向専用(:117)・run-tests.ts の観測専用出力(:915-923)・t-test-size-drift.test.ts の guard/purity・#1077 前例形
- 現行結論: 宣言不在ゆえ static=medium が effectiveDeclared となり実測 large 帯(3実行系 31.3〜32.5s、修正時までに7点)と乖離 — 最上部 `// size: large` 1行で drift 消滅(strictly-greater 機構)。全ゲートは宣言<static 方向専用のため large 宣言で赤化なし
- Per-intent record: `re-scans/260716-teamup-resume-size-drift.md`
- 更新した成果物: 本ファイル(鮮度ポインタ+旧「最新: 260716-github-issue-912-tests-s」→履歴ラベル化)、`re-scans/260716-teamup-resume-size-drift.md`。**codekb body は全点温存**(churn 回避 — test-size 専用節は不在、size 機構3ファイルは区間 86 コミットで不変、1行 bugfix。cid:reverse-engineering:c1)
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## 実行メタデータ(履歴: 260716-github-issue-912-tests-s)

- Date: 2026-07-16
- Observed at: HEAD `8e8cc9b14d9c21e3e8282e3fdb6ae30db7f0f478`(`git rev-parse HEAD` 実測)
- Intent: `260716-github-issue-912-tests-s`(Issue #912 — t05 planted-failure ケースが高負荷ホストで `--parallel 4` 下 120005ms タイムアウト間欠 FAIL、labels=`bug / P3 / S4-MINOR`。単独実行では 28 pass/0 fail、負荷収束後の再 `--ci` は PASS。「実行コード変更なし、負荷起因」の見立て)
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`e55cc25143717d84b3e7f1a543151f0b7c99b96f`(祖先性 `git merge-base --is-ancestor` exit 0 実測、距離=**37**、祖先かつ距離最小の指定 base を採用)、observed=`8e8cc9b14d9c21e3e8282e3fdb6ae30db7f0f478`(`git rev-parse HEAD` 実測一致)。**フォーカス3ファイル(`tests/smoke/t05-run-tests-parallel.test.ts`・`tests/run-tests.ts`・`tests/run-tests.sh`)の区間 diff は空** — 観測面は base..HEAD の37コミット区間で一切変化しておらず、現行 worktree の行番号は Issue #912 実測(2026-07-11)時点とバイト同一。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260716-github-issue-912-tests-s.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: t05 planted-failure ケース(test 8 = L411-438、`PER_TEST_TIMEOUT=120000` L161、入れ子 spawn `run()` L104-125/`spawnSync` L113、二重 spawn bun→bash→bun×2)・run-tests.ts 並列制御(`args.parallel` 既定1 L163、`runFileBand` L839-862、テスト子 spawn timeout なし L653-657、負荷適応 seam NONE FOUND)・先行修正3クラス(#819 e2e 移設/#831 lock 隔離/#877 キャッシュリセット、参考 #741)・E-L71(fanout-load-settle)の seam 不在
- 現行結論: t05・テストランナー本体・並列制御の実行コードは区間37コミットで不変。120s 予算超過は spawnSync のプロセスタイムアウトではなく**外側 bun の per-test timeout**(L161)で、内側 run-tests.sh 再帰の cold bun 起動 ×2 直列化が高負荷 CPU 待ちで伸びる構造。負荷適応 seam(load-average/nice/並列度 env 上書き/収束待ち)は皆無。修正3案評価 = 案C(test 8 フィルタを planted 単独へ最小化し入れ子コスト半減、L422-428 の1行 diff、契約完全保存)を本命、案A(timeout の env seam)を安全網併用、案B(#819 型 tier 隔離)は前例強だが構造分散コスト。最終選択は requirements/選挙で確定。
- Per-intent record: `re-scans/260716-github-issue-912-tests-s.md`
- 更新した成果物: `code-structure.md`(「t05 並列フレーク観測面 — 260716-github-issue-912」節を H1 直後に新設 = planted-failure 機序 / 並列制御の実態 / 先行修正3クラス / 修正3案評価。旧「最新」= parser/checkbox 欠陥面(260715-parser-checkbox-fixes)節見出しの「最新」→「履歴」降格(main 反映時点の最新節。harness port 節は既に履歴) cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ + 旧「最新: 260715-parser-checkbox-fixes」→履歴ラベル化)、`re-scans/260716-github-issue-912-tests-s.md`(per-intent re-scan 記録)。他 body 成果物(architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment の7点)は base→observed でフォーカス面と無関係、かつ区間 diff 空で構造不変のため温存(churn 回避、cid:reverse-engineering:c1)。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ（履歴: 260715-parser-checkbox-fixes）

- Date: 2026-07-16
- Observed at: `git rev-parse HEAD` = `6495e03a12d9e7149c2e80b59f171a90607a2d2c`
- Intent: `260715-parser-checkbox-fixes`（bugfix。#1013 practices-promote parseRules が ALWAYS/NEVER 契約を検証せず散文行を project.md へ append / #1015 scope-change checkbox 再構築の三項が6→4状態崩落＝awaiting-approval・revising が pending へ退行＋再構築ヘッダの4状態 drift）
- Scope: `bugfix`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`（2.1）
- 手法: diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定2則）。base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`（リーダー割当。全 `re-scans/*.md` の observed のうち HEAD 祖先で距離最小=65。`git merge-base --is-ancestor cf3dc88 HEAD`=exit 0、`git rev-list --count`=65 を実測で裏取り）、observed=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`（`git rev-parse HEAD` 実測一致）。共有 timestamp 前 pointer の canonical-settings observed `e55cc25143717d84b3e7f1a543151f0b7c99b96f` は `--is-ancestor`=exit 1（非祖先・並行 intent）につき base 候補から除外。区間65コミットにフォーカス欠陥の修正は存在せず、両欠陥は observed に現存。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260715-parser-checkbox-fixes.md`。
- 実施体制: Developer（スキャン）→ Architect（合成）の2サブエージェント直列（cid:reverse-engineering:c3）
- Focus: #1013 `amadeus-state.ts:2556-2561`（parseRules、区間無変更で欠陥貫通。呼び出し元は handlePracticesPromote の :2570/:2571 のみ、stage 契約 `practices-discovery.md:101`）・#1015 `amadeus-utility.ts:3228-3230`（handleScopeChange 三項の6→4崩落）＋副次 drift `:3238`（再構築ヘッダ4状態、正本テンプレ :2748 は6状態）・状態型正本 `amadeus-lib.ts:58` CheckboxState / `:60-67` CHECKBOX_MAP / `:69-76` CHECKBOX_REVERSE / `:3395` parseCheckboxes（6状態復元）/ `:3435` CHECKBOX_MAP 正準経路。手書き marker 構築サイト2箇所（`utility.ts:3229` 欠陥 / `:2656` 良性 init）
- 現行結論: #1013 / #1015 とも observed HEAD で未修正・現存。両欠陥とも既存テスト未カバー（t75 は ALWAYS/NEVER 整形済み fixture のみ、t194 は別関数 handleRecompose を検査）。編集正本は `packages/framework/core/tools/`（`.claude/tools/*` と byte 同一）。codekb の本 intent 観測面に stale 記述は検出されず。
- Per-intent record: `re-scans/260715-parser-checkbox-fixes.md`
- 更新成果物: `code-structure.md`（「parser/checkbox 欠陥面の観測」節を先頭新設＋前「最新」= canonical-settings 節を履歴ラベル化 cid:reverse-engineering:c3-relabel）、本ファイル（鮮度ポインタ＋「最新: 260709-canonical-settings」→履歴ラベル化）、`re-scans/260715-parser-checkbox-fixes.md`（per-intent re-scan 記録）。他成果物（architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment）は両欠陥が挙動欠陥で構造変化を伴わず、base→observed でフォーカス面外に破壊的変化がないため温存（churn 回避、cid:reverse-engineering:c1）。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ(履歴: 260715-opencode-cursor-harness)

- Date: 2026-07-16
- Observed at: HEAD `6a23b0ec2498915532ab40930f82cc7744aa15b7`(`git rev-parse HEAD` 実測)
- Intent: `260715-opencode-cursor-harness`(Issue #626 — opencode / Cursor harness port。既存4 harness の packaging seam・installer 閉じ列挙・doctor/version 依存性・runner-gen・promote:self・docs 面を調査し、新ハーネス2種を最小差分で追加する開放性を確定する)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`(前 intent 260713-swarm-driver-migration の observed。全 `re-scans/*.md` observed の HEAD 祖先性を `git merge-base --is-ancestor` で走査し、祖先のうち距離最小=**65** を採用)、observed=`6a23b0ec`。祖先性実測済み(exit 0)。`git diff --stat origin/main HEAD -- ':!amadeus/'` は空 = HEAD と origin/main の差は record コミット(`amadeus/` 配下)のみで source 面完全一致。フォーカス面の file:line は observed HEAD 実コード直読で確定。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: packaging seam(`scripts/package.ts` discoverHarnessNames:68-73 / `manifest-types.ts:79-122` HarnessManifest 全フィールド)・既存4 harness の manifest+emit 対比(Claude/Kiro 型 vs Codex 型)・promote:self(`promote-self.ts:37-41` managedDirs ハードコード)・version/doctor 依存性(`amadeus-utility.ts:243-245` version 非依存 / `:676,:696` doctor `.claude` 専用ブロック / `:857` otherTrees / `:2000-2006` SCAN_EXCLUDE)・runner-gen(`amadeus-runner-gen.ts:60,63` `<harnessDir>/skills/` / skipRunnerGen)・閉じ列挙9ファイル台帳(installer 5必須:harness.ts:9,19-24 / engine-layout.ts:8-12 / reporter.ts:24-25,137 / setup-harness.test.ts:13)・docs 面(README 対応表 4→6 + harnesses/ ガイド×2言語)
- 現行結論: packaging seam は完全 open-set(manifest 1本 + 任意 emit.ts で package.ts 無編集ビルド、dist:check 自動対応)。新ハーネスは Claude/Kiro 型(薄 manifest)か Codex 型(emit.ts)の2系統に分かれ、系統は skills/agents/hooks 探索規約で決まる。閉じ列挙で手動追記が要るのは installer 5(正しさ必須)+ runtime/migrate/advisory 3 + self-install 1 = 9ファイル。promote:self は新ハーネス非自動対応(dogfood 判断)、doctor は `.claude` 専用ブロック + advisory 劣化のみで新ハーネス動作。区間65コミットはフォーカス面のハーネス開放性契約を一切変えていない。
- Per-intent record: `re-scans/260715-opencode-cursor-harness.md`
- 更新した成果物: `code-structure.md`(「harness port 開放性の観測面」節を先頭新設 = open-set 3層 / 閉じ列挙9ファイル台帳 / promote:self 非自動 / doctor advisory 劣化 / 最小ファイル集合。旧「swarm driver 変更面の配置境界」節見出しの「最新」→「履歴」降格 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ + 旧「最新: 260713」→履歴ラベル化)、`re-scans/260715-opencode-cursor-harness.md`(per-intent re-scan 記録)。他 body 成果物(architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment の7点)は base→observed で本 intent 観測面(packaging 開放性・閉じ列挙)と無関係、かつ区間65コミットで構造不変(scan-notes フォーカス面8実測)のため温存(churn 回避、cid:reverse-engineering:c1)。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ（履歴: 260709-canonical-settings）

- Date: 2026-07-16
- Observed at: `git rev-parse HEAD` = `e55cc25143717d84b3e7f1a543151f0b7c99b96f`
- Intent: `260709-canonical-settings`（#623: Amadeus 共通の既定挙動を型付き canonical settings＝1正本へ集約する基盤。現状 CLI フラグ `--depth`/`--test-strategy`・env `AMADEUS_DEFAULT_SCOPE`・state `Construction Autonomy Mode` の3系統に分散した設定を統合）
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`（2.1）
- 手法: diff-refresh（cid:reverse-engineering:c1、E-L63 の base 選定2則）。base=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`（前 intent `260713-swarm-driver-migration` の observed。全 `re-scans/*.md` の Observed commit を `git merge-base --is-ancestor` で走査し、HEAD の祖先である候補のうち `git rev-list --count` が最小＝距離58 を採用）、observed=`e55cc25143717d84b3e7f1a543151f0b7c99b96f`（`git rev-parse HEAD` 実測一致）。区間58コミット（519 files, +98136/-1659、主因は upstream-v2 移行 `amadeus-migrate.ts` +3823行新規と移行テスト大量追加）に**本 intent 関連の新規機構は存在せず**、設定土台（doctor row 構造・stage-schema 厳格 parse 様式・amadeus-lib の JSON ロード様式・`AMADEUS_DEFAULT_SCOPE` precedent）は base 時点で確立済み。フォーカス面は observed HEAD 実コード直読で file:line 確定。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260709-canonical-settings.md`。
- 実施体制: Developer（スキャン）→ Architect（合成）の2サブエージェント直列（cid:reverse-engineering:c3）
- Focus: 設定配置（`amadeus/spaces/default/` 直下に設定ファイル不在・`.gitignore:47-58` はどのパターンでも新設 settings を ignore しない）・doctor 統合（`DoctorCheck{pass,label,fix?}` `amadeus-utility.ts:407-411`、`handleDoctor:676`、`process.exit(failed>0?1:0):1958`、`AMADEUS_DEFAULT_SCOPE` row:875-892 が雛形）・parse 様式（厳格＝`amadeus-stage-schema.ts` 判別ユニオン `{valid,data}｜{valid,errors[]}`:55-57/`unknown key:`:163 対 寛容＝`amadeus-rule-schema.ts` throw:69,72/未知キー許容:39）・JSON ロード（`readIntentRegistry` `amadeus-lib.ts:1496-1509`、`writeFileAtomic`、`AMADEUS_*` env-seam `amadeus-graph.ts:307`）・共通挙動設定の3系統分散（CLI フラグ/`AMADEUS_DEFAULT_SCOPE`/`Construction Autonomy Mode`、重複記述なし）・dist 同期（正本 `packages/framework/core/tools/` `package.ts:56-57`、`promote:self`、`dist:check`/`promote:self:check`）・env var 責務境界（約40 `AMADEUS_*` の唯一の挙動既定 precedent＝`AMADEUS_DEFAULT_SCOPE`、settings.json env 由来 `amadeus-utility.ts:871`）
- 現行結論: `settings.json` 相当の型付き canonical settings ファイルは製品に**未実装**（実装0件）。設定の3系統分散は現存し、`AMADEUS_DEFAULT_SCOPE`（settings.json env → env var → ツール読み）が canonical settings チャネルの唯一の既存 precedent。設定土台（parse/JSON/doctor/dist 同期）は base 時点で確立済みで区間内に破壊的変化なし。codekb の本 intent 観測面に stale 記述は検出されず。
- Per-intent record: `re-scans/260709-canonical-settings.md`
- 更新成果物: `code-structure.md`（「canonical settings 観測面」節を先頭新設 = フォーカス面1〜7 の要点を file:line 付き転記）、本ファイル（鮮度ポインタ + 「最新: 260713-swarm-driver-migration」→履歴ラベル化 cid:reverse-engineering:c3-relabel）、`re-scans/260709-canonical-settings.md`（per-intent re-scan 記録）。他成果物（architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment）は Developer が本 intent 観測面で stale なしと判定し、base→observed で構造変化・挙動欠陥を伴わないため温存（churn 回避、cid:reverse-engineering:c1）。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ（履歴: 260713-swarm-driver-migration）

- Date: 2026-07-13
- Observed at: 2026-07-13T07:57:31Z
- Intent: `260713-swarm-driver-migration`（`AMADEUS_SWARM_DRIVER` 新設、`AMADEUS_USE_SWARM` の0.1.x互換移行、Claude Agent Teams／Ultra Code、Codex Ultra、Kiro subagent の決定的選択・監査・live proof）
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`（2.1）
- 手法: diff-refresh。base=`13598b752b656cc9bbf5d931f8e3a6c34881fd1c`、observed=`cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5`、距離49 commits。全 `re-scans/*.md` の Observed commit を `git merge-base --is-ancestor` で検査し、HEAD の祖先である候補のうち距離最小を採用した。`c11554226542faabd2a6c694650ea26323745ed8` は現 HEAD の非祖先であり除外した。
- 実施体制: Developer code scan → Architect synthesis の2サブエージェント直列
- Focus: engine eligibility、driver-neutral `invoke-swarm`、harness conductor の fan-out、Claude／Codex／Kiro の process／live-tool 境界、stateless referee、worktree／Bolt／audit、`scripts/package.ts`／`promote-self.ts`、決定的 selector matrix、capability probe、explicit hard error、auto loud fallback、driver-aware audit、4 driver の2 Unit以上 live proof
- 現行結論: `AMADEUS_SWARM_DRIVER` の製品実装は0件。現行 driver 選択は harness skill prose に分散し、referee は AI dispatcher ではない。#841 の batch progress、package source-side unreferenced scan、dist root orphan blind spot は解消済み。
- Per-intent record: `re-scans/260713-swarm-driver-migration.md`
- 更新成果物: `business-overview.md`、`architecture.md`、`code-structure.md`、`api-documentation.md`、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、本ファイル、および per-intent record。
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。**本共有 timestamp は repo-level freshness pointer であり、次回差分 base の真実源にはしない。**

## 実行メタデータ(履歴: 260712-metrics-observation)

- Date: 2026-07-12
- Intent: `260712-metrics-observation`(既存計測経路 — CCN 分布・テスト数・カバレッジ% — の出力をコミット snapshot に保存する観測機構、#921)
- Scope: `feature`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/engineer-2`(branch `intent/921-metrics-observation`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定2則)。base=`13598b752b656cc9bbf5d931f8e3a6c34881fd1c`(前 intent `260711-docs-repair-batch9` の observed。全 re-scan observed の HEAD 祖先性を `git merge-base --is-ancestor` で判定し、祖先のうち距離最小=56 を採用。非祖先2件 `11c52f153`/`d6375bba6` は squash 別 SHA で除外)、observed=`c11554226542faabd2a6c694650ea26323745ed8`(`git rev-parse HEAD` 実測)。フォーカス面(snapshot 再利用 seam)は observed HEAD 実コード直読で file:line 確定、base→observed diff で ideation feasibility 前提の現存を検証。フォーカス面の export シグネチャは全て base と不変(実コード触は `tests/lib/coverage-normalize.ts` の #876 closing-only strip のみで export byte 同一)。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260712-metrics-observation.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `tests/complexity-gate.ts`(CCN seam: `runLizard:151`/`MEASUREMENT_ROOTS:43`/`CCN_BLOCK_THRESHOLD:35`/`CCN_WARN_FLOOR:36`/`parseLizardCsv:128`/`evaluateComplexity:241`、`python3 -m lizard` spawn 前提)・`tests/run-tests.ts`(カバレッジ機械可読出力 `writeCoverageTotalsJson:610`→`coverage/coverage-totals.json`、`collectCoverageTotals:538` 非 export、テスト数は `printSummary:899` の stdout print のみ=機械可読 seam 不在)・`tests/lib/coverage-normalize.ts`(`normalizeCoverageReport:273`/`computeStrippableLines:79` export)・`.github/workflows/ci.yml`(`contents:read` :23-24)/`release.yml`(`contents:write` :48、GITHUB_TOKEN push 非トリガー前例 :15-16)・`scripts/package.ts`(dist コピー源 CORE/HARNESS のみ :57-58 = scripts/tests は C2 対象外)・`.gitignore`(`coverage/` :30)
- 更新した成果物: `code-structure.md`(「計測 seam 台帳 — metrics-observation の観測面」節を先頭新設 = export 状況・非 export ギャップ・CI 権限前例・配置規約の seam 台帳)、本ファイル(鮮度ポインタ + 「最新: 260711-docs-batch10」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`re-scans/260712-metrics-observation.md`(per-intent re-scan 記録)。他成果物(architecture / code-quality-assessment / business-overview / api-documentation / component-inventory / technology-stack / dependencies)は base→observed で本 intent 観測面(既存 seam の再利用面)と無関係、かつ挙動欠陥・構造変化を伴わないため温存(churn 回避、cid:reverse-engineering:c1)。テスト数の機械可読 seam 不在のみ既知ギャップとして functional-design へ持ち越し。

## 実行メタデータ(履歴: 260711-docs-batch10)

- Date: 2026-07-12
- Intent: `260711-docs-batch10`(documentation 4件 — #765 `set-skeleton-stance` verb が `docs/` 全体で未記載 / #764 `orchestrate next --new-intent` フラグが `docs/reference/` で未記載 / #763 `docs/reference/18-workspace-layout.md` の `.ja.md` ペア欠落 / #728 `tests/` 13ファイル・14参照の `assertNotSiblingWorktree` stale コメント参照=product は `resolveWorktreeAnchor` へ改名済み)
- Scope: `documentation`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch5`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1、E-L63 の base 選定2則)。base=`60f5e1edf472517c5fc2b4a1c388dd9a5030446c`(前回 intent `260711-p3-cleanup-batch8` の observed。re-scans 記録の observed を `git merge-base --is-ancestor` で走査し、HEAD 祖先のうち距離最小=64 を採用)、observed=`d6375bba68f415ce1a31e9a4d70e07fbfe80be85`(`git rev-parse HEAD` 実測)。本バッチは restart-loss ではなく起票時からの docs ギャップ(および tests の stale コメント)であり、区間 `base..observed` の docs/tests diff に4欠陥トークンは不在=区間で未変化のまま observed に現存(E-L53 3点法の (b)(c) を実測、(a) 元修正対照は非該当)。フォーカス4 Issue の file:line は現行 HEAD の実コード直読・grep で確定。base/observed の真実源は本 intent の `re-scans/260711-docs-batch10.md` および `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `docs/`(#765 grep 0件、正準ページ `docs/reference/12-state-machine.md`)・`docs/reference/`(#764 grep 0件、正準ページ `docs/reference/03-orchestrator.md`)・`docs/reference/18-workspace-layout.md`(#763、`.ja.md` 欠落=全20ファイル中の唯一欠落)・`tests/`13ファイル14参照(#728、旧名 stale)。source 側の真実: `amadeus-state.ts:371/:445/:518`(set-skeleton-stance)・`amadeus-orchestrate.ts:321/:336/:375/:1427`(--new-intent)・`amadeus-worktree.ts:167`(resolveWorktreeAnchor)
- 更新した成果物: `code-quality-assessment.md`(本 intent の documentation 4欠陥横断節を先頭新設 + 先頭バナーの「最新」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)、`re-scans/260711-docs-batch10.md`(per-intent re-scan 記録)。他成果物(architecture / business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は base→observed で本 intent 観測面(docs/tests のコメント・ペア面)と無関係のため温存(churn 回避)。

## 実行メタデータ(履歴: 260711-docs-repair-batch9)

- Date: 2026-07-11
- Intent: `260711-docs-repair-batch9`(docs/harness 修理バッチ第9弾 — #812 kiro-ide SKILL.md の kiro CLI 版 byte-copy / #824 onboarding.fills.ts の kiro CLI 表記残存 + guide_pointer 誤指し / #680 sensor-type-check の self-contained ヘッダと実 import の矛盾 / #885 normalizeWorktreeSlug 喪失 restart-loss / #886 phase-check ゲート喪失 restart-loss)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-1`(branch `intent/docs-repair-batch9`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`b845478bbf25a534a59f97f18e5a4a2a5a4e239c`(前回 bughunt-fix-batch RE observed。全 re-scan observed 候補の HEAD 祖先性を判定し最短距離59の最新祖先を採用)、observed=`13598b752b656cc9bbf5d931f8e3a6c34881fd1c`(現 HEAD = origin/main)。**#812/#824/#680 の欠陥3ファイルは区間内無変更で欠陥が区間を貫通して現存**、**#885/#886 の lib/state/worktree は区間内で #880(`c4304edf4` flip 配線)・#869(`aac1869e4` jump per-phase)の行番号シフトを受けたが欠陥自体(normalizeWorktreeSlug 喪失 / phase-check ゲート喪失)は未修復で残存**。Always-rerun-for-freshness は差分実測(区間内変更の有無 + 現行 file:line の grep 0件確認)で満たした。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `harness/kiro-ide/skills/amadeus/SKILL.md:14,84`(#812)+ `question-rendering.md:1,11`(#812 同根候補)・`harness/kiro-ide/onboarding.fills.ts:1,15,17,26,30` + `manifest.ts:93`(#824)・`core/tools/amadeus-sensor-type-check.ts:4-5,89`(#680)・`core/tools/amadeus-lib.ts:2099,2430,2580` + `amadeus-worktree.ts:39,195` + `amadeus-state.ts:248,250`(#885)・`core/tools/amadeus-state.ts:101,114,1104,1333,1428,1670` + `amadeus-jump.ts`/`amadeus-orchestrate.ts`(#886)
- 更新した成果物: `code-quality-assessment.md`(本 intent のフォーカス5欠陥現存確認節を先頭新設 + question-rendering.md localize 漏れの #812 未カバー候補記録 + 先頭バナー/batch5 節「本 intent」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`architecture.md`(restart-loss 系統節「docs-repair-batch9 の観測面」新設 + core-repair-batch3 バナー「最新」降格・「本 intent」履歴ラベル化)、`code-structure.md`(restart-loss フォーカス面の区間構造変化節 = #880/#869 の flip 再構築を新設)、`component-inventory.md`(docs/harness 修理コンポーネント節新設)、本ファイル(鮮度ポインタ)。他成果物(business-overview / api-documentation / technology-stack / dependencies)は本 intent 観測面と無関係のため温存(churn 回避、cid:reverse-engineering:c1)。

## 実行メタデータ(履歴: 260711-p3-cleanup-batch8)

- Date: 2026-07-11
- Intent: `260711-p3-cleanup-batch8`(P3 修理7件 — #843 stage-protocol.md persona 注入残存 / #846 sensor・validate ツールの無条件 main() import 副作用 / #850 audit-fork one-shot ガードの復活拒否 / #851 issue-ref-contract.md 全面不在 / #876 computeStrippableLines の brace-only 行 strip 漏れ / #877 run-tests バッチ時の persist seam 分離不全 / #878 orchestrate default 出口の recordEngineError 非配線)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/batch-c-learnings-audit`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`9738580ef`(re-scans 最新 observed 由来)、observed=`60f5e1edf`(現 HEAD)。差分区間 `9738580ef..60f5e1edf`(294 files, +25889/-3508)。restart-loss 4件(#843/#846/#850/#851)の欠陥ファイルは区間内で一切未変更(`git diff --name-only` grep = NONE)で base 時点の既存欠陥、#876/#877/#878 は区間内で導入・変更された面。フォーカス7 Issue の file:line は現行 HEAD の実コード直読で再確定。base/observed の真実源は本 intent の `re-scans/260711-p3-cleanup-batch8.md` および `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `core/amadeus-common/protocols/stage-protocol.md:611-614`(#843)・`core/tools/amadeus-sensor-required-sections.ts:229` + `amadeus-sensor-upstream-coverage.ts:111` + `amadeus-validate.ts:305`(#846、参照実装 `amadeus-learnings.ts:916`)・`core/tools/amadeus-audit.ts:471-475`(#850)・`harness/<name>/skills/amadeus/references/issue-ref-contract.md`(#851、不在)・`tests/lib/coverage-normalize.ts:40/:117/:126-132/:135`(#876)・`tests/run-tests.ts:692` + `tests/unit/t-learnings-persist-seam.test.ts:40-61`(#877)・`core/tools/amadeus-orchestrate.ts:2995-3001` + `recordEngineError:195`/配線 `:3017`(#878)
- 更新した成果物: `code-quality-assessment.md`(本 intent の修理7件横断分類節を先頭新設 + 先頭バナー/batch5 節見出しの「最新/本 intent」→履歴ラベル化 cid:reverse-engineering:c3-relabel)、`architecture.md`(「orchestrate エラー監査経路の部分配線(#879/#878)」構造節を新設 + 先頭バナー履歴化)、本ファイル(鮮度ポインタ)、`re-scans/260711-p3-cleanup-batch8.md`(per-intent re-scan 記録)。他成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は base→observed で本 intent 観測面と無関係のため温存(churn 回避、前回 RE と同判断)。

## 実行メタデータ(履歴: 260711-p2-repair-batch7)

- Date: 2026-07-11
- Intent: `260711-p2-repair-batch7`(restart-loss クラス5バグ — #834 orchestrate parked 短絡が `--new-intent` 非検査 / #839 orchestrate トップレベル catch・error 分岐が ERROR_LOGGED 非配線 / #844 doctor workspace-shell-ready の2状態判定+一律 fix 文言 / #845 log-subagent 完了 intent ゲート不在+agent_type 空文字素通し / #849 learnings readRuntimeStageRow の runtime-graph 欠落 hard fail=自己修復せず)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-2`(branch `intent/p2-repair-batch7` = origin/main ベース)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`d8de2362b`(最新祖先 observed = 260710-p3-cleanup-batch5)、observed=`37ad36a97`(`git rev-parse HEAD` 実測)。区間 `d8de2362b..37ad36a97` = 13 コミット。6フォーカスファイル限定 diff は `amadeus-utility.ts`(M、#830/#855 の doctor Check1/3 anchor の `5c5e042a2`、#844 面 `:619-632` には非関与)のみで、残り5ファイル(orchestrate / log-subagent / learnings / runtime / runtime-compile)は base 時点と**バイト同一**。**5欠陥はいずれも observed HEAD に未修正で現存**。base 決定は `git merge-base --is-ancestor` で実測(`11c52f153`=swarm-worktree-batch は HEAD 非祖先につき除外、最新祖先 `d8de2362b` を採用)。base/observed の真実源は本 intent の `re-scans/260711-p2-repair-batch7.md`(共有本ファイルは鮮度ポインタ)。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-orchestrate.ts:1243-1259`(#834 Branch 2.5)・`amadeus-orchestrate.ts:2913-2920`+`errorDirective:236`(#839、対照 `amadeus-lib.ts:4353` emitError)・`amadeus-utility.ts:619-632`(#844 handleDoctor 「5. Workspace shell ready」)・`amadeus-log-subagent.ts:41,48,50-52`(#845)・`amadeus-learnings.ts:127-153`(#849 readRuntimeStageRow、self-heal seam=`amadeus-runtime.ts:319` `export function compile`)
- 更新した成果物: `code-quality-assessment.md`(本 intent の restart-loss クラス5欠陥横断分類節を先頭新設 + 先頭バナー履歴化 + batch5 節の「本 intent」自己参照を履歴ラベル化 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は5件が挙動欠陥で構造変化を伴わず、かつ base→observed のフォーカス面が実質無変更のため温存(churn 回避、前例=p3-cleanup-batch5/batch4 の判断)。archive 参照解4件はすべて旧系譜パス `.agents/amadeus/{tools,hooks}/...` で、現行正本 `packages/framework/core/{tools,hooks}/...` へ読み替えて移植する(#834 は参照解なしの新規修正)。

## 実行メタデータ(履歴: 260711-p3-repair-batch6)

- Date: 2026-07-11
- Intent: `260711-p3-repair-batch6`(P3 修理6件 — #841 tryEmitSwarm が完了バッチ非除外で静的 batches[0] 再提示 / #842 jump が backward でも PHASE_VERIFIED emit・多相 forward 単一化・PHASE_SKIPPED 不在 / #836 delegate 承認で Phase Progress ロールアップ未更新 / #840 detectWorkspace が SCAN_SOURCE_DIRS 限定で Greenfield 誤判定 / #847 sensor-linter が eslint ラップ専用で lint:check 2段検出不在 / #848 docs-only の workspace_requires 免除経路 declare-docs-only/GUARD_EXEMPTED 喪失)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-3`(branch `claude-engineer-6`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`d8de2362b`(前回 batch5 RE observed)、observed=`37ad36a97`(現 origin/main)。介在13コミットのうち `packages/framework/core/tools/` のコア tools 変更は `amadeus-lib.ts`(#859 adapter mint を共有分類器へ経路変更ほか、+84)/`amadeus-state.ts`(+6)/`amadeus-swarm.ts`(+2)/`amadeus-utility.ts`(+5)の4ファイルに限定。**本 intent のフォーカス6欠陥が属する `amadeus-orchestrate.ts` / `amadeus-jump.ts` / `amadeus-sensor-linter.ts` / `amadeus-graph.ts` / `amadeus-stage-schema.ts` は本区間で未変更**。6欠陥は本区間の新規回帰ではなく、より古い時点で着地した元修正(#486=`3eca83a56` / #481=`2c2c48a39` / #459=`765fe4f20` / #538=`c6597bf18` / #499=`c8ddabffc`)が restart/reset により喪失し元修正前へ逆戻りした既存欠陥で、現 observed で全件現存。Always-rerun-for-freshness は差分実測(コア tools 4ファイルの差分確認+フォーカス5ファイル無変更判定+6欠陥の現行 file:line 実読)で満たした。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-orchestrate.ts:1703/:1717-1720`(#841 tryEmitSwarm)・`amadeus-jump.ts:432-447`(#842 phase 境界 emit)・`amadeus-utility.ts:2449/:2396-2414`(#836 Phase Progress 書き込み)+ `amadeus-state.ts:1135/:1655`(#836 advance/delegate 経路)・`amadeus-utility.ts:1917/:1949-1954/:1762`(#840 detectWorkspace/SCAN_SOURCE_DIRS)・`amadeus-sensor-linter.ts:5-43`(#847 eslint ラップ専用)・`amadeus-state.ts:952/:967-975`(#848 workspace_requires 拒否経路)+ 免除経路の不在確認
- 更新した成果物: `code-quality-assessment.md`(本 intent の restart 喪失 regression 6欠陥横断分類節を先頭新設 + 先頭バナーの batch6 現行化 + batch5 節見出しの「候補」→履歴ラベル化&修正着地状態行の追記 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わず、かつ batch5 修正着地(lib/utility/swarm/state)も既存インベントリ済みコアツールの内部挙動変更で構造非改変のため温存(churn 回避、前例=p3-cleanup-batch5/batch4 の判断)。#840 の detectWorkspace 現状(SCAN_SOURCE_DIRS 限定で本 repo を Greenfield 誤判定しうる)は workspace 分類の CodeKB 根拠の現行限界として code-quality-assessment 内で接地済み。

## 実行メタデータ(履歴: 260710-p3-cleanup-batch5)

- Date: 2026-07-11
- Intent: `260710-p3-cleanup-batch5`(P3 候補6件 — #811 adapter inline mint が #755 分類器バイパス / #822 kiro 系 runCore の cwd 喪失 / #830 doctor Check1/3 の anchored base dir 非適用 = #746 残渣 / #730 bun lcov の関数内コメント/空白行 DA:0 の merge union false-red / #819 t92 case 15 の非ヘルメティック実 eslint spawn フレーク / #831 t76 test 12 の cursor 解決/timeOrigin 依存フレーク)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch5`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`58f3453ad`(前回 batch4 RE observed)、observed=`d8de2362b`(コード基準、origin/main の batch3/batch4 全着地点)。現 HEAD `6279efe58` は `d8de2362b` の1コミット先だが intent birth checkpoint のみでフォーカスファイル無変更。介在16コミットのうちフォーカス領域に触れたのは #751(codex adapter wrapContext のみ)/#753(kiro-ide buildForward のみ)/#746(worktreeBaseDir 昇格、utility.ts 未変更)/#758(stop-hook carve-out)の4件だが、**いずれも本候補6件の欠陥箇所は未修正で行番号シフトのみ** — 6件は差分区間を通じて現存する欠陥。Always-rerun-for-freshness は差分実測(行番号現行値更新+未修正判定)で満たした。base/observed の真実源は当該 intent(260710-p3-cleanup-batch5)の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `harness/{codex,kiro,kiro-ide}/hooks/amadeus-*-adapter.ts`(#811 mint case / #822 runCore cwd)・`core/hooks/amadeus-mint-presence.ts:65` + `core/tools/amadeus-lib.ts:347`(#811 対照分類器)・`amadeus-utility.ts:831/:960/:998`(#830 doctor Check1/2/3)・`tests/run-tests.ts:509/:534/:674/:689`(#730 normalize/combine coverage)・`tests/integration/t92.test.ts:327/:610/:661`(#819 fire/runFailedTsReal/case 15)・`tests/unit/t76.test.ts:626-654` + lib `:2775-2851/:3135`(#831 auditLockDir/staleness/retry)
- 更新した成果物: `code-quality-assessment.md`(当該 intent(260710-p3-cleanup-batch5)の候補6欠陥横断分類節を先頭新設 + 先頭バナー/batch4 節見出しの「本 intent」→履歴ラベル化 + batch4 節へ全6件修正済み状態行を追記 cid:reverse-engineering:c3-relabel)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わないため温存(churn 回避、前例=p3-cleanup-batch4 の判断)。ただし #811 起票の対照実装 path 誤り(core/tools → 正は `core/hooks/amadeus-mint-presence.ts:65`)は code-quality-assessment の #811 節で正誤を吸収済み。

## 実行メタデータ(履歴: 260710-p3-cleanup-batch4)

> 全6件修正着地済み(2026-07-10、PR #823/#821/#817/#818/#814/#815)。

- Date: 2026-07-10
- Intent: `260710-p3-cleanup-batch4`(P3 バグ6件 — #757 sensor-fire の生パス glob / #758 stop-hook carve-out の mutating verb 漏れ / #753 kiro-ide adapter の IDE/CLI 語彙不一致 dead seam / #739 promote-self walk の dangling symlink クラッシュ / #740 prerelease バッジ 404 / #784 gen-coverage-registry --check の無診断クラッシュ)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-2`(branch `intent/p3-cleanup-batch4`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base=`da1611a9a`(前回 observed 相当)、observed=`58f3453ad`(現 HEAD = main)。焦点9ファイル中7ファイルは `da1611a9a..HEAD` で無変更(起票時照合が有効)、2ファイルのみ変更 — `amadeus-sensor-fire.ts`(#793、`d715b8224`、行 +3 シフトのみで #757 欠陥不変)/`amadeus-state.ts`(#804、`d9d7b6ba4`、switch 下方シフトのみで #758 が数える7 verb 不変)。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-sensor-fire.ts`(#757)・`amadeus-stop.ts` + `amadeus-state.ts` switch(#758)・`kiro-ide/hooks/amadeus-kiro-adapter.ts` + `.kiro.hook`(#753)・`scripts/promote-self.ts`(#739)・`scripts/release-version-sync-plan.ts` + `release.yml`(#740)・`tests/gen-coverage-registry.ts`(#784)
- 更新した成果物: `code-quality-assessment.md`(本 intent の P3 6欠陥横断分類節を追加)、本ファイル(鮮度ポインタ)。他成果物(architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / business-overview)は6件が挙動欠陥で構造変化を伴わないため温存(churn 回避、cid:practices-discovery:c2 相当。前例=core-repair-batch3 の判断)。

## 実行メタデータ(履歴: 260710-core-repair-batch3)

- Date: 2026-07-11
- Intent: `260710-core-repair-batch3`(バッチ3: #746 / #786 / #742 / #743 / #747 / #741 / #751 / #744 / #749 / #750 — swarm/bolt の worktreePath read/write 非対称 / learnings emitKey の生 NUL バイト / setup の err swallow・非アトミック書き込み・prerelease 順序無視 / t90 test 13 の wallclock フレーク / codex adapter のレガシー flat root 参照 / orchestrate の PHASE_NUMBERS prototype-chain・single skeleton-gate 詰み・Branch 0 除外欠落)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/batch-c-learnings-audit`。焦点コードは origin/main と同一を都度確認)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1、E-L3 追補適用)。**焦点コードは base→observed でいずれも無変更**(`amadeus-swarm.ts`/`amadeus-learnings.ts`/`amadeus-orchestrate.ts` と setup の installation/upgrade/semver-factory、codex adapter、t90.test.ts は全て UNCHANGED。`amadeus-lib.ts`/`amadeus-jump.ts`/`amadeus-state.ts`/setup `fsops.ts`/`resolver.ts` は区間内変更ありだが**焦点行は無変更で行番号のみシフト**)。14コミットの差分区間はバッチ D と周辺 hooks/presence 修理が着地したが焦点面に非関与のため、バッチ3の10 Issue は差分区間を通じて現存する欠陥。Always-rerun-for-freshness は「焦点コード無変更」の確認で満たした。
- Base commit(前回 observed): `da1611a9ace9dc81d92c7c617d506bde938fa4cc`(= tools-dispatch-batch の observed)
- Observed commit(現 origin/main): `58f3453ad0d2cee653619c9fbc27ec3888f1d110`(差分区間 `da1611a9a..origin/main` は14コミット)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-lib.ts`(`:1905-1907` worktreePath / `:86` PHASE_NUMBERS / `:4124` firstInScopeStageOfPhase / `:850` FLAT_MIGRATION_ROOT / `:2120` hooksHealthDir)・`amadeus-swarm.ts`(`:233` verdictFor の生 read)・`amadeus-learnings.ts`(`:571` emitKey の生 NUL)・`amadeus-orchestrate.ts`(`:2194` canonicalisePhase / `:1017-1031` computeGate / `:1948-` emitSingleRunStage / `:1115-1117` Branch 0)・`amadeus-jump.ts:176`・`amadeus-state.ts:2512`(#744 各サイト)・setup `installation.ts:28-45`(#742)・`fsops.ts:66`(#743)・`semver-factory.ts:15-21`/`upgrade.ts:42`(#747)・`amadeus-codex-adapter.ts:193/198/200-217`(#751)・`tests/integration/t90.test.ts:503`(#741)
- 更新した成果物: `architecture.md`(「core-repair-batch3(2026-07-11)の観測面」節を新設 + 先頭バナー履歴化 + tools-dispatch-batch 節の「本 intent」→履歴ラベル化)、`code-quality-assessment.md`(同名品質観測節を先頭新設 + 先頭バナー/tools-dispatch-batch 節の「本 intent」→履歴ラベル化)、本ファイル(鮮度ポインタ)。他成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は base→observed 無変更かつ焦点欠陥が構造変化を伴わない挙動欠陥のため内容追記なし(churn 回避、前回 RE と同判断)。

## 実行メタデータ(履歴: 260710-complexity-gate)

- Date: 2026-07-10
- Intent: `260710-complexity-gate`(CI にコード複雑度の増加を機械的に止める2層ゲート — Biome `noExcessiveCognitiveComplexity` warn + lizard CCN の baseline ラチェット — を導入する)
- Scope: `feature`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-2`(branch `intent/codecov-project-gate`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス5面(`ci.yml`・`tests/coverage-project-gate.ts`・`gen-coverage-registry.ts`・`biome.json`・`package.json`)。フォーカス面のコード diff は `ci.yml` +18/-3・`tests/coverage-project-gate.ts` 新規 +236 で、`gen-coverage-registry.ts`・`biome.json`・`package.json` は base→observed で無変更。base/observed の真実源は per-intent の `re-scans/`(共有本ファイルは鮮度ポインタ)。
- Base commit: `584262c1a`(前回スキャン observed)
- Observed commit: `05141555b`(現 HEAD 実測)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: ゲート系ツールの正準テンプレート(`coverage-project-gate.ts` の env seam・parse-don't-validate・fail-closed 5値 FailReason・`--check`/`--update`)・CI ジョブ DAG(`check`/`coverage`/`codecov-status`/`ci-success`、#777 concurrency・#801 Codecov flags 削除)・lizard 複雑度分布実測(1,093関数、CCN>15 が 42、最大 `blockBoltSlug` 65)・Biome lint スコープ(`tests/ packages/setup/`)拡大対象
- 更新した成果物: `code-quality-assessment.md`(複雑度ゲート導入節=分布実測+2層ゲート計画を先頭に追加)、`architecture.md`(ゲート系ツールの正準テンプレートと CI ジョブ構成節を追加)、`code-structure.md`(ゲート系ツールの構造テンプレート節を追加)、`technology-stack.md`・`dependencies.md`(lizard 1.23.0 pip 固定導入予定 + Biome noExcessiveCognitiveComplexity 有効化予定)、本ファイル(鮮度ポインタ)。全 codekb ファイルに c3-relabel(旧 intent の現在時制マーカー→履歴ラベル)を適用。business-overview / api-documentation / component-inventory は relabel のみ。

## 実行メタデータ(履歴: 260710-tools-dispatch-batch)

- Date: 2026-07-10
- Intent: `260710-tools-dispatch-batch`(バッチ D: #774 / #785 / #787 / #788 / #789 — setup version resolver のページング欠落 / runner-gen prune の非対称 / jump execute の direction 非再導出 / graph・runtime dispatch の prototype-chain / state advance の nextSlug 方向盲目)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(作業ツリー HEAD `c59c5a9c7`、branch `intent/batch-c-learnings-audit` 上だが焦点コードは origin/main と同一)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。**焦点5ファイルは base→observed でコード diff 空**(setup resolver/http は 2026-07-09、core tools は `0801d2100`=2026-07-07 が最終変更。`amadeus-runtime.ts` のみ #781 で改変されたが dispatch site を含む hunk は無し)。9 コミットの差分区間はいずれも Batch D の焦点面に非関与のため、Batch D の5 Issue は差分区間を通じて現存する欠陥。Always-rerun-for-freshness は「焦点コード無変更」の確認で満たした。
- Base commit(前回 observed): `8e212dbbb4c52939638c5cef18732cb351771259`
- Observed commit(現 origin/main): `da1611a9ace9dc81d92c7c617d506bde938fa4cc`(差分区間 `8e212dbbb..origin/main` は9コミット)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `packages/setup/src/modules/resolver.ts`(`:12` BR-F09 / `:22-37` fetchNames の単一ページ / `:57-79` resolveVersion)・`packages/setup/src/ports/http.ts`(`:9-12` getJson がヘッダ非露出)・`amadeus-runner-gen.ts`(`:295-300` prune の loadGraph 限定 / `:324-365` onDiskRunnerSlugs 対 compiledSet)・`amadeus-jump.ts`(`:220-` handleExecute の direction 非再導出 / `:173-180` handleResolve が権威)・`amadeus-graph.ts`(`:1670`/`:1901` COMMANDS[cmd])・`amadeus-runtime.ts`(`:1412`/`:1453` SUBCOMMANDS[cmd])・`amadeus-state.ts`(`:1005-1018` advance の nextSlug 検証 / `:1077` crossesPhaseBoundary の方向盲目 / `:1103-1126` phase イベント emit)
- 更新した成果物: `architecture.md`(「tools-dispatch-batch(2026-07-10)の観測面」節を新設 + 先頭バナー履歴化)、`code-quality-assessment.md`(同名観測節を新設 + 先頭バナー/旧節見出しの履歴化)、本ファイル(鮮度ポインタ)。他成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies)は c3-relabel の該当箇所を履歴ラベル化するのみで内容追記なし(焦点欠陥は構造変化を伴わない挙動欠陥のため churn 回避、前回 RE と同判断)。

## 実行メタデータ(前々回: 260710-learnings-audit-batch)

- Date: 2026-07-10
- Intent: `260710-learnings-audit-batch`(バッチ C: #754 / #745 / #761 — §13 learnings の persist 判定と runtime 集計窓の欠陥修理)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/batch-c-learnings-audit`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。**焦点2ファイル `amadeus-learnings.ts` / `amadeus-runtime.ts` は base→observed でコード diff 空**(最終変更 `0801d2100`=2026-07-07、前回スキャン base より前)。よって前回理解を温存し、バッチ C が要求する「persist 判定マトリクスの真理値表」「per-unit learnings 集計窓のデータフロー」を現行コード直読で第一級の事実として codekb に整理した。
- Base commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(前回 observed = intent 260710-source-unreferenced-check)
- Observed commit: `8e212dbbb`(origin/main 最新 = PR #759 込み)を含む現 HEAD `intent/batch-c-learnings-audit`。差分区間 `584262c1a..HEAD` は #759(package.ts source scan)等の後半マージ群だが**焦点2ファイルは無変更**。
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-learnings.ts` `handlePersist`(:411-608 の dedup 判定マトリクス、:407 cidMarker、:431 静的 auditContent スナップショット、:348-358 priorAuditRow、:508-511 flush)・`amadeus-runtime.ts`(:684-700 countLearnings、:702-755 populator の instance-bearing/single 分岐、:461-560 rollup null-out、:974-976 summarize 集計、:1034 maxInstanceCompletedAt)
- 更新した成果物: `architecture.md`(「§13 learnings persist 判定マトリクスと audit 整合」「runtime learnings 集計の窓(per-unit)」の2新設節 + 先頭バナー履歴化)、`code-quality-assessment.md`(learnings-audit-batch 観測節 + 先頭バナー/mint-presence 節見出しの履歴化)、本ファイル(鮮度ポインタ)。`code-structure.md` は**無変更**(両焦点ファイルは既存インベントリ済みのコアツールで、欠陥は構造変化を伴わない挙動欠陥のため churn 回避)。他成果物は base→observed 無変更かつ本 intent 観測面と無関係のため温存(cid:practices-discovery:c2 相当)。

## 実行メタデータ(履歴: 260710-bughunt-fix-batch)

- Date: 2026-07-10
- Intent: `260710-bughunt-fix-batch`(#771/#773/#775/#776/#779 の5バグをまとめて修理するバッチ)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-3`(branch `claude-engineer-6`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。base→observed でフォーカス5面のうち `scripts/package.ts`(#759=#735)・`amadeus-lib.ts`(#756=#736)・`amadeus-runtime.ts`(#781=#761)に**実コード差分あり**だが、いずれも今回の修理対象欠陥そのものは**未修正**(5バグは全て現行コードに残存、file:line で裏取り)。base/observed の真実源は per-intent の `re-scans/260710-bughunt-fix-batch.md`。
- Base commit: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(前回 observed = intent 260710-mint-presence-vectors)
- Observed commit: `b845478bbf25a534a59f97f18e5a4a2a5a4e239c`(現 HEAD 実測)
- 差分規模: `git diff --name-status <base>..<observed> -- ':!amadeus/' ':!dist/'` は **37 ファイル**(amadeus-lib/runtime/state/learnings の core+self-install コピー、ci.yml、codecov.yml、package.ts、promote-self.ts、manifest-types.ts、harness/codex/emit.ts、tests 多数 — 自前 coverage gate 新設 `tests/coverage-project-gate.ts`/baseline JSON を含む)。
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: (#771)`scripts/package.ts` writeHarness/checkHarness、(#773)`packages/setup/src/ports/fsops.ts` resolveUnderRoot + `scripts/package.ts:644`、(#775)`core/hooks/` の audit-logger/sensor-fire/log-subagent/validate-state の pre-init ガード、(#776)`core/hooks/amadeus-sync-statusline.ts` の Bun.spawnSync、(#779)`amadeus-lib.ts` の isoTimestamp/scanPresenceLedger/auditShards と消費者(humanActedSinceGate/humanActedSinceLastAnswer/runtime.ts pairStartedCompleted)。
- 更新した成果物: `code-quality-assessment.md`(本 intent 観測節を先頭に追加 + 直近 mint-presence マーカーを履歴ラベル化 cid:reverse-engineering:c3-relabel)、`code-structure.md`(自前 project ゲート出荷後状態を追補)、本ファイル(鮮度ポインタ)。`architecture.md` は skeleton 不変・新規 architecture decision 無しのため温存。他成果物も base→observed 無変更かつ本 intent 観測面と無関係のため温存(churn 回避)。

## 実行メタデータ(前々々回: 260710-mint-presence-vectors)

- Date: 2026-07-10
- Intent: `260710-mint-presence-vectors`(#755 — machine-injected-turn 分類器が `<task-notification>` 開頭のみを抑止し、teammate-message 注入ターン(agmsg/SendMessage inbox 配信、形式 D)が phantom HUMAN_TURN を鋳造して human-presence gate と #671 委任 provenance を汚染する)
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/codex-engineer-1`(branch `diag/683-codecov-project-numeric-target`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス面のコード diff は**空**(base→observed でソース無変更)のため前回理解を温存し、e1/e6/e5 の 3 者食い違いを動的実測(隔離 temp プロジェクトでの合成 stdin 測定)+ 本番 Claude Code transcript の法医学的照合で確定した。base/observed の真実源は per-intent の `re-scans/260710-mint-presence-vectors.md`(共有本ファイルは鮮度ポインタでありベース点ではない)。
- Base commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(前回 observed = intent 260710-source-unreferenced-check)
- Observed commit: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(現 HEAD 実測)
- 実施体制: Developer(スキャン)→ Architect(合成)の 2 サブエージェント直列(cid:reverse-engineering:c3)
- Focus: `amadeus-mint-presence.ts`(分類器)・`amadeus-stop.ts` tier-3(`transcriptIsConversational`)・`amadeus-lib.ts` `humanActedSinceGate`・`amadeus-state.ts` 委任 grounding・`tests/unit/t203-mint-presence-classify.test.ts`
- 更新した成果物: `code-quality-assessment.md`(#755 観測節を追加)、`architecture.md`(注入分類カタログ非共有の構造事実を追補)、本ファイル(鮮度ポインタ)。他成果物は base→observed 無変更かつ当該 intent 観測面と無関係のため温存(churn 回避、cid:practices-discovery:c2 相当)。

## 実行メタデータ(前々々々回: 260710-source-unreferenced-check)

- Date: 2026-07-10
- Intent: `260710-source-unreferenced-chec`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-3`(branch `intent/735-source-unreferenced-check`, base `origin/main`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit(前回 codekb 観測コミット): `162553b99`(intent `260709-bug-zero-batch` の統合版、`codekb/amadeus/` 一本化後。前回 gate-mechanics スキャンもこのコミットを観測対象としており、実コード diff は0だった)
- Observed commit: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(現 HEAD、`origin/main` = #737 込みをマージ済み)
- 差分規模: `git log 162553b99..HEAD` は38コミット。本日の main マージ群(#711/#712/#713/#714/#715/#716、#721/#722/#724/#725/#726、#732、#727=#670修正、#729=#685修正、#737=#719修正 等)を含み、当該スキャンは前回2スキャン(bug-zero-batch/gate-mechanics)と異なり**実コードに差分がある**。
- Focus: Issue #735 が依存する理解面 — **packaging の入力集合と source 側 unreferenced 検査点**。`scripts/package.ts`(`checkHarness`/`buildTree`)、全 harness の `manifest.ts`(`harnessFiles`/`renames`/`authoredExempt`/`emit`)、#737(kiro CLI の stale `.kiro.hook` 削除 + vacuous exemption 除去)と #711(dist 全域 orphan scan)を重点読解。
- ベースにした codekb: `amadeus/spaces/default/codekb/amadeus/`(2026-07-09、intent `260709-gate-mechanics` 版)

## 再検証結果(source-unreferenced-check の差分、履歴)

38コミットのうち、前回 codekb(gate-mechanics 版)の記述を陳腐化させる主要変更と、#735 の理解面に新規に加える読解結果を記録する。

### 前回 codekb を陳腐化させた変更(2バグとも出荷済みに)

- **#685 delegate-rejection は解消済み(#729)**: 前回 codekb は「REJECT 側に delegate-approval 相当の遠隔委任機構が存在しない」と記録していたが、`14d1146e0`「fix #685: add DELEGATED_REJECTION ... (#729)」がマージ済み。現在 `amadeus-state.ts` の subcommand dispatch(L262-263)に `delegate-rejection` → `handleDelegateRejection` があり、`amadeus-audit.ts` の `VALID_EVENT_TYPES`(L73)と presence/provenance の trusted-writer 集合(L755)に `DELEGATED_REJECTION` が追加された。`humanActedSinceGate` は「`DELEGATED_APPROVAL` は approve のみ、`DELEGATED_REJECTION` は reject のみを開く」verb-scoped presence に分離されている(`amadeus-state.ts` L1444 近傍のコメント)。architecture.md・code-structure.md・api-documentation.md 等の #685「不在」記述は歴史的記録であり、以後は「#685 は fix 済み」を前提にする。
- **#670 sibling-worktree guard は解消済み(#727)**: 前回 codekb は `assertNotSiblingWorktree` が sibling worktree を無条件拒否すると記録していたが、`20c2e9674`「fix #670: anchor amadeus-worktree write paths to the main checkout (#727)」がマージ済み。現在 `amadeus-worktree.ts` は無条件拒否をやめ、cwd を分類して write パスをメインチェックアウトへ**アンカー**する方式(戻り値 `{ cwdTop, mainCheckout }`、L116-123)。sibling dev worktree から呼んでも Bolt worktree はメインチェックアウトの sibling として作成/マージ/破棄される(冒頭コメント L12-13、分類コメント L133-137)。architecture.md・code-structure.md の #670「無条件拒否」記述は歴史的記録。

### #735 の理解面(新規読解)

- **build が読む「入力集合」の確定点**: `scripts/package.ts` の `buildTree`(L307)が、build がソースとして消費する集合を確定する。(1)`core/<coreDirs[].src>` を `walk()` で列挙(L322-344)、(2)`harness/<name>/<harnessFiles[].src>` を個別コピー(L357-363)、(3)onboarding skeleton(L370-376)、(4)`core/memory/` を `emitMemory`/`emitMemorySeed`(L382-395)、(5)`emit()` プラグイン(codex のみ、L446-458)。harness ソースは**ディレクトリ全体を walk せず `harnessFiles` に列挙された src だけ**をコピーする — したがって `harness/<name>/` 配下の未列挙ファイルは build から完全に不可視になる。
- **source 側 unreferenced 検査は現状不在**: `checkHarness`(L554)の orphan 検出はすべて **dist 出力側**(committed dist vs 再ビルド dist)で働く(harness-dir orphan L574-582、dist 全域 orphan L605-628、#711 で追加)。`harness/<name>/` の authored ソースが manifest のどの行からも参照されない場合、それは dist に到達しないため dist orphan scan では検出できない。これが #735 が塞ごうとしているギャップ。
- **#737 = このギャップの実害例**: kiro CLI harness に7個の `.kiro.hook` ソースファイルが manifest 未参照のまま残存し(dist へ出荷されず)、しかも kiro manifest の `authoredExempt` に「dist/kiro には元々存在しない」ファイル種別を除外する vacuous な regex `/^hooks\/[^/]+\.kiro\.hook$/` があった。#737 は7ファイルを削除し vacuous exemption を除去、`t148` に「CLI harness ソースに `.kiro.hook` が0個」の再注入ガードを追加した(`tests/smoke/t148-kiro-file-structure.test.ts`)。詳細は code-quality-assessment.md・code-structure.md「packaging」節を参照。

## 実行メタデータ(前回: 260709-bug-zero-batch、履歴として保持)

- Date: 2026-07-09
- Intent: `260709-bug-zero-batch`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-engineer-1`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit: `aff3b6671`(`amadeus/spaces/default/codekb/claude-leader/` の観測コミット、前回 intent `260709-framework-repair-batch` のスキャン)
- Observed commit: `a1c79dc12df38a8363524116eff9d877677a7224`
- Focus: 修理対象バグ6件 — #674(`amadeus-swarm.ts` finalize の merge-back/audit 分離)、#675(`amadeus-state.ts` reject の human-presence guard 欠落)、#676(`amadeus-bolt.ts` start + `amadeus-lib.ts` auditFilePath の bare fallback)、#677(`packages/setup/src/ports/http.ts` getJson の json() 未保護)、#678(`packages/setup/src/internal/tar-archive-extractor.ts` の PAX/GNU longname 状態)、#668(`amadeus-utility.ts`/`amadeus-lib.ts` の codekb-path `<repo>` セグメント導出)
- ベースにした codekb: `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`、対象バグ #656/#657/#641/#661)

## 分析範囲

`git diff --name-status aff3b6671..HEAD` で143ファイルの差分を確認した(19コミット、うち大半は `origin/claude-leader` ブランチのマージ)。主な変更内容は次の通り。

- `modelOverride` → `model` へのエージェント frontmatter 改名(PR #669、114ファイル規模、`.claude`/`.codex`/`dist/*`/`packages/framework/core/agents/` の全複製箇所)。
- `amadeus/spaces/default/codekb/claude-leader/` の新設(前回 intent `260709-framework-repair-batch` のスキャン結果、9ファイル)。
- `amadeus/spaces/default/intents/260709-canonical-settings/`・`260709-framework-repair-batch/` の工程記録追加(ideation/requirements-analysis の memory・questions・requirements)。
- `amadeus/spaces/default/memory/team.md` への §13 学習事項の複数追記(human-presence interim 運用、auto-gate-approval、blocker-election 等の運用ノルム)。

この差分自体は当該 intent(bug-zero-batch)が対象とする6バグのコード領域(`amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts`/`amadeus-lib.ts`/`packages/setup/src/ports/http.ts`/`packages/setup/src/internal/tar-archive-extractor.ts`)に変更を加えていない。したがって6バグはこの差分区間の前後を通じて存在し続けている欠陥である。

重点スキャン対象は次の6ファイル/領域(すべて実コードを直接読解して確認)。

- `packages/framework/core/tools/amadeus-swarm.ts` L484-631(`handleFinalize`)— #674
- `packages/framework/core/tools/amadeus-state.ts` L1286-1487(`handleApprove`/`handleReject`)— #675
- `packages/framework/core/tools/amadeus-bolt.ts` L180-239(`start` の `--worktree` パス)+ `amadeus-lib.ts` L1246-1271(`stateFilePath`/`auditFilePath`)— #676
- `packages/setup/src/ports/http.ts` 全体(84行)— #677
- `packages/setup/src/internal/tar-archive-extractor.ts` 全体(228行)— #678
- `packages/framework/core/tools/amadeus-lib.ts` L495-524(`codekbRepoName`)+ `amadeus-utility.ts` L2690-2699(`codekb-path` ハンドラ)— #668

## 鮮度に関する注記

ベースライン `amadeus/spaces/default/codekb/claude-leader/`(2026-07-09、intent `260709-framework-repair-batch`)は #656/#657/#641/#661 という前回バッチの4バグを主眼に書かれており、当該 intent(bug-zero-batch)が対象とする6バグには一言も触れていない。当該スキャンはこの前提を次のように更新した。

- 対象バグ群を完全に入れ替えた(#656/#657/#641/#661 → #674/#675/#676/#677/#678/#668)。前回バッチの4件はこの codekb では扱わない。
- 前回バッチのうち #656(`Installation.detect` が `LegacyLayout` を呼ばない)は、`upgrade.ts:192` で `Installation.detect` の evidence を `LegacyLayout.isUnsupported` に渡す配線が確認でき、解消済みと判断した。#657(`bunx tsc` の無条件使用)は `amadeus-sensor-type-check.ts:157,174` の時点でも変更が確認できず、未修理のまま残存している。#641・#661 は本スキャンの重点対象外のため状態未確認。これらは当該 intent のスコープではないため、修理判断は行わず状態のみを記録する。
- `packages/framework/core/`・`packages/setup/` の全体構造(one-core-many-harnesses、functional-domain-modeling-ts スタイル)自体は前回スキャン時点から変更なし。

## 合成方針(Architect 想定)

Developer スキャン結果として、6アーティファクト構造(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment / reverse-engineering-timestamp の9ファイル)を diff-refresh 方式で更新した。前回バッチの4バグに関する記述は新しい6バグの記述に置き換え、全体構造・技術スタック・依存関係グラフのうち変更がない節(one-core-many-harnesses、Bun/TypeScript/Biome スタック、`release.yml` 一本化のバージョン運用)はベース(claude-leader 版)の記述をほぼ温存した。architecture.md に6バグそれぞれの相互作用図(シーケンス図)を新設し、原因コード位置・再現条件・修理時の波及範囲を code-structure.md・code-quality-assessment.md に集中して記述した。

## 更新した成果物

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`

## 統合記録(AC-668-4、2026-07-09)

- **統合**: #668 修正(PR #693)マージ後、分裂していた4ディレクトリ(`amadeus`(2026-07-07 stale)/ `installer-distribution`(2026-07-08)/ `claude-leader`(2026-07-09)/ `claude-engineer-1`(2026-07-09))を本ディレクトリ `codekb/amadeus/` に一本化した
- **正の根拠**: スキャンの系譜は amadeus(7/7)→ installer-distribution(7/8、base 8510281ae)→ claude-leader(7/9、base aff3b6671)→ claude-engineer-1(7/9、base aff3b6671 の leader 版をベースに observed a1c79dc12)という差分リフレッシュの連鎖であり、最新の claude-engineer-1 版が累積 superset。本ディレクトリはその claude-engineer-1 版の git mv
- **包含チェック**: 4ディレクトリとも同一の9ファイル構成でファイル単位の欠落なし(削除分は git 履歴から復元可能)
- **以後**: `codekb-path` は #668 修正により安定名 `amadeus` を返す(このコミットで実測済み)ため、次回スキャンは本ディレクトリへの差分リフレッシュとなる

## source-unreferenced-check(intent 260710、履歴)で更新した成果物

packaging 入力集合と source-unreferenced ギャップに焦点を絞った diff-refresh。既存の bug 別ナラティブ節(#674〜#678/#668/#685/#670)は歴史的記録として温存し、上部に #735 の新規節を追記、#685(#729)/#670(#727)の解消済みバナーを各所に付す形で更新した。

- `architecture.md` — 「packaging 入力集合と source 側 unreferenced 検査」節を新設(build 入力の確定点・dist orphan scan の守備範囲・#735 のギャップ)。#685/#670 の解消済みバナーを追記。
- `code-structure.md` — 「packaging 構造(`scripts/package.ts` / harness manifests)」節を新設(`buildTree`/`checkHarness` の段構成、全 harness の `harnessFiles`/`authoredExempt` 目録)。#685/#670 解消済みバナー。
- `code-quality-assessment.md` — vacuous exemption アンチパターンと source-unreferenced ギャップを技術的負債として追記。#685/#670 解消済みバナー。
- `component-inventory.md` — `scripts/package.ts`/`scripts/manifest-types.ts`/harness manifests のコンポーネント表を追記。
- `api-documentation.md` — `scripts/package.ts`(write/`--check`)の CLI 契約を追記。#685/#670 解消済みバナー。
- `dependencies.md` — packaging 依存グラフ(core/harness → package.ts → dist の入力集合)と `fast-check` 依存追加を追記。
- `technology-stack.md` — `fast-check`(PBT、#722)、動的 test-size 計測(#732)、codecov 導入を追記。
- `business-overview.md` — 当該 intent の業務境界(source-unreferenced check)を追記。#685/#670 解消済みバナー。

## 前 intent(260709-gate-mechanics)で更新した成果物(履歴)

コード diff がないため全面リライトではなく、#685/#670 関連の新規節を追記する形の diff-refresh。

- `architecture.md` — 「#685」「#670」の相互作用図(シーケンス図)を新設。旧6バグの図は保持(#675 は解消済みと明記)。
- `code-structure.md` — gate resolution 系(`amadeus-state.ts`/`amadeus-lib.ts`)と `amadeus-worktree.ts` の該当関数表を追記。
- `component-inventory.md` — human-presence gate コンポーネント表・worktree ガードコンポーネント表を追記。
- `api-documentation.md` — `delegate-approval`/`reject` の現行契約と `amadeus-worktree create`/`bolt --worktree` の契約を追記。
- `code-quality-assessment.md` — #685・#670 のリスク評価節を追記、#675 を解消済みとして更新。
- `business-overview.md` — 当該 intent の業務境界(2バグ)を追記。
- `technology-stack.md`・`dependencies.md` — 変更なし(該当領域に新規依存・技術変更なし)、確認済みの旨のみ追記。

## Issue #857 差分スキャン（2026-07-23）

- Issue: [#857](https://github.com/amadeus-dlc/amadeus/issues/857)
- Base: `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`
- Observed: `abb5576d2fc162d69dd8ac8b87402e927609f279`
- Date: `2026-07-23`
- Focus: `handleDoctor` in-process seam and patch coverage

## 差分スキャン結果

`handleDoctor` は export 済みで、monkeypatch 型 in-process テスト6ファイル104ケースが成功し、LCOV 437/771行 hit を確認済みという入力事実を反映した。spawn 契約 t37/t83/t210 は41ケース成功、LCOV 1/771行 hit であり、spawn 盲点は継続する。本更新は既存 CodeKB を保持した差分追記で、対象9ファイルと `re-scans/260723-doctor-inprocess-seam.md` に限定した。
