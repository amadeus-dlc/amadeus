# Risk and Sequencing Rationale — 260706-journal-logger

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work.md](../units-generation/unit-of-work.md)（u001-journal-logger、規模 M、依存なし = [unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)）、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[team-practices.md](../practices-discovery/team-practices.md)。

## 順序の根拠

FR-1 → FR-2 → FR-4 → FR-3 → FR-5 の直列順は内容依存（FR-1 = 形式の正が FR-2 の検査対象と FR-4 の移行形式を確定、FR-4 の実データが FR-2 の eval fixture を兼ねられる、FR-3 は契約とアンカー形式を参照）で固定。WSJF 的な経済順序付けは単一 Bolt のため適用対象がない。

## リスクと手当て

| リスク | 手当て |
|---|---|
| validator eval の fixture 手書き合わせ（#458 型の見逃し） | FR-4 の実移行データを fixture の実体に使う（エンジン実出力形 = 実ファイルの原則。Testing Posture） |
| main の並行 merge との交差 | 非接触確定済み（engineer3）。PR 前に origin/main 追従 + union 準備（恒常運用ルール） |
| spawn 手順の机上誤り | 手順書作成時に spawn.sh の引数・動作を実測確認（raid A-1）。実行はしない（実 spawn は人間操作 = C-1） |
| 反復上限後の修正の第三者確認漏れ | units-generation で発生 → gate 開示で解消した前例に従い、以後も開示を既定とする |
