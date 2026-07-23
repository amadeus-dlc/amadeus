# Business Rules — U4 clean-env-e2e

> 上流入力(consumes 全数): requirements(FR-6)、components(C6)、component-methods(C6)、unit-of-work(U4)、unit-of-work-story-map、services(fake 対象境界)

## ルール一覧

| ID | ルール | 検証 |
|---|---|---|
| BR-1 | 被検体は配布コピーのみ(canonical 直実行禁止 — no-canonical-direct-execution)。self-install ツリーを temp へ展開して実行 | テスト実装のパス assert |
| BR-2 | 実環境(実 HOME・実 PATH・実 herdr/agmsg)へ一切触れない(隔離の完全性)— 実 ~/.agents への書込 0 | temp prefix の assert+CI 環境での green |
| BR-3 | fake の期待 verb 列は herdr 0.7.1 実測面と一致させ、乖離時は fake 更新で追随 — fake の期待が固定する seam が **raid-log R-2(herdr バージョン互換リスク — constraint-register の R-2 とは別ラベル)** の変化検出器を兼ねる(出典 = AD decisions.md ADR-4 Consequences 行、正本直読 2026-07-23) | fake ログ assert の定義位置を1箇所に集約 |
| BR-4 | Must 面のみ E2E 保証(Claude 単一チーム・既定サイズ)。バリエーション(codex/instance/resume)の E2E は追加しない(scope Q1) | ケース表の閉集合 |
| BR-5 | serial 層に配置し、fanout 直後の統合実行を避ける(負荷偽赤防止 — fanout-load-settle) | tests/e2e/ の serial 命名+CI 配置 |
| BR-6 | エラー経路の実到達を lcov DA(TS 面)+stderr 文言弁別(bash 面)で確認(FR-6c) | DA 実測+文言 assert |

## 検証の割付

全ケースが e2e 層(本 Unit の性質上、unit/integration 分割はしない — fake seam 自体は既存 t-team-msg の integration 様式を再利用し、新規の共有ヘルパーを作る場合は tests/ 側に置く)。
