# Environment Provisioning — Memory

## Upstream References

- U8 `deployment-architecture.md` / `infrastructure-services.md`: 環境とサービス境界
- `cd-config.md`: protected `npm-publish` environment 定義

## Interpretations

- 2026-07-07T15:12:00Z — AWS IaC プロビジョニングは不要と判断。GitHub Environments + npm registry が「環境」に相当。

## Deviations

- 2026-07-07T15:12:00Z — Step 4 の AWS provision/validate はスキップし、workflow 構造検証 + local test pass を validation-report に記録。

## Tradeoffs

- 2026-07-07T15:12:00Z — E3（npm-publish）は手動設定必須のまま Pending と明記。初回 publish 前に maintainer が完了させる。

## Open questions

- E3 手動プロビジョニング完了後、初回 dry-run dispatch を誰が実行するか（deployment-execution ステージで扱う）
