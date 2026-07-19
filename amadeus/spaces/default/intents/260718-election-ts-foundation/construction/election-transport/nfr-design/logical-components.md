# Logical Components — election-transport(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## モジュール構成

| コンポーネント | 責務 | 公開 API(狭い面のみ) |
|---|---|---|
| `scripts/amadeus-election-transport.ts` | U4 全体(輸送抽象+2実装)— 配置の典拠は unit-of-work.md U4 行+ADR-1(U-01=B 裁定) | 型: VoterTransport/DeliveryOutcome/DeliveryRecord/DeliveryDirective/ShortNotification/TransportError(domain-entities.md 宣言列)。関数: AgmsgTransport/SubagentTransport の notify(port 実装) |
| 内部(非公開) | DeliveryRecord の module 内部ファクトリ(外部構築不能 — BR-T2)・spawn ラッパ | なし(テストは port 注入+integration 層) |

- スタイルは functional-domain-modeling-ts 既決(project.md Code Style): DeliveryOutcome/TransportError は判別ユニオン、DeliveryRecord はスマートコンストラクタ(内部ファクトリ)— 型で正しさを運ぶ箇所のみ包む
- 依存方向: U4 → U1 のみ(unit-of-work-dependency.md:25 — depends_on: [election-model]。:12 の ShortNotification/DeliveryRecord 型依存)。U5 が U4 を配線(:27)

## NFR 横断の設計制約

- 保証の層別: **型構造**が blind 性(security-requirements.md)と record 外部構築不能(reliability-requirements.md)を担い、**実行様式**(spawnSync 配列引数・逐次)が性能前提(performance-requirements.md)とステートレス(scalability-requirements.md)を担う。追加モジュール不要(tech-stack-decisions.md と一体)

## テスト配置

- fake port 注入は unit 層(fs/spawn 非依存)、実 send.sh spawn は integration 層(fs-tests-integration-first の spawn 系への類推適用 — nfr-requirements で注記済み)
