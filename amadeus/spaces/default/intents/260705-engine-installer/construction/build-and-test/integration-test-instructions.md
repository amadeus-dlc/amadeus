# Integration Test Instructions

Unit: u001-engine-installer

## 実体

専用 eval（`dev-scripts/evals/installer/check.ts`、`test:it:installer`）が統合テストの本体である。一時 workspace への実インストールを駆動し、受け入れ条件を直接検証する。

## 検証項目（FR 対応）

- 実インストールと 5 工程出力（FR-2.1）、cold cache + オフライン相当の全 tools/hooks import graph 解決（FR-2.2）、冪等再実行（FR-2.3）、マニフェストと実レイアウトの一致（FR-2.5）、AMADEUS.md 双方向検査（FR-2.6）、settings マージ（FR-2.7）、一時 dir の片付け（FR-2.8）、非破壊エラー中断（FR-2.9）、事前チェック 3 パターン（FR-2.10）、非対象 skills 不変（FR-2.11）、スモーク偽陽性回帰（FR-2.12）、aidlc/ 不可侵（FR-2.13）、Codex 完全性（FR-4.1）、usage 経路（FR-1.1）、stale skill 削除（BR-13）。

## 実行方法

```sh
npm run test:it:installer
```
