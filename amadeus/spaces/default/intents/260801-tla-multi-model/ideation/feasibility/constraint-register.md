# Constraint Register — 260801-tla-multi-model

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`feasibility-assessment.md`

## 技術制約

- C1: FormalElection 側の検証結果・frozen model receipt identity は不変(成功3点 (iii))。model-map スキーマ拡張は既存エントリの identity 算法に非侵入であること
- C2: CI の formal-model-check ジョブは workflow_dispatch 起動の既存枠組みを維持(恒常化の範囲はジョブ内容の複数モデル対応であり、起動トリガ変更は別裁定)
- C3: 推移解決は TLA+ の EXTENDS / INSTANCE 両構文を対象とする(MirrorLifecycle.tla:31-32 は INSTANCE … WITH 形)
- C4: `TLA_NAMED_INVARIANTS`(tla-arm.ts:322-332)の unpin を含む(Q1=A) — モデル別の invariant 集合供給方式が必要
- C5: `grep -rl FormalElection tests/` = 27 ファイル(クロスレビュー実測)の参照修正は本 intent のテスト改訂面。loader 無引数ピン(t-formal-verif-tla-model-loader.test.ts:10-13)の改訂裁定が要る(cid:reverse-engineering:c1-pinned-behavior-ruling)

## 組織・プロセス制約

- C6: 生成物(dist/、self-install)は `bun scripts/package.ts` 再生成、drift guard 通過。plugin 面は plugin conformance E2E が既存ゲート
- C7: コメント・ドキュメントは日本語(コード識別子は原文)、コミットは英語 conventional
- C8: クロスレビュー verdict の留保転記(cid:requirements-analysis:citation-reservation-preservation) — #1920 verdict の「TLC 実走は未実施」留保は実装段の実測で閉じる
