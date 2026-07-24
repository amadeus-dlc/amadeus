# Intent Capture Questions — 260724-harness-provenance

上流入力(consumes 全数): なし(intent-capture は consumes を宣言しないステージ)

本 intent は leader からのディスパッチ(2026-07-24T10:55:30Z)と GitHub Issue #1452(https://github.com/amadeus-dlc/amadeus/issues/1452、ユーザー指示で対応)により主要な論点が事前に確定している。cid:intent-capture:c1(事前整理済み intent では未決の判断のみに質問を絞る)に従い、確定済み事項は回答済みとして記録し、真に未決の設計判断のみを inception 側のステージへ持ち越す。

**選挙不要判定(cid:requirements-analysis:no-election-judgment-gate)**: Q1-Q4 はいずれも Issue #1452 本文および leader ディスパッチ文面からの直接導出のみで、新規の価値判断・トレードオフ選択を含まない。選挙不要と判断し、leader へ申告のうえ承認を得た。承認: leader が承認しました(2026-07-24T10:58:48Z)。

## Q1. どのビジネス課題を解決するか?

[Answer]: A

- A. AI ハーネス(Claude Code / Codex / Cursor 等)がどのステージ・どのコミットを実行したかが記録に残らず、事後調査(#1449、#1450 の原因調査)で「このコードはどのハーネスが書いたのか」を特定できない
- B. (他の課題)
- X. Other

根拠: Issue #1452 本文「背景」節。2026-07-24 の team-up.sh 起動遅延(#1449)・amadeus-election.ts --project デフォルト解決バグ(#1450)の原因調査中に発生した実際の疑問。

## Q2. 顧客(内部/外部)は誰か? どんな痛みを抱えているか?

[Answer]: A

- A. 内部顧客(Amadeus 開発チーム自身)。障害調査・§13 学習の原因帰属・複数ハーネス混在運用時のトレーサビリティで、実行主体が分からず調査コストが増える
- B. (他の顧客)
- X. Other

## Q3. 成功とは何か? どの指標が重要か?

[Answer]: A

- A. 新規 intent のステージ実行(または新規コミット)から、実行ハーネス種別が機械的に参照可能な構造化フィールドとして読み取れること。既存 intent への遡及復元は非対象(Issue 明記)
- B. (他の指標)
- X. Other

## Q4. このイニシアチブのトリガーは何か(市場圧力・技術負債・規制・機会)?

[Answer]: A

- A. 技術負債/運用ギャップ — team.md の学習記録に「Codex native subagent」等の記述が断片的に残ることはあるが、機械的に参照可能な構造化フィールドが存在しない。実行ハーネスが多様化(claude-code / codex / cursor / opencode / kiro)した現状で、記録の欠落が調査コストとして顕在化した
- B. (他のトリガー)
- X. Other

## 後続ステージへ持ち越す未決の設計判断(要件定義以降で扱う)

- 記録先: `amadeus-state.md` 冒頭 vs 各ステージ `memory.md` フロントマター相当 vs 両方
- 検出方法: `$CLAUDE_CODE_*` 等の環境変数からの自動検出の実装可否・各ハーネスでの実在確認(harness ごとに何が読めるかは feasibility/requirements で実測する)
- 記録経路: 監査シャードイベント(audit/*.md)への付記を追加で行うか
- スコープ外(Issue 明記): 過去 intent への遡及復元、git commit author の書き換え
