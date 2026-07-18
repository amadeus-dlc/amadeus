# Reliability Design — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- RD-D1(RNR-D1): 監査語彙 2 行(12-state-machine.md:367 / audit-format.md:202)の書き換えは「trigger = 他ハーネス専用 ultra 値の loud-degrade / 旧 1 は fail-closed」の事実文へ — U1 決定表(FD 16 セル)から転記し独自表現を作らない
- RD-D2(RNR-D2): C-15 開示文は U2 RD-W2 の定型 1 文を docs 用に転記(語彙同一)— 禁止フレーズは canonical 6 句 grep
- RD-D3(RNR-D3): 受け入れの正は dist:check / promote:self:check の exit 0 — 手動確認を機械 check の代替にしない

## 保証機構(層別)

- 転記層: 正は U1/U2 成果物(独自表現ゼロ)
- 検査層: 既存 drift check(exit code)
