# Reliability Requirements — fix-1172-skip-denominator(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要件

| # | 要件 | 根拠/検証 |
|---|---|---|
| R-1 | 不正入力(マッチしない行・空文字列)は既存のスキップ挙動を維持 — 新規例外経路なし | business-logic-model エラー処理節、既存 t232 green 維持 |
| R-2 | 不変条件 approved <= total を全入力で維持(除外は total を減らす方向のみ) | domain-entities 不変条件節、unit テストの性質確認 |
| R-3 | 表示のみの機能(状態行)であり、誤分母の再発は t232 の実様式 fixture(BR-4)で恒久検知 | requirements FR-2c |

## 前提(technology-stack 由来)

technology-stack.md の bun test ランナーで unit 層検証(fs 非依存の純関数 — integration 昇格不要)。

## Review

**Verdict**: READY(architecture-reviewer subagent、2026-07-18T00:30Z 頃、iteration 1)— 5成果物の N/A 反証可能性・BR/FR 整合・引用実在(biome.json:41 / tsconfig.json:19 / countStageProgress 消費2箇所)・実コーパス 1216 行整合を独立実測で確認、指摘 0 件(conductor が verdict を record へ転記 — delegated-review-analysis-with-owned-verdict 準拠、内容は reviewer 最終テキスト verbatim 要約)。
