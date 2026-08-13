# Unit Test Instructions — intent 260813-advisory-requestion-fix

`code-generation-plan.md` の Step 2(FR-ADV-4)と Step 3 の directive 射影規則に対応する単体テスト群。framework は bun test(自作ランナー `tests/run-tests.sh` の unit 層)。

## 対象と実行

```bash
# 新規・変更された advisory 単体テスト
bun test tests/unit/t113.test.ts                      # execute-advisory-handoff の射影規則 pin(t113 に追加)
bun test tests/unit/t457-advisory-auto-resolve.test.ts # 既存: occurrence 写像・option space(無退行確認)
bun test tests/unit/t459-advisory-receipt.test.ts      # 既存: single-spend・grounding(無退行確認)

# unit 層全体
bash tests/run-tests.sh --ci   # smoke/unit/integration/e2e 4層を含む正準実行
```

## カバレッジ観点(要件駆動)

- FR-ADV-4: `recordAdvisoryChoice` の型付き outcome(`recorded` / `already-settled` / `refused` の判別、fail-open 防止の refusal 分岐)— `t2967-advisory-record-outcome.integration.test.ts` が主担(統合層)、単体は t459 の既存 spend 検査を無改変維持
- FR-ADV-2: `execute-advisory-handoff` の checker(`handoff_stages` と advisories の双方向射影整合、空配列許容)— t113 追加分
- 期待カバレッジ: Patch Coverage Gate(CI)で新規行の被覆を担保。免除追加なし
