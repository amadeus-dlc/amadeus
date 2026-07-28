# Reliability Design — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

reliability-requirements の「診断は劣化環境でこそ価値を出す・失敗しても無害」を、分類の正常系化と副作用ゼロ構造で実現する。circuit breaker・リトライ機構は非適用(cid:nfr-design:c1)。

## 診断の障害時挙動設計

- **劣化状態は診断結果**: 権限不足・フィールド/選択肢未解決は例外ではなく resolution 4値の正常な分類として返す(business-logic-model 手順3 — reliability-requirements)。診断が失敗として落ちるのは gh 到達不能等の外部障害のみで、その場合も loud fail+workflow 継続(reliability-requirements の FR-7e 準拠)。
- **再実行は常に安全**: mutation 0(security-requirements の受入条件12)+台帳 write 0(reliability-requirements の無害性)により、診断の実行・失敗・中断が同期状態を壊す経路が構造的に存在しない — 冪等以前に副作用ゼロ。

## 設定の障害時設計

- parse 失敗層の無効化+有効最終層のみ入力(business-logic-model の層解決 — reliability-requirements の fail-closed)。設定 0 件+所属 0 件では診断列空・既存出力不変(business-logic-model のエッジケース — 既存 repair status の回帰テスト維持)。

## additive 拡張の保証

- 既存 repair status 出力は不変(reliability-requirements — business-logic-model が実装直読 amadeus-mirror-lifecycle.ts:816 / :406-412 で確認した既存形へ列を追加するのみ)。既存挙動の回帰テストを維持し、拡張が既存消費者を壊さないことを機械固定。

## 検証の設計

- 診断ケース(drift あり/なし・field-missing・option-missing+availableOptions・permission-denied・部分成功)の出力固定+mutation 0 assert(reliability-requirements・security-requirements の共通受入条件12)。検査シームは performance-requirements の2系統分離に従う。
- 落ちる実証: unknown phase キー注入で issue 化の赤を確認(business-logic-model の検証面 — 実行時消費行への注入)。

## 非目標

- SLA/SLO・バックアップ: N/A(reliability-requirements の N/A 規律)。診断結果の永続化・履歴管理は設計対象外(scalability-requirements — U4 側に規模を持つ状態が存在しない。tech-stack-decisions の新永続面ゼロ)。
