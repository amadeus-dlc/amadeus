# Units Generation Questions

## 質問結果

新規質問は0件。Unit 境界、並行化、共有 entrypoint の所有、PR 分離、TDD、デプロイ形態は、ユーザー指示と承認済み [`decisions.md`](../application-design/decisions.md) ADR-3 で確定済みである。

## 分解計画

- 2 Unit。U1=#2833、U2=#2834のend-to-end vertical sliceで、同一swarm batchにより並行実装する。P1のU1をwalking-skeletonとして先にgateし、U2の承認を先行させない。これは2026-08-10の最終ユーザー裁定「並行実装＋#2833先行ゲート」を反映する。
- 全 Unit は既存 Bun CLI に埋め込まれるため、独立デプロイや新規 infrastructure は持たない。
- 各 Unit を1 Bolt・1 PRに対応させ、複数 Unit を同一 PR に束ねない。
- intent autonomy `full` により、既決事項だけからなる本計画は自動承認対象とする。
