# Logical Components — `semi-policy-carrier` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 処理シーケンス・データフロー・digest 設計の依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在(questions ヘッダの負方向解決を参照)。

本 Unit の論理コンポーネントは 3 つ+障害ドメイン 1 つ+共有資源 2 つで全数である(questions D4)。

---

## コンポーネント台帳

| # | コンポーネント | 所在(編集正本) | 責務 | 障害ドメイン |
| --- | --- | --- | --- | --- |
| LC-1 | C10 CLI ガード | `packages/framework/core/tools/amadeus-bolt.ts`(`handleSetAutonomy`) | mode none ∧ policies-file の loud 化(ファイル読取より先)。既存 `readDecisionPolicyInputs` へ委譲 | engine プロセス内・CLI 入口 |
| LC-2 | C8 書き側+C9 digest | `amadeus-intent-autonomy.ts`(`planHumanAutonomyCommand` / command 型)/ `amadeus-intent-autonomy-production.ts`(`prepareNonFullCommand` / `nonFullCommandDisplayDigest` 1 定義化) | `set-mode`/`revoke-full` への policies 搭載、`after.semiPolicies` 設定、方針込み digest 生成と Q1 等値照合 | engine プロセス内・コマンド計画層 |
| LC-3 | C15 表示供給式 | `amadeus-utility.ts`(`IntentAutonomyStatusEnvelope.policyCount` + `:345` 表示行) | grant 非依存の policy 数表示(`grant?.policies.length ?? semiPoliciesOf(projection).length` — 総関数経由・直読禁止) | engine プロセス内・表示層 |

## 障害ドメインと blast radius

- **障害ドメイン**: engine プロセス 1 つ(単発 CLI 実行)。
- **blast radius**(機構別に層別): **LC-1 欠陥**の最大影響は不正組み合わせの通過だが、下流 `prepareNonFullCommand` は policies を受けても mode none では `after.semiPolicies` を設定しない(C8 表 — 第 2 の防衛)。**LC-2 欠陥**は digest 照合の偽陰性(すり替え通過)が最悪だが、方針が効くのは semi の梯子 0 段目のみで、節目の人間裁定(FR-LAD-5 — core Unit の判定表)は方針で迂回できない。**LC-3 欠陥**は表示数の誤りに閉じ、認可へ波及しない。
- **隔離戦略**: digest・書き側規則は純関数部として t443(unit)で in-process 駆動。実 FS・CLI spawn を跨ぐ検証は t444(integration)のみ(`cid:code-generation:fs-tests-integration-first`)。

## 共有資源

| 資源 | 共有相手 | 競合の扱い |
| --- | --- | --- |
| autonomy projection(`semiPolicies` フィールド) | 読み手 `semiPoliciesOf` は `semi-authorization-core` 所有 | 書き手(本 Unit)⇔ 読み手(core)の対称は unit 分割で明示(書=carrier / 読=core)。片方向不変条件(core 所有)が不正状態を拒否 |
| 監査 journal | 全 autonomy 経路 | コマンド記録は既存 `applyProductionAutonomyMode` 経路の単一所有。本 Unit は新しい書き手を追加しない(replay 復元可能性 = NFR-2 の検収面) |

## インフラ非該当の明記

circuit breaker / cache / pooling / scaling / failover は**すべて非適用**(1 行理由): 単発 CLI の設定適用+表示経路であり常駐負荷が存在しない(`cid:nfr-design:c1`、questions D2)。信頼性は loud ガード・digest 照合・既存エラー様式再利用の決定的機構で担保する。

## 適用 NFR との対応(検証手段付き)

- **NFR-1**(FR-POL-3 の面): security-design.md P3 の落ちる実証(t444)。
- **NFR-2**(replay 復元の面): t444 の replay 等値 assert(拡張 `set-mode` の復元)。
- **NFR-4**: t443(unit)・t444(integration)を Red 先行で追加。
- **NFR-5**: 編集正本 4 ファイル(LC 台帳の所在列)のみ、`bun run build` 後の追跡ファイル不変。
- **NFR-7**: PR CI ブロッキング集合の全通過。
- **NFR-3 / NFR-6**: 非適用(security-design.md の分類表 — 所有 Unit・所有経路が異なる)。
