# CI/CD Pipeline — u001-engine-installer（260705-engine-installer）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[team-practices.md](../../../inception/practices-discovery/team-practices.md)

## 設計

新しい pipeline は作らない。既存 CI（GitHub Actions の `CI / mock` = `npm run test:all`）に、専用 eval を `test:it:installer` として組み込む（FR-2.4。追記型接触 = CON-8）。

| 変更 | 内容 |
|---|---|
| package.json | `test:it:all` の連鎖へ `test:it:installer` を追加、`amadeus:install` を追加（FR-1.11） |
| CI 設定 | 変更なし（test:all 経由で自動的に実行される） |

## 適用判断

デプロイ pipeline・リリース自動化は不適用とする（配布 = clone、リリースは BL-1 の将来判断）。
