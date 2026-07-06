# Unit of Work Dependency — 260706-harness-codex

上流入力: [unit-of-work.md](unit-of-work.md)、[requirements.md](../requirements-analysis/requirements.md)。

## 依存関係

Unit は u001-harness-codex の 1 個であり、Unit 間依存は存在しない。

```yaml
units:
  - name: u001-harness-codex
    depends_on: []
```

## Unit 内の作業順序（参考）

FR-1（fresh clone 純正性検証）→ FR-2（写像表）→ FR-3（yaml 追加）→ FR-4（harness/codex 2 文書）→ FR-6.5（scanRoots 追加）→ FR-5（promote 昇格）→ FR-6（検証一式）。FR-1 の照合結果が FR-3 の取り込み内容を確定するため、この順序は入れ替えない。
