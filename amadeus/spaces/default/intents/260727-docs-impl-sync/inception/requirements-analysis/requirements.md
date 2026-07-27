# Requirements — docs-impl-sync

上流入力(consumes 全数): intent-statement.md, business-overview.md, architecture.md, code-structure.md

依拠箇所: 成功指標・対象範囲は intent-statement.md「Success Metrics」「Initial Scope Signal」から継承。乖離クラスタの全体像は codekb の architecture.md「docs が追随できていない構造変化」節・code-structure.md「docs ツリーと正本コードの対応関係」節(docs 197ファイル構造・患部対応表)・business-overview.md の EN/JA 情報格差 blockquote に依拠。裁定は requirements-analysis-questions.md(Q1-Q5、ユーザー承認 2026-07-27T07:18:10Z)。

測定 ref: HEAD `aabc0527d96344420cf8236967763b81ce82ac83`。本文中の個別 file:line・件数・ファイル列挙は、consumes 成果物からの転記ではなく**本ステージ起草時に repo を直接実測した転記**である(grep -n / sed -n / ls / git diff --name-only の出力転記 — cid:mechanism-cite-verify-at-draft 準拠。iteration 1 レビュー指摘を受け全引用を再実測済み、2026-07-27T07:30Z 台)。

## FR-1: ルート README の Kimi ハーネス反映(クラスタA)

`README.md` / `README.ja.md` を現行実装(ハーネス7: claude, codex, cursor, kimi, kiro, kiro-ide, opencode — `ls packages/framework/harness/` 実測)に一致させる。

- FR-1a: ハーネス表(README.md:78-83 / README.ja.md:78-83)に Kimi Code 行を追加する。行の内容(最低バージョン・起動コマンド・ガイドリンク)は `docs/guide/harnesses/README.md` の既存 Kimi 行と `docs/guide/harnesses/kimi-code.md` から転記する
- FR-1b: 「six coding-agent harnesses」(README.md:5)・「6つ」(README.ja.md:5)・「four → six」(README.md:67)等のハーネス件数記述を現行値に更新する。表記形(硬数値 vs count-free)の選択は functional-design で確定する(Q1 裁定は hook 件数の count-free 正準化 — ハーネス件数への類推適用は FD の判断事項として明示的に委譲)
- 受け入れ基準: `grep -ci kimi README.md` ≥ 1 かつ `grep -ci kimi README.ja.md` ≥ 1。ハーネス表の行数 = 7。「six coding-agent harnesses」「6つのコーディングエージェントハーネス」の残存 grep = 0。EN/JA を同一変更で同期

## FR-2: docs/guide/19-plugins{,.ja}.md の投影面記述の正値化(クラスタA)

実装の真実源は `scripts/plugin-projection.ts:41-49` PACKAGE_HARNESSES = 7、`:55` SELF_INSTALL_HARNESSES = 5(kimi 含む)。

- FR-2a: 「six packaged / four self-install」系の全記述(EN :14-15/:70/:131/:148/:150-156、JA :13/:67/:141/:143 — いずれも grep -nE "six|four" / "6 つ|4 つ" の直接実測。JA :48/:115 の「4 つのシーム」はシーム数で正、対象外)を 7/5 の現行値へ更新する(表記形の hard vs count-free は FD で FR-1b と同一方針にする)
- FR-2b: 面の明示列挙(EN :150-151 ほか)に `kimi` を追加する — 列挙欠落は「Kimi にはプラグインが投影されない」という誤読を誘発する実害クラスであり、件数更新だけでは閉じない
- 受け入れ基準: `grep -ci kimi docs/guide/19-plugins.md` ≥ 1(JA 同)。「six packaged」「closed four」等の陳腐化記述の残存 grep = 0。列挙は PACKAGE_HARNESSES / SELF_INSTALL_HARNESSES の実配列と一致(実装からの転記で検証)。EN/JA 同一変更

## FR-3: 12番目 hook 着地に伴う EN/JA 同期(クラスタC)

Q1 裁定 = A(count-free 正準)。散文中の hook 件数語は EN/JA とも全除去し、roster 表(docs/reference/06-hooks-and-tools.md の一覧)だけが列挙を持つ。

- FR-3a: EN `docs/reference/06-hooks-and-tools.md` の硬数値「twelve」(:5 ほか)を count-free 表現へ置換する(roster 表自体は列挙として維持し、`amadeus-plugin-compose.ts` 行を含む現行12行と一致させる)
- FR-3b: JA 4ファイルの「11個/11 個」残存を count-free 化する — `06-hooks-and-tools.ja.md`(:5/:13/:15/:50/:496 — grep -nE "11個|11 個" 直接実測)、`15-troubleshooting.ja.md`(:39 と :222 の2箇所 — 同実測。:39 の11フック列挙は plugin-compose を欠く)、`glossary.ja.md:45`、`01-architecture.ja.md:476`
- FR-3c: JA 側の hook 一覧・列挙を持つ5ファイル(`amadeus-files.ja.md` / `01-getting-started.ja.md` / `12-cli-commands.ja.md` / `15-troubleshooting.ja.md` / `06-hooks-and-tools.ja.md` — 現状 `grep -c plugin-compose` = 全て 0 の直接実測)へ `amadeus-plugin-compose.ts` を追加し、EN 側の対応節と整合させる
- FR-3d: 区間 `1673c4332..HEAD` で EN のみ変更・JA 未追随だった8ファイル(amadeus-files / guide/01-getting-started / guide/12-cli-commands / guide/15-troubleshooting / guide/glossary / reference/01-architecture / reference/06-hooks-and-tools / reference/11-contributing — `git diff --name-only 1673c4332..HEAD -- docs 'README*.md'` の出力から対訳ペア突き合わせで直接導出)の JA を EN 現行内容へ同期する
- 受け入れ基準: 対象 JA 4ファイルで `grep -cE '11個|11 個'` = 0。FR-3c の JA 5ファイルで `grep -c plugin-compose` ≥ 1。EN 06-hooks-and-tools.md で「twelve」の散文残存 0(roster 表は除外)。8ファイルの EN/JA 内容同期を対訳突き合わせで確認

## FR-4: 区間外の既存乖離の修正(Q4 = A)

- FR-4a: `docs/reference/01-architecture.md:60`「Eleven flat agent files」/ `.ja.md:60`「11個のフラットなエージェントファイル」(両方 sed -n '60p' の直接実測で現存確認)を現行実態(agent ファイル14 = domain 11 + reviewer 2 + composer 1 — `ls packages/framework/core/agents/ | wc -l` = 14 の直接実測)に一致させる。「11 domain-expert agents」という限定表現は正のため変更しない
- FR-4b: 全域照合(FR-6)で新たに検出された区間外乖離も同基準で修正対象に含める
- 受け入れ基準: 当該行が実ファイル数・内訳と一致。検出済み既存乖離の残存 0

## FR-5: 非対訳 guide 2件の対訳新規作成(Q2 = A)

- `docs/guide/team-messaging.md` → `docs/guide/team-messaging.ja.md`、`docs/guide/publishing-setup.md` → `docs/guide/publishing-setup.ja.md` を新規作成する。内容は EN と同期(翻訳時点の EN 現行内容を正とする)
- `docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md` は凍結研究記録として対象外(裁定済み)
- 受け入れ基準: 2ファイルが実在し、EN の H2 構成と一致する(節数照合)。孤児 JA 0 を維持

## FR-6: 全域二層照合と乖離目録(Q5 = A、intent-capture Q6 = A)

- FR-6a: README*.md + docs/ 全域(197+2ファイル)へ**機械照合**を実施する — 件数・ファイルパス・CLI コマンド名・識別子・ハーネス/hook/agent 列挙を実装の真実源(ls / grep / 実配列)と突き合わせる。照合キーは「変数名」と「展開後リテラル」の2キー(cid:application-design:dual-key-consumer-inventory 準拠)
- FR-6b: **精読照合**は (i) 区間 `1673c4332..HEAD` の変更が影響するホットスポット文書、(ii) 機械照合でヒットした文書、に限定する
- FR-6c: 照合結果を乖離目録(検出乖離の全件: 所在 file:line・実装側真実源・修正方針)として成果物化する。目録の件数は列挙からの機械再計算で書く(cid:ledger-count-mechanical-recalc)
- FR-6d: 検出乖離は本 intent 内で**全件修正**する(intent-capture Q3 = A)。修正不能・実装側の欠陥と判明したものは修正せず GitHub Issue に起票し、目録に Issue 番号を記録する
- 受け入れ基準: 乖離目録が成果物として実在。目録の全行が「修正済み(コミット参照)」または「Issue 起票済み(番号)」のいずれかで閉じている。残余(未処置)0

## FR-7: PR 編成と同期規律(Q3 = C)

- 起因別 2 PR とする: PR-1 = Kimi 起因(FR-1 + FR-2)、PR-2 = hook 起因+既存乖離+対訳新規(FR-3 + FR-4 + FR-5 + FR-6 残余)。FR-6 の検出量が過大な場合の追加分割は delivery 判断として leader(ソロでは conductor)がユーザーへ諮る
- すべての PR で EN/JA を同一変更で同期する(project.md ALWAYS)。コミットメッセージは英語、PR タイトル・本文は日本語
- 受け入れ基準: 各 PR の diff に EN のみ・JA のみの片側変更が存在しない(対訳ペア突き合わせ)

## NFR

- NFR-1: 既存 CI ゲート green — `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci`(t174 docs-legacy-refs ゲート含む)。docs のみの変更で dist/self-install は触れないため dist:check / promote:self:check は現状維持 green
- NFR-2: 実装コード(packages/、scripts/、.claude/tools 等)の変更ゼロ。docs 作業中に発見した実装バグ・実装と設計の矛盾は修正せず Issue 起票(cid:bughunt-file-only 準拠)。起票前に closed 含む既存 Issue 検索(cid:pre-filing-dup-and-branch-check)
- NFR-3: 修正で書き込む数値・パス・識別子はすべてコマンド出力からの転記のみ(cid:numbers-from-command-output-only)。file:line 引用は書く直前に実測確認(cid:mechanism-cite-verify-at-draft)
- NFR-4: テスト戦略 Minimal — 新規テストの下限なし。既存テストスイート green 維持のみ(スコープ既定)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-27T07:25:07Z
- **Iteration:** 1
- **Scope decision:** none

裁定転記・テスト可能性は良好だが、consumes 契約外依拠疑義と行番号不一致の是正が必要

### Findings

- [Major] FR-2a, FR-3c, FR-3d, FR-4a: 具体的ファイル名・行番号が宣言 consumes の3 codekb 成果物に見当たらず、契約外ソース依拠の疑い — code-structure.md 患部対応表に JA 行番号・JA roster パス・agent 14 内訳が不在。code-quality-assessment.md:27 / reverse-engineering-timestamp.md:15 にのみ実在
- [Minor] FR-2a: EN 側行引用 :152-156 が codekb 記録 :150-156 と不一致 — code-structure.md 患部対応表の値は :150-156

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-27T07:29:42Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1のMajor/Minorはrepo実測で裏取り済みの是正により解消し、Q1-Q5裁定の転記とテスト可能性も維持されているためREADY。

### Findings

- None
