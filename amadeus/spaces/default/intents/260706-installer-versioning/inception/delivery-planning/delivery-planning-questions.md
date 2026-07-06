# Delivery Planning Questions — 260706-installer-versioning（Issue #543）

上流入力: [bolt-plan.md](bolt-plan.md)

## 確認済み事項

| 論点 | 確定 |
|---|---|
| Bolt 数と分割線 | 2 本直列（構造変更 + skeleton を B001、判定・退避・文書を B002）。#451 の B001 skeleton / B002 hardening 前例と同型 |
| walking skeleton の範囲 | 導入 → manifest 記録 → 版確認の実配線（判定は常に overwrite で従来互換） |
| PR 単位 | Intent 全体で draft PR 1 本。Bolt gate は承認で刻む |

新規の質問はない。gate 承認で確定する。
