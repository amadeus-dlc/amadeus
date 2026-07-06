# Dependencies — 260705-rulesdir-resolve

上流入力: [Issue #491](https://github.com/amadeus-dlc/amadeus/issues/491)

## 依存関係

- rulesDir() は node:fs（existsSync）と node:path（join）だけに依存する。
- 修正（walk-up）も同じ依存範囲で完結し、新規依存を持ち込まない。
