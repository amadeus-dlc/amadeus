# Deployment Architecture — publish-readiness

> ステージ: infrastructure-design (3.4) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../nfr-design/security-design.md`(SEC-P02/P03)、CON-004、`../functional-design/business-logic-model.md`(手順書)

## 配布トポロジー(publish 時のみ)

```mermaid
flowchart LR
  DEV[メンテナのローカル環境<br/>npm login 済み+2FA] -->|npm publish 手動| REG[registry.npmjs.org<br/>@amadeus-dlc/setup]
  REG -->|bunx/npx| USERS[利用者環境]
  GH[GitHub vX.Y.Z タグ] -->|codeload| USERS
```

<!-- text fallback: メンテナのローカル環境(npm login+2FA)から手動 publish で registry.npmjs.org に @amadeus-dlc/setup を公開する。利用者は bunx/npx でレジストリから CLI を取得し、フレームワーク本体は GitHub の vX.Y.Z タグから codeload 経由で取得する(2経路構成)。 -->

- CI からの publish 経路は存在しない(CON-004 — シークレットを CI に置かない構造的帰結)
