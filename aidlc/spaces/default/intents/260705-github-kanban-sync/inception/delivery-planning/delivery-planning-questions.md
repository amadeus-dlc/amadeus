# Delivery Planning 質問（260705-github-kanban-sync）

上流入力: [unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)、[components.md](../application-design/components.md)

人間指示（Code Generation まで自動進行、decision-log D14）により、推奨案で自己回答する。

---

## Q1. Bolt の順序付けヒューリスティックはどれにしますか？

A. dependency-first（U001 → U002 → U003 の直線依存に従う。WSJF 等のスコアリングは使わない）
B. risk-first（GraphQL 連携の U002 を先行）
C. value-first
X. Other (please specify)

[Answer]: A（推奨採用。依存が直線で分岐がなく、経済的順序判断の余地がない。自己回答: D14）

## Q2. Bolt の粒度はどうしますか？

A. 1 Unit = 1 Bolt（3 Bolt、各 1 PR）
B. U001 と U002 を 1 Bolt に束ねる
X. Other (please specify)

[Answer]: A（推奨採用。units-generation の 1 Unit = 1 Bolt = 1 PR と一致。自己回答: D14）

## Q3. Bolt の並行実行を許しますか？

A. 許さない（厳密に直列。同一 worktree 直列化ポリシーと一致）
B. 許す
X. Other (please specify)

[Answer]: A（推奨採用。直線依存のため並行の余地がない。自己回答: D14）

## Q4. walking skeleton はどの Bolt にしますか？

A. B002（U002 kanban-sync-cli）。ローカルスキャン → GraphQL → board 表示の全層を貫く最小 end-to-end スライスであるため。B001（U001）はデータ前提の整備でありアーキテクチャ層を貫かない
B. B001（最初の Bolt を機械的に skeleton とする）
X. Other (please specify)

[Answer]: A（推奨採用。topological 順との乖離は risk-and-sequencing-rationale.md に記録。自己回答: D14）
