# Incident Response — Clarifying Questions

## Q1: 最も起こりやすい障害モードは？

**Answer**:

1. PR CI gate 失敗（typecheck / security / coverage）
2. 誤った npm version の publish
3. secret scan による merge block
4. end-user の collision / no-write エラー（サポート問い合わせ）

## Q2: エスカレーション / on-call は？

**Answer**: solo maintainer モデル。`escalation-matrix.md` 参照。24/7 on-call ローテーションなし。

## Q3: 自動修復は可能か？

**Answer**: 限定的。CI は再実行のみ。npm rollback は dist-tag 手動変更（`rollback-runbook.md`）。SSM Automation / AWS Incident Manager は N/A。

## Q4: インシデント中のコミュニケーション手順は？

**Answer**: GitHub Issue / PR コメント + npm deprecate message。外部ステータスページなし。

## Q5: RTO / RPO は？

**Answer**:

| 対象 | RTO | RPO |
|------|-----|-----|
| PR CI 復旧 | 4h（次営業日以内） | N/A（コード revert） |
| 誤 publish 緩和 | 1h（dist-tag 戻し） | N/A（registry immutable version） |
| secret leak | 30m（token rotation） | N/A |

## Upstream References

- `dashboards.md` / `alarms.md`: 検知と alarm ID
- U7 `reliability-design.md`: GateResult、failure handling
- U7 `security-design.md`: secret/dependency blocking
- U8 `deployment-architecture.md`: release state boundaries
