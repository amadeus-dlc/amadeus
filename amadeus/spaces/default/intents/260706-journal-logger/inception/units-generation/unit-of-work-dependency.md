# Unit of Work Dependency — 260706-journal-logger

## 上流入力

[unit-of-work.md](unit-of-work.md)、[requirements.md](../requirements-analysis/requirements.md)。

## 依存関係

Unit は u001-journal-logger の 1 個であり、Unit 間依存は存在しない。

```yaml
units:
  - name: u001-journal-logger
    depends_on: []
```

## Unit 内の作業順序（参考）

FR-1（契約 doc = 形式の正）→ FR-2（validator eval RED → 実装 → promote）→ FR-4（#556 移行 = 契約形式の最初の実データ、validator の検査対象になる）→ FR-3（手順書 + prompt = 契約とアンカー形式を参照）→ FR-5（チェックリスト）→ 検証一式。FR-1 が形式の正のためこの順序は入れ替えない。
