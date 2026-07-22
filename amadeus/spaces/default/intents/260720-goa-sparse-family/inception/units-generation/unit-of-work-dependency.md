# Unit of Work Dependency — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

単一 Unit につき Unit 間依存なし(component-dependency.md の実装順序 = AD→FD→CG 単一 Bolt をそのまま継承)。decisions.md ADR-4 の extractGoaRecords(component-methods.md のメソッド契約)は U1 内で完結し、services.md の出力契約4点と requirements.md FR-1〜FR-4 を単一 Unit で充足する(components.md の変更面5ファイルが対象)。外部依存は e2 #1267 面との関数単位非交差(C-5、着手前実 diff 再判定)のみ。

```yaml
units:
  - name: goa-sparse-acceptance
    depends_on: []
```
