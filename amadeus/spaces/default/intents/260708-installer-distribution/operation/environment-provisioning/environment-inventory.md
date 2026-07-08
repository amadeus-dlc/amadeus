# Environment Inventory — installer-distribution

> ステージ: environment-provisioning (4.2) / 作成: 2026-07-09
> 出典: infrastructure-design 各ユニットの `deployment-architecture.md`(2ホスト構成・所有インフラゼロ)・`infrastructure-services.md`

## 環境一覧(外部 SaaS のみ・プロビジョニング対象ゼロ)

| 環境/ホスト | 役割 | 前提・アクセス | 状態 |
|-------------|------|----------------|------|
| npm レジストリ(registry.npmjs.org) | `@amadeus-dlc/setup` の公開先 | npm org `amadeus-dlc` スコープ(R1 — 公開前の人間タスク)、メンテナの 2FA(SEC-P02) | 外部 SaaS — 検証は publish 時(手順書章1) |
| GitHub(github.com / codeload / api.github.com) | ソース・vX.Y.Z タグ・アーカイブ配布・CI 実行 | 認証なし REST で到達可能(ADR-003 — feasibility で実測済み) | 稼働中(PR #648〜#654 の CI 実証) |
| 利用者ローカル | インストーラ実行環境 | Node ≥18.3 または bun(README/手順書に明記) | 利用者管理(E2E で両ランタイム検証済み) |

## IaC・シークレット

- IaC なし(作るものがない)。シークレットは npm アカウント認証のみ — リポジトリ・CI には一切置かない(CI publish 経路なし = CON-004)
