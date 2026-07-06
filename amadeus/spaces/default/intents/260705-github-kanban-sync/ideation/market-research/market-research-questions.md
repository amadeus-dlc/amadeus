# Market Research 質問（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

本 Intent は内部開発ツール（Maintainer 専用の kanban ミラー）であり、外部市場ポジショニングは持たない。
そのため本ステージの調査は、既存代替（GitHub 純正機能、gh 拡張、OSS、SaaS）との比較と build-vs-buy 判断に絞る。

---

## Q1. 既存代替の調査範囲はどこまでにしますか？

A. GitHub 純正機能だけ（Projects v2 built-in workflows、auto-add、Actions 連携）
B. A + gh CLI 拡張と OSS の Projects 同期ツール
C. B + 外部 SaaS カンバン（ZenHub、Linear 連携など）まで含める
X. Other (please specify)

[Answer]: B

## Q2. 外部 SaaS の採用（buy）は候補に入れますか？

Intent record の状態（作業内容、担当、worktree パス）を外部サービスへ送信することになる。

A. 候補に入れない。GitHub（既にコードがある場所）以外へ状態を送らない
B. 無料枠があり読み取り専用の連携なら候補に入れてよい
C. 制約なく比較してよい
X. Other (please specify)

[Answer]: A

## Q3. sync 実装の依存はどこまで許容しますか？

A. gh CLI（`gh api graphql`）だけで完結させる。npm 依存を増やさない
B. 必要なら軽量な npm ライブラリ（GraphQL クライアントなど）を dev 依存に追加してよい
C. 実装時に判断する（Inception へ持ち越す）
X. Other (please specify)

[Answer]: A

## Q4. この kanban の table-stakes（最低限の必須機能）はどれですか？（select all that apply）

A. Intent ごとのカードと列（phase / 承認待ち / 完了）表示
B. カードのフィールド表示（担当エージェント、ホスト、worktree、scope、紐付く Issue）
C. 紐付く Issue / PR へのリンク
D. 最終更新時刻（鏡の鮮度）の表示
X. Other (please specify)

[Answer]: A, B, C, D
