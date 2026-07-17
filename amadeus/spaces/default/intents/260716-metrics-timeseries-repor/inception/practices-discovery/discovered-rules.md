# Discovered Rules — metrics-timeseries-report

上流入力(consumes 全数): codekb `code-structure.md`・`technology-stack.md`・`dependencies.md`・`code-quality-assessment.md`・`architecture.md`・`business-overview.md`(同日 RE 更新、c1 代用)+ affirm 済み `team.md`・`project.md`

## 新規発見ルール

**なし** — RE スキャンで観測した実践(兄弟 CLI の main(argv)/import.meta.main 様式、env seam 命名、atomic write)はすべて既存 memory 層の Code Style / Testing Posture / Corrections に既収載。team.md への部分ドラフト提案は不要(c2 — 無変更セクションの live 温存)。

## 判断根拠

- 兄弟 CLI 様式 = ui-less-mockups-as-output-contract と functional-domain-modeling-ts の実演(既決)
- in-process seam = bun-coverage-spawn-blindspot 系(既決)
- 新設ゲート・検証を持ち込まない読取専用 CLI のため、Forbidden/Mandated の増設余地なし
