# External Dependency Map — metrics 可視化(B1 後続)

上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

## 外部依存一覧

| 依存 | 種別 | 接触 | 備考 |
|---|---|---|---|
| GitHub Actions(metrics-snapshot job) | 実行基盤 | Bolt 2 でステップ追加(components.md C-1) | App token・bot PR 経路は不変(requirements.md FR-5) |
| Bun 1.3.13 | ランタイム | 変更なし | CI ピン留め済み。新規依存パッケージゼロ(team-practices.md) |
| Codecov | 非接触 | なし | C7(重複構築しない) |
| npm レジストリ / 外部 SaaS | 不使用 | なし | ネットワーク I/O ゼロ(services 境界) |
| ブラウザ | 閲覧環境 | file:// のみ | story-map「見る」ジャーニーの終端 |

## 依存起因のブロッカー想定

- なし(外部サービスの認証・レート制限・可用性に依存する工程が存在しない)。CI 面の失敗は job 赤として可視化され PR をブロックしない(ci-success 集約外)
