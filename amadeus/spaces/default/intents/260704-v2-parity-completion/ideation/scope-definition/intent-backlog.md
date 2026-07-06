# Intent Backlog：260704-v2-parity-completion

スコープバックログは「今回やらないもの」と将来候補の受け皿である。
項目は proto-Unit であり、将来 Intent の予約席ではない。
後続の Units Generation で Unit 候補として評価するか、Intake の合流判定の照合先として使う。

## バックログ

| # | 項目 | 優先度 | 依存 | 備考 |
|---|---|---|---|---|
| 1 | 上流 agents、rules、scopes、knowledge ディレクトリのコピー範囲の精査（skill と tools の動作に必要な分は本体スコープ、それ以外の採否はここで判断） | Should | エンジン縦切りの動作確認 | feasibility の Open questions 由来 |
| 2 | 上流 `aidlc-session-cost`、`aidlc-replay`、`aidlc-outcomes-pack` の動作検証と運用手順の整備（コピー自体は本体スコープ、深い検証はここ） | Should | skill 一覧の置換完了 | 対応漏れ 15 skill のうち utility 3 個 |
| 3 | real provider e2e の運用規約化（Issue #396 論点 7。CI は mock のみ、real 実行のタイミング規約） | Could | examples 再生成 | 旧 Intent の Open questions 由来 |
| 4 | codekb の鮮度運用（Issue #396 論点 6。2.1 再実行タイミングと reverse-engineering-timestamp.md の運用） | Could | エンジン導入（上流は timestamp で stale 判定） | 上流機構の採用で自然解消の可能性がある |
| 5 | 完了済み 2 record の旧形式に対する validator の扱いの恒久方針（旧形式許容の期限、または検査対象外の明文化） | Could | validator 新契約追従 | GD006 の帰結 |
| 6 | 上流追従の定期運用（基準 commit 更新の周期、差分レビュー手順の定型化） | Could | パリティ検査機械化 | C003 の運用面 |
| 7 | 旧 `docs/amadeus/` 契約文書群の新アーキテクチャへの全面改稿（本体スコープでは規範改定と矛盾解消に留める） | Should | A 柱完了 | lifecycle 文書と stage catalog の再編を含む |
