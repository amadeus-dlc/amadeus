# Logical Components — fix-1172-skip-denominator(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 論理構成(実装対象の最終形)

```
scripts/amadeus-mirror.ts
└─ countStageProgress(stateContent)          # シグネチャ不変(export 済み)
   ├─ if m[1] === "S": continue              # 既存 — jump-skip 除外
   ├─ if / — SKIP\s*$/.test(line): continue  # 追加 — scope-skip 除外(business-logic-model)
   └─ total++ / approved++                   # 既存
```

- 変更ファイル: scripts/amadeus-mirror.ts(3-5行)+ tests/unit/t232-amadeus-mirror.test.ts(fixture 是正+ケース追加 20-40行)
- 配布面: なし(tech-stack-decisions.md T-2 の scripts 既存配線)

## 変更目録(nfr-design:c7 — 設計確定後の導出)

| 面 | ファイル | 変更 |
|---|---|---|
| コード | scripts/amadeus-mirror.ts | 除外条件1本+コメント更新(3-5行) |
| テスト | tests/unit/t232-amadeus-mirror.test.ts | :72 捏造 fixture の実様式化+両様式・18/18 ケース追加(20-40行) |

## Review

**Verdict**: READY(architecture-reviewer subagent、2026-07-18T00:36Z 頃、iteration 1、指摘 0)— NFR 全数写像・変更目録の unit-of-work 整合・挿入位置の現行コード照合(:100-:101 間)・FCC 非適用と ReDoS 非該当の妥当性・無申告逸脱なしを独立実測で確認(conductor が verdict を転記 — delegated-review-analysis-with-owned-verdict 準拠)。
