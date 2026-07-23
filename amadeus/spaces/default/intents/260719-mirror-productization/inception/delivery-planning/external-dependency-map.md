# External Dependency Map — 260719-mirror-productization

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 外部依存

| 依存 | 種別 | 影響 Bolt | 状態 |
|---|---|---|---|
| gh CLI(GitHub) | optional runtime(G-1/ADR-7) | Bolt 1(U1 の gh 呼出面) | 開発環境に実在(RE で実測)。不在環境の loud エラー経路はテストで固定 |
| ユーザー承認(norm PR マージ) | プロセス(P-01/no-AI-merge) | Bolt 0 → Bolt 1 マージ前提 | 承認待ち管理は leader 台帳(merge-approval-latency) |
| ユーザー承認(Bolt 1 単独ゲート+ラダープロンプト) | プロセス(walking-skeleton) | Bolt 1→2 の間 | Bolt 1 出荷後に発火 |

## 非依存(明示)

- npm 新規パッケージ依存なし(Bun-only 維持 — 3層 config は自前 JSON パース)
- GitHub 以外の外部サービスなし(W-03)
