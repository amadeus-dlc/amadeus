# スケーラビリティ設計 — U8 docs-sync

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## SCALE-U8-1: N/A(参照継承)

N/A — `scalability-requirements.md` SCALE-U8-1 の N/A(文書 Unit — ランタイムのスケーリング軸なし)を参照継承する。

## 更新対象の有界確定手順

`scalability-requirements.md`「更新対象の有界性」(BR-U8-2)の語彙起点棚卸しを、次の決定的手順として設計する:

```
grep -rn 対象語彙(plugin / compose / doctor / drop / marketplace / --single)を repo 全域へ適用
  → ヒットした文書(docs/ + 正本知識ファイル)から更新対象 DocsTarget を確定
  → grep コマンドと結果件数を成果物へ転記(numbers-from-command-output-only)
```

- 棚卸しは grep 出力からの転記で毎回作り直し、既存表の複製をしない(inventory-from-grep-each-time)。docs/ 起点の列挙は使わない(正本知識ファイルの構造的見逃し防止 — `business-logic-model.md` フロー 1)
- `performance-requirements.md` / `security-requirements.md` / `reliability-requirements.md` の各設計はこの有界集合(19-plugins 日英ペア+棚卸しで確定した追加対象)を共通の変更面境界とする
