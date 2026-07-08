# Business Rules — docs-rollout

> ステージ: functional-design (3.1) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../../../inception/requirements-analysis/requirements.md`(FR-014、CON-006)、project.md Mandated、t68

| ID | ルール |
|----|--------|
| BR-D01 | README の導入主経路はワンライナー。手動 `cp -r` を主経路として残さない(FR-014、成功指標2) |
| BR-D02 | バンプ・CHANGELOG 見出し・バッジは同一コミット(project.md Mandated、t68 が強制) |
| BR-D03 | root package.json の I1/I2 是正はこの PR に同乗(U4 移管。公開前必須) |
| BR-D04 | 新規の検証コードを書かない — t68 と grep 確認で足りる(再利用棚卸し、検証劇場回避) |
| BR-D05 | マージ後に CHANGELOG 見出しと一致する `vX.Y.Z` タグを発行(team.md 新規約 — U4 手順書の前提を満たす) |
