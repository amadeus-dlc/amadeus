# Logical Components — `semi-authorization-core` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 3 層置換の全体像・結線 3 点・データフロー表の依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在(questions ヘッダの負方向解決を参照)。

本 Unit の論理コンポーネントは 4 つ+障害ドメイン 1 つで全数である(questions D4)。

---

## コンポーネント台帳

| # | コンポーネント | 所在(編集正本) | 責務 | 障害ドメイン |
| --- | --- | --- | --- | --- |
| LC-1 | C1/C2 純関数層(`SemiAuthority` / `decisionAuthorityOf` / `semiPoliciesOf`) | `packages/framework/core/tools/amadeus-intent-autonomy.ts` | 認可基体の生成(スマートコンストラクタ `of` — 不成立は null)・3 責務の実施・梯子入口への射影。判別ユニオン+コンパニオンの functional-domain-modeling-ts 様式 | engine プロセス内(純粋計算) |
| LC-2 | 第1関門(`authorizeInteraction` 改訂) | 同ファイル | semi の question / 非 phase 境界 stage-gate を `semi-authority` として認可。節目は `SCOPE_OUT`、scope 未供給は fail-closed | 同上 |
| LC-3 | 第2関門+梯子(`decide` / `selectDecision` / `resolveAutoDecision` 入口) | `amadeus-intent-autonomy-runtime.ts` | 認可済み occurrence の振り分け(question → 梯子 5 段 / gate → gate 裁定)。入口は単一述語 `authority === null` | 同上 |
| LC-4 | 効果適用+読み側(`applySemiDecision` / `createGateAutoDecision` / 片方向不変条件+replay) | `amadeus-intent-autonomy-runtime.ts` / `amadeus-intent-autonomy-production.ts` / `amadeus-intent-autonomy-replay.ts` | workflow-reversible のみ効果適用、`AUTO_DECIDED` 記録、不正 projection の fail-closed 拒否 | engine プロセス内+監査 journal(共有資源) |

## 障害ドメインと blast radius

- **障害ドメイン**: engine プロセス 1 つ(単発 CLI 実行)。純関数層(LC-1/LC-2)は I/O を持たず、journal 書込は LC-4 の既存コミット経路のみ。
- **blast radius**: 最悪ケースは「認可判定の誤り」だが、方向別に非対称な防衛がある — **誤拒否側**は human-required への縮退(人間が裁定すれば前進可能、安全)。**誤認可側**は 3 重の独立防衛(A2 節目除外の閉じた列挙 / A3 効果安全弁+throw ガード不変 / A4 不変条件+replay 拒否 — security-design.md)を同時に破らない限り不可逆効果へ到達しない(defense in depth)。
- **隔離戦略**: 判定はすべて export 純関数で in-process テスト駆動(t451/t452)。実 FS(journal)を跨ぐのは t453(integration)のみ(`cid:code-generation:fs-tests-integration-first`)。

## 共有資源

| 資源 | 共有相手 | 競合の扱い |
| --- | --- | --- |
| 監査 journal | 全 autonomy 経路・mirror・engine | イベント列(`AUTO_DECIDED` + `WORKFLOW_EFFECT_APPLIED`)と書式は無改変(NFR-2)。書込は既存コミット経路の単一所有を維持し、本 Unit は新しい書き手を追加しない |
| `AutonomyProjection` 型 | replay・production・hooks・他 Unit | `semiPolicies?` フィールド宣言と総関数 `semiPoliciesOf`(不在 → `[]`)は本 Unit 所有。書き手は `semi-policy-carrier` 所有で本 Unit の diff に現れない(方針ゼロ縮退が正規状態) |
| `DecisionAuthorization` 判別ユニオン | 第1↔第2関門 | `semi-mode-gate` を削除し `semi-authority` へ**置換**(ADR-1 — 併存させない。旧値の残存は typecheck が検出) |

## インフラ非該当の明記

circuit breaker / cache / pooling / scaling / failover は**すべて非適用**(1 行理由): 純関数層+単発 CLI 判定経路であり常駐負荷・外部依存が存在しない(`cid:nfr-design:c1`、questions D2)。信頼性は fail-closed 判定表・throw ガード不変・不変条件+replay の決定的機構で担保する。

## 適用 NFR との対応(検証手段付き)

- **NFR-1**(FR-AUTH-1 の面): security-design.md A4 の落ちる実証(t452 — 不変条件除去で赤)。
- **NFR-2**: t453 の replay 等値 assert+SHA256 形検査+イベント列無改変の diff 照合。
- **NFR-4**: t451/t452(unit)・t453(integration)を Red 先行で追加。
- **NFR-5**: 編集正本は autonomy 系 4 ファイル(LC 台帳の所在列)のみ、`bun run build` 後の追跡ファイル不変。
- **NFR-7**: PR CI ブロッキング集合の全通過。
- **NFR-3 / NFR-6**: 非適用(security-design.md の分類表 — 所有 Unit が異なる)。
