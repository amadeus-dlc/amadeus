# Security Test Instructions — 260821-fmc-retirement

上流入力: `inception/requirements-analysis/requirements.md` NFR-3、`construction/fmc-retirement/nfr-design/security-design.md`、`../fmc-retirement/code-generation/code-generation-plan.md`(裁定表)、`../fmc-retirement/code-generation/code-summary.md`(FR-DEL-1 grep・CI 面の実測出典)。

## 判定: 専用 security 検査は N/A(数値 security NFR 不在)— 設計面の検査は既存ゲートで実施済み

- **判定**: 合否を決める数値 security 目標は宣言されていない(NFR-3)。SAST/DAST・認証・injection 系の専用検査は対象境界が存在しないため生成しない(削除 intent、新規外部境界ゼロ — security-design.md「新規外部境界: なし」)
- **実施済みの security 関連検証**(security-design.md「実装時の security 検査事項」の消化):
  - 攻撃面縮小の実測: CLI 実行系(TLC spawn / docker trace 系 約 7,600 行)+ JDK 依存の消滅は FR-DEL-1 全域 grep 0 hits と mise.toml diff で確認
  - fail-closed 保全: FR-CI-1 の job 除去後も ci-success の needs 集合が他の blocking gate を保持(NFR-4 の needs 実測 — code-summary.md CI 面)
  - blocking 検査強度の維持: t341 は合成 fixture で assertion 削除 0(BR-6)
  - 秘密情報: 削除対象・新設 fixture とも credential なし(fixture はダミー宣言 + no-op CLI)

## 将来この判定を覆す条件

- FMC 再設計 intent が外部実行系(TLC/docker 等)を再導入する場合、spawn 境界の入力検証・サンドボックス検査を security NFR として宣言してから検査を生成する
