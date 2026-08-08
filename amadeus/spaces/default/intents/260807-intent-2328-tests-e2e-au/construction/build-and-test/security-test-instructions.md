# Security Test Instructions — 260807-intent-2328-tests-e2e-au

上流入力(consumes 全数): code-generation-plan（変更面の確認元）、code-summary（実測転記元）

## 適用外の根拠（cid:build-and-test:c4 — NFR trace なき専用試験は新設しない）

本 intent の requirements にセキュリティ NFR は存在しない。変更はテストコードのみで、認証情報・入力サニタイズ・権限境界・本番実行経路への変更はない。DAST・依存監査の新設は行わない（repository 全体の dependency audit は本 intent と別判定 — cid:build-and-test:c1-doctor-seam）。

## 患部に対応する既存担保面（本変更で保存を実測した境界）

- **writer の fail-closed 経路の無傷**: 監査 emit 側（amadeus-worktree.ts:632-640 の emit 例外非0終了・withAuditLock の throw）へ diff ゼロ — 読み手の修正が監査整合性の書込側保証を変えないことを機械確認
- **偽 green の封鎖**: vacuity 3 assert の落ちる実証により、「0件期待」assert が実在行を見逃す抜け道（検証劇場化）を塞いだ — audit-of-intent 整合性の検証信頼性はセキュリティ担保面の一部
