# Requirements Analysis 質問（260705-github-kanban-sync）

上流入力: [intent-statement.md](../../ideation/intent-capture/intent-statement.md)、[scope-document.md](../../ideation/scope-definition/scope-document.md)

人間指示（Code Generation まで自動進行、decision-log D14）により、推奨案で自己回答する。

---

## Q1. flush（board への反映実行）の抑制ポリシーはどうしますか？

A. Stop / SessionEnd 時にキューが空でなければ実行し、直近 2 分以内に成功した sync があればスキップする（重複抑制のみの最小構成）
B. 変更検知のたびに即時 flush する（デバウンスなし）
C. 定期実行（cron 的）を併設する
X. Other (please specify)

[Answer]: A（推奨採用。C05（hook 内同期ネットワーク禁止）と C07（軽量実装）に整合。自己回答: D14）

## Q2. `issues` フィールドの遡及補完はどの範囲で行いますか？

A. 全 entry を対象に、Intent record（aidlc-state.md の Project 文、audit の Request 文）から判別できる Issue 番号を補完し、判別できない entry は付与しない（フィールド自体を省略 = 空扱い）
B. 進行中 Intent だけ補完する
C. 遡及補完しない（新規 Intent からのみ）
X. Other (please specify)

[Answer]: A（推奨採用。Done 列にも Issue リンクが付き、板の一覧性が過去分にも効く。判別不能は「未確認」扱いとして省略。自己回答: D14）
