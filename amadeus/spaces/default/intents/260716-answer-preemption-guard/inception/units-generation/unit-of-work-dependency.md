# Unit of Work Dependency — answer-preemption-guard

上流入力(consumes 全数): `../application-design/components.md`(C-1〜C-5)、`../application-design/component-methods.md`、`../application-design/services.md`(二層防衛)、`../application-design/component-dependency.md`(依存グラフ・非交差)、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜7)。

## 依存関係

単一 Unit のため Unit 間依存なし。

```yaml
units:
  - name: answer-evidence-sensor
    depends_on: []
```

## 外部依存(Unit 外)

- checkQuestionsEvidence(amadeus-lib.ts:1173)— マージ済み・無改修再利用
- 進行中 intent との非交差は component-dependency.md の設計時判定を実装 PR 時に実 diff で再評価(c6)
