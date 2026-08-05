# Logical Components — `advisory-auto-resolution` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 処理シーケンス・データフロー・ロック直列性の依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在(questions ヘッダの負方向解決を参照)。

本 Unit の論理コンポーネントは 3 つ+障害ドメイン 1 つ+共有資源 2 つで全数である(questions D4)。

---

## コンポーネント台帳

| # | コンポーネント | 所在(編集正本) | 責務 | 障害ドメイン |
| --- | --- | --- | --- | --- |
| LC-1 | C16 解決関数(`resolveAdvisoryChoiceAutonomously`) | `packages/framework/core/tools/amadeus-advisory-choice.ts`(guard 呼び出し部は `amadeus-orchestrate.ts` の `applyPendingAdvisoryGuard` 改訂) | hold → occurrence 写像(question)→ 既存裁定経路へ委譲 → 翻訳(resolved / human-required の 2 分岐) | engine プロセス内 |
| LC-2 | C17 受理関数(`recordAdvisoryChoice` — 置換) | `amadeus-advisory-choice.ts` | provenance 判別ユニオン 1 本での受理 3 点(grounding / 重複排除 / 提示照合)。store schema 2 への永続化 | engine プロセス内+advisory store |
| LC-3 | 委譲境界 | 既存 `commitProductionQuestionDecision:524`(裁定)/ semi-authorization-core の認可基体(第1関門・梯子) | 裁定・認可・AUTO_DECIDED 記録は既存経路が独占 — 本 Unit は新しい裁定経路を作らない | 既存認可基盤側 |

## 障害ドメインと blast radius

- **障害ドメイン**: engine プロセス 1 つ(単発 CLI 実行)。
- **blast radius**(方向別・機構別に層別 — 一枚岩の断定を避ける): **誤 hold 側**(解決すべきものを await へ落とす)は人間経路への縮退であり安全(現行挙動と同一)。**誤 resolve 側**(解決すべきでないものを通す)には独立 3 層の防衛 — (i) 認可は LC-3 委譲(本 Unit は認可を複製しない)(ii) 受理は 3 点検査(grounding が journal 実在を要求)(iii) 強制実行は選択肢空間除去+PROHIBITED_EFFECTS の二重機構。**store 破損側**は schema 検査の fail-closed hold(ADR-9)。
- **隔離戦略**: C16 の写像・翻訳は純関数部として export し in-process 駆動(t457/t459)。実 FS(store・journal)を跨ぐのは t458(integration)のみ(`cid:code-generation:fs-tests-integration-first`)。

## 共有資源

| 資源 | 共有相手 | 競合の扱い |
| --- | --- | --- |
| advisory store(schema 2) | guard(読)・受理(書)・close(書) | withAuditLock 4 区間のうち C16 連鎖上は `:599`(解放済み)と `:787`(受理)のみ — FD D4 の実測。`:518`(提示)/`:766`(close)は別動線で重ならない。U-3 の実装時実測義務を保持 |
| 監査 journal | 全 autonomy 経路 | 書込は既存 `commitProductionQuestionDecision` 経路の単一所有。本 Unit は grounding の**読取照会**(`readIntentAutonomyTransactionsFromAudit`)のみ追加 |
| `applyPendingAdvisoryGuard`(directive 差し替え点) | engine の directive 構築 | hold 時のみ C16 を起動し、resolved なら元 directive を無改変で返す(run-stage の内容に触れない) |

## インフラ非該当の明記

circuit breaker / cache / pooling / scaling / failover は**すべて非適用**(1 行理由): 単発 CLI の guard→解決→受理経路であり常駐負荷・外部サービス依存が存在しない(`cid:nfr-design:c1`、questions D2)。信頼性は 2 分岐構造・schema fail-closed・ロック直列性の決定的機構で担保する。

## 適用 NFR との対応(検証手段付き)

- **NFR-1**(FR-ADV-2 の面): security-design.md の落ちる実証(t458 — 認可無条件 true 化で赤)。
- **NFR-2**(advisory 面): AUTO_DECIDED は既存経路委譲 — t458 で記録実在を assert。
- **NFR-4**: t457/t459(unit)・t458(integration)を Red 先行で追加。
- **NFR-5**: 編集正本 2 ファイル(LC 台帳の所在列)のみ、`bun run build` 後の追跡ファイル不変。
- **NFR-6**(第2 receipt の面): 受理 3 点の等価強度(t459)+捏造 provenance 拒否の落ちる実証。
- **NFR-7**: PR CI ブロッキング集合の全通過。
- **NFR-3**: 非適用(security-design.md の分類表 — parser は本 Unit 外)。
