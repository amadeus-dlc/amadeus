# Bolt Plan — Presence Evidence（260705-presence-evidence）

上流入力: [unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[requirements.md](../requirements-analysis/requirements.md)

## Bolt 分割

単一 Bolt とする（feature scope の skeleton 既定はあるが、文書 2 ファイルの変更に縦切り骨格の概念が適用できないため、walking skeleton は成立しない = skeleton 相当の確認は最初の下書き時の実装再読了（FR-2.3）が担う）。

| Bolt | 内容 | 完了条件 |
|---|---|---|
| B001-boundary-doc | audit-format.md への設計境界節（英語、5 要素 + 出典）+ parity-map reason 追補 + 実装再読了記録 | validator + test:all + parity:check の pass、code-summary への FR-2.3 記録 |

## 直列実行と PR

単一 Bolt・単一 PR（D2）。着手前に #428 への parity-map 接触確認（ピア連絡）を行う。
