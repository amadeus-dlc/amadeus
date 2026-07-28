# Build and Test Summary — 260727-mirror-project-status

上流入力(consumes 全数): code-generation-plan, code-summary(u1-project-sync-skeleton / u2-state-reconcile-hardening / u3-lifecycle-integration / u4-config-overrides-and-diagnostics / u5-docs-and-distribution の全5ユニット)

## 総括

全5ユニット(u1〜u5、stacked Bolt 列 be404c29c → 358c084b9 → 47e6b273b → fd1b8a657 → 45a09c9a0)の実装・テスト・配布同期を検収した。各ユニットは §12a reviewer READY(iteration 1×5)、逸脱はすべて裁定済み(E-U1CG / E-U2CG 執行裁定、u3 引数拡張 = reviewer 妥当判定、u4 summary フィールド = ユーザー裁定 (a))。

## 検証マトリクス(実測 exit code、測定 ref = 45a09c9a0)

| ゲート | 結果 |
|---|---|
| typecheck / lint | 0 / 0 |
| dist:check / promote:self:check(7面+self-install) | 0 / 0 |
| complexity gate | 0(NEW_VIOLATION 0 — u2 で parser 分割修復+baseline 例外1件記録) |
| mirror-docs-contract | 0(4 documents, 44 topics) |
| run-tests --ci | 1 — 赤は t132 のみ(#1594 既存赤、mirror 非交差を assertion 実文で確定) |
| mirror 面テスト(t343〜t349, t285/t287/t291) | 168 pass / 0 fail(conductor 再実行 2026-07-28) |

## 落ちる実証(org.md Mandated)

u2: closeGateHold 相当なし(u3 で実施)/ u3: gate.ready 改変 → 2 fail → 復元 / u4: unknown phase 空化 → 2 fail、drift 固定 → 4 fail、文言差し替え → 1+2 fail → 各復元 / u5: docs contract mutatesRemote 注入 → exit 1 → revert。全て注入→赤実測→復元 clean の1セットで実施。

## 残リスク・未検証面(verdict-names-unverified-facets)

- 実 GitHub Project への end-to-end は U1 walking skeleton で実証済み(R-3: 実 Project #5 への追加+safety-blocked 正観測)。U2〜U4 の実 API 面は FakeGateway 契約テストによる検証で、実運用投入時の観測は operation 面(本 intent スコープ外・受入条件14 の範囲内)
- PR #1593 の CI 赤は #1594(main 既存赤)由来 — マージには main 側修正の取込が必要

## Verdict

条件付き READY — 上記2点の明示引き継ぎ付き。バージョン・バッジ・リリースノート不変(BR-U5-7)。
