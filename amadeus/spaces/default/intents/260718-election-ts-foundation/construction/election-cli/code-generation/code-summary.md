# Code Summary — election-cli(Bolt 1+Bolt 4)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、frontend-components.md、performance-design.md、security-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## 生成物(PR #1227+PR #1235)

| ファイル | 内容 | 検証 |
|---|---|---|
| `scripts/amadeus-election.ts` | 7状態 next/report(business-logic-model.md 指令表 — verb/report フィールドの機械可読名指し)、exit code 契約(frontend-components.md 正本 — next は hold でも 0)、blind ビュー生成(security-design.md の実行境界 — requirements.md FR-1b)、U4 配線 notify(実送達のみ記帳)、U3 配線 render/verify(実 parseGoaLine round-trip — performance-design.md の単一走査内)、hold-resolved 理由別 resume(domain-entities.md ReportResult)、時刻 normalizeAt funnel(#1233 Minor 3) | t236 in-process 10 テスト(全 verb・全ガード・改竄赤)+t237 e2e+t241 機械実行器 e2e(ADR-6 CI 層 — unit-of-work.md U5 行の e2e 宣言) |

## Bolt 完了状態

- U5 完全化完了(bolt-plan.md Bolt 4 宣言どおり)。検証実測: typecheck/lint/dist/promote/coverage:ci 全 exit 0、patch gate 171/171、complexity 新規違反 0(PR #1235 本文に記録 — business-rules.md の検証列と対応)
