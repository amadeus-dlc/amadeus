# Bolt Plan — Engine Installer（260705-engine-installer）

上流入力: [unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[requirements.md](../requirements-analysis/requirements.md)

## Bolt 分割

単一 Unit（u001-engine-installer）を 2 Bolt に分割し、直列実行する。scope は feature（skeleton on がエンジン既定）であり、B001 を walking skeleton とする。

| Bolt | 内容 | 対応ストーリー / FR | 完了条件 |
|---|---|---|---|
| B001-installer-skeleton（walking skeleton） | eval 骨格（RED）→ manifest + cli + 5 工程の最小実装（GREEN）。エンドツーエンドで「一時 workspace へ実インストール → 全 tools/hooks module load → 冪等再実行」が通る最小の縦切り | US-8 骨格、US-1、US-2、FR-1.1〜1.3、FR-1.5〜1.11、FR-2.1〜2.5、FR-2.8 | test:it:installer の骨格が GREEN。walking skeleton の Bolt gate は人間承認（team.md） |
| B002-installer-hardening | 異常系と品質の完成: 事前チェック 3 パターン、衝突・不正 JSON の非破壊、AMADEUS.md 変換の双方向検査、非対象資産の不変、Codex 完全性、README、スモーク方式の確定実装（O-2） | US-3〜US-7、US-9、FR-1.4 の変換詳細、FR-2.6〜2.7、FR-2.9〜2.11、FR-3.1、FR-4.1 | 全 eval 項目 GREEN + validator / test:all pass |

## 直列実行の根拠

- 同一 worktree 内の Bolt は直列実行とする（team.md 直列化ポリシー、C-3 = Bolt 直列のディスパッチ指示）。
- B001 が配置と検証の縦切りを先に成立させ、B002 の異常系実装はその骨格の上に積む（依存が一方向）。

## PR 単位

PR は単一（D7）とし、B001 / B002 は同一 branch 上の実装区切りとして扱う。walking skeleton（B001）の Bolt gate は人間承認を必要とするため、B001 完了時点で leader へ gate 報告する（Bolt PR は作らず、gate evidence は最終 PR の merge と BOLT_COMPLETED とする。単一 PR の確定 = scope-definition gate 承認済みとの整合）。
