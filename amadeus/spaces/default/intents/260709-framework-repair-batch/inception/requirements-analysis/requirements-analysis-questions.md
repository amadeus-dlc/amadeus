# Requirements Analysis — 明確化質問(framework-repair-batch)

> 回答方式: エージェント間選挙(ユーザー指示による逸脱)。各エンジニアが A-E/X で投票し、多数決で採用。割れた質問はユーザーへエスカレーション。

## Q1. #656 修理範囲 — Installation.detect の evidence gap

Issue #656 には2つの到達不能経路がある: (i) LegacyLayout 条件(b)(loose amadeus-* ファイルの evidence 欠落)、(ii)「manifest はあるが実ファイル欠落」の partial 経路(manifest 可読なら無条件 manifested)。修理範囲は?

- A. 両方修正する(evidence 収集に loose amadeus-* スキャンを追加 + manifest エントリのディスク実在検証を追加)
- B. (i)のみ修正(BR-U07 のハード拒否破綻が P0 の本体。(ii)は別 Issue に分離)
- C. (ii)のみ修正
- D. evidence 収集を全面再設計(アンカー中心 → ファイル台帳中心)
- E. 修正せず LegacyLayout 側の契約を実装に合わせて縮退させる
- X. Other (please specify)

[Answer]: A — 両ギャップとも installation.ts の scanEvidence/detect の同一契約破綻。分割すると同一コードを触る PR が2本になる(選挙結果: 5:1、ユーザー承認済み)

## Q2. #656 受け入れ基準 — BR-U07 の force 意味論

アンカーなしレガシーレイアウトが `unsupported-layout` と分類された場合の `--force` の挙動は?

- A. 無条件ハード拒否(BR-U07 どおり。--force でも upgrade 続行不可、明示エラーで終了)
- B. --force で警告付き続行を許す(BR-U07 を改定)
- C. --force に加えて追加フラグ(--force-unsupported 等)の二段構えで続行可
- X. Other (please specify)

[Answer]: A — BR-U07 は無条件ハード拒否。force 続行はユーザーファイル破壊リスクがあり「破壊的操作を暗黙デフォルトにしない」規範と整合(選挙結果: 全会一致)

## Q3. #657 修理方式 — センサーの tsc 解決

- A. Issue の案(a): センサーが repo ローカル `node_modules/.bin/tsc` を優先し、無い場合のみ bunx にフォールバック。t92 の期待値(exit 2)は維持
- B. 案(a) + t92 も exit 1/2 の両方を許容に緩和(将来の TS メジャー更新にも耐える)
- C. Issue の案(b)のみ: テスト期待値の緩和だけ(センサーは bunx のまま)
- D. typescript をフレームワーク配布物の runtime 依存に昇格して固定
- X. Other (please specify)

[Answer]: A — repo ローカル node_modules/.bin/tsc 優先、無ければ bunx フォールバック。t92 の exit 2 期待は維持(lockfile が TS 6.0.3 を固定する限り決定的。TS メジャー更新時に赤くなるのは望ましい可視化)(選挙結果: 全会一致)

## Q4. #641 修理方式 — hooks の project dir 解決

`resolveProjectDirFromHook()` の4段フォールバック(env → script-path 逆算 → cwd probe → cwd)が worktree セッションで全層 launch dir に収束する。修理方式は?

- A. cwd 優先に並べ替え: cwd(またはその祖先)に amadeus ワークスペースマーカー(amadeus/ + .claude/tools/ 等)があれば cwd を採用し、script-path 逆算より優先する
- B. CLAUDE_PROJECT_DIR が cwd と不一致の場合は cwd を信頼する(env の鮮度検証を追加)
- C. hooks 起動時にエンジンが解決済み project dir を引数/環境変数で明示注入する方式へ変更(フォールバック鎖自体を縮小)
- D. worktree 検出時のみ特別分岐(git worktree list 照合)
- X. Other (please specify)

[Answer]: A — cwd 祖先に amadeus ワークスペースマーカーがあれば cwd を script-path 逆算より優先する。C(エンジン注入)は hooks の起動者が Claude Code ハーネスでありエンジンが env 注入できないため実現性に難(選挙結果: 4:2、ユーザー承認済み)

## Q5. #661 注記の配置範囲

案1(逸脱の明文化)で確定済み。注記を入れる場所は?

- A. canonical の stage-protocol.md Glossary + delivery-planning.md + docs 対応ページ(EN/JA)+ glossary.md/glossary.ja.md — 全転記箇所を網羅
- B. stage-protocol.md Glossary のみ(canonical 1箇所、他は参照で辿れる)
- C. A + workflow-planning-guide.md(delivery agent knowledge)も含める
- X. Other (please specify)

[Answer]: C — canonical(stage-protocol.md Glossary)+ delivery-planning.md + docs EN/JA + glossary.md/ja + workflow-planning-guide.md(delivery agent knowledge)の全転記箇所へ注記を伝播(選挙結果: 5:1、ユーザー承認済み)

## Q6. Bolt 分割と PR 戦略

- A. 4バグ = 4 Bolt = 4 PR(team.md の Bolt 単位 PR 規範どおり)。相互独立なので全 Bolt を1並列バッチで実行
- B. 4 Bolt だが直列実行(並列バッチを使わない)
- C. 規模の近い #657+#661(小)を1 Bolt に束ね、#656/#641 は各1 Bolt(3 Bolt/3 PR)
- X. Other (please specify)

[Answer]: A — 4バグ = 4 Bolt = 4 PR(team.md の Bolt 単位 PR 規範)、相互独立なので並列バッチ実行(選挙結果: 全会一致)

## Q7. テスト態勢(bugfix スコープの回帰テスト下限)

- A. #656/#657/#641 は「落ちる実証」付き回帰テスト必須(修正前に赤・修正後に緑を実測)。#661 は docs のみ変更なので回帰テスト不要、既存スイートのグリーン維持のみ
- B. 4件すべてに回帰テスト必須(#661 も glossary 文言を検査するテストを新設)
- C. P0 の #656 のみ回帰テスト必須、他は既存スイートのグリーン維持のみ
- X. Other (please specify)

[Answer]: A — #656/#657/#641 は「落ちる実証」付き回帰テスト必須(修正前赤・修正後緑を実測)。#661 は docs のみのため glossary 文言 grep テストの新設は脆く検証劇場に近いため不要(選挙結果: 全会一致)
