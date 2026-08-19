# Requirements Analysis Questions — Issue #2985

## 質問要否の判定

追加質問なし。Issue #2985の完了条件1〜7、独立クロスレビューA/B、Reverse Engineeringの再実行可能な証拠により、対象、成功経路、失敗経路、互換境界、検証条件が確定している。`amadeus/spaces/default/memory/project.md` の既定規則とmulti-Unit Boltの関係も、Issueで明示された同一 Delivery Boltのmember Unitsだけを狭い例外として扱うことで解消できる。

Decision record: Reverse Engineeringの候補A（Bolt identityが正規 `units[]` を所有し、1 PR evidenceを各 member Unit completionへ投影）を採用する。候補Bの「1 Unit = 1 Boltへ強制分解」は、Issueの2 Unit / 1 Bolt成功条件を消してしまうため採用しない。Issueと承認済み根拠にある決定を再質問しないという `cid:requirements-analysis:c5` に従う。

## 完全性確認

| 観点 | 判定 |
| --- | --- |
| Functional requirements | Bolt Unit集合、1 PR/head、provenance、attestation投影、completion、単一Unit回帰、full autonomyをFR-BPA-1〜9へ固定 |
| Non-functional requirements | fail-closed、決定性・冪等性、TDDと全品質ゲート、局所性をNFR-BPA-1〜4へ固定 |
| User scenarios | 2 Unit / 1 Boltの修正経路、2 Unit / 2 Boltの対照経路、tamper/replay/stale/partialの否定経路を確定 |
| Business context | P0/S1-FATALのworkflow停止を、監査保証を弱めず解消する価値へ限定 |
| Technical context | Bun/TypeScript、GitHub同一head制約、plugin CLI/sensor/state completion、source-only境界を確定 |
| Quality attributes | 187 passのbaseline、falling proof、対象/全suite、build・typecheck・lint・coverage・plugin e2eを確定 |

## 上流根拠

- [Issue #2985](https://github.com/amadeus-dlc/amadeus/issues/2985)
- [独立クロスレビューA](https://github.com/amadeus-dlc/amadeus/issues/2985#issuecomment-5284349564)
- [独立クロスレビューB](https://github.com/amadeus-dlc/amadeus/issues/2985#issuecomment-5284349894)
- `amadeus/spaces/default/codekb/amadeus/business-overview.md`
- `amadeus/spaces/default/codekb/amadeus/architecture.md`
- `amadeus/spaces/default/codekb/amadeus/code-structure.md`
- `amadeus/spaces/default/codekb/amadeus/re-scans/260813-bolt-pr-attestation.md`

## Open questions

なし。実装で identity不変条件を変更する必要が生じた場合のみ、新しい要件矛盾として再評価する。
