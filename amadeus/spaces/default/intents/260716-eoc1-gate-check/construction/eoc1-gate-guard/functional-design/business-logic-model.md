# Business Logic Model — eoc1-gate-guard

## 上流入力(consumes 全数)

domain-entities.md、business-rules.md、`../../../inception/reverse-engineering/scan-notes.md`(挿入点)、`../../../inception/units-generation/unit-of-work.md`、`../../../inception/requirements-analysis/requirements.md`(FR-2 配線)、`../../../inception/application-design/component-methods.md`(設計正本)。

## フロー

```
handleGateStart(slug)
  → validateSlugInState(...)          // 既存
  → checkQuestionsEvidence(path)      // 新設(lib、純関数・読み取り専用)
      path = <record>/<phase>/<slug>/<slug>-questions.md(stage 解決から導出)
      BR-1→BR-2→BR-3→BR-4/5/6 の短絡評価
  → fail なら error(M-1|M-2 文言)     // ここで停止(fail-closed)
  → setCheckbox → emit → write        // 既存(通過時は無変更 — M-3)
```

テキストフォールバック: 上図は「状態前提検査 → 新検査 → 従来遷移」の直列3段で、新検査は fail 時のみ停止し通過時は無出力。
