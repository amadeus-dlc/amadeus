# External Dependency Map — 260807-merged-pr-convergence

上流入力(consumes 全数): `requirements`(Assumptions・NFR-3 配布境界)、`components`(外部境界を持つ変更面の確認)、`unit-of-work`(単一 Unit の外延)、`unit-of-work-dependency`(Unit 間依存なし = 外部依存が Bolt 間調整を生まないことの根拠)、`unit-of-work-story-map`(スライス6の docs 面が外部依存を増やさないことの確認)。姉妹成果物 `bolt-plan` / `team-allocation` / `risk-and-sequencing-rationale` も相互参照。

## 外部依存

| 依存 | 種別 | Bolt への影響 |
|---|---|---|
| GitHub GraphQL(gh 経由) | 実行時観測 | テストは scripted GhSpawn fixture で分離 — CI/ローカル実行に live GitHub 不要。実機確認は PR 発行後の実マージ済み PR で1回実施(landed 経路の実測) |
| Bun / TypeScript / Biome | ツールチェーン | 既存(新規依存追加ゼロ) |
| `bun run build` 投影 | 配布 | canonical 編集 → dist + opt-in self-install 再生成(NFR-3) |

## ブロッキング依存

なし。人間依存は PR マージ承認のみ(no-AI-merge — Intent Autonomy full の範囲外)。
