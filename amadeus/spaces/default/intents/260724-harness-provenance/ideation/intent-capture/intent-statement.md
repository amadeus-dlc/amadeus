# Intent Statement — 260724-harness-provenance

上流入力(consumes 全数): なし(intent-capture は consumes を宣言しないステージ)

## Problem Statement

Amadeus のステージ実行・コミットは、複数の AI ハーネス(Claude Code / Codex / Cursor / OpenCode / Kiro 等)のいずれからでも行われうるが、どのハーネスが実際にそのステージ・そのコミットを実行したかを示す記録が構造的に存在しない。git commit の author は常に人間の git identity(例: `Junichi Kato <j5ik2o@gmail.com>`)であり、AI ハーネス種別は commit メタデータに残らない。`amadeus-state.md` にも各ステージの `memory.md` にも専用フィールドがなく、team.md の学習記録に断片的な言及が残る場合があっても機械的に参照可能な構造化フィールドではない。

この欠落は、2026-07-24 の team-up.sh 起動遅延(Issue #1449)・amadeus-election.ts の `--project` デフォルト解決バグ(Issue #1450)の原因調査中に、ユーザーから「このコードは Claude Code が書いたのか Codex が書いたのか」を問われた際に顕在化した。

## Target Customer

内部顧客(Amadeus 開発チーム自身、および複数ハーネスを併用する個々のエンジニア)。障害調査・§13 学習の原因帰属・複数ハーネス混在運用時のトレーサビリティにおいて、実行主体のハーネス種別が分からないことが調査コストの増加として現れる。

## Success Metrics

- 新規 intent のステージ実行(または新規コミット)から、実行ハーネス種別が `amadeus-state.md` 冒頭または各ステージ `memory.md` 相当の箇所から機械的に(grep/parse で)参照可能になる
- 可能な限り環境変数等からの自動検出で埋まり、手動記入が最終手段に留まる
- 既存 intent への遡及復元は非対象(実現不可能・スコープ外として明示)

## Initiative Trigger

技術負債/運用ギャップ。実行ハーネスが claude-code / codex / cursor / opencode / kiro と多様化した現状で、原因調査中に記録の欠落がボトルネックとして表面化した(#1449・#1450 調査時の実際の障害)。

## Initial Scope Signal

**feature**(project.md § Scope Overrides の scope-definition:default-scope-amadeus に従い、Amadeus 自体の新機能として `amadeus-feature` スコープを明示)。既存の記録スキーマ(`amadeus-state.md`、stage `memory.md`)への非破壊的な拡張であり、既存 intent への遡及適用は行わない。
