# Component Dependency — metrics-observation

```
C5 (CI job) ──needs──> coverage job(既存)
   │ 実行
   ▼
C1 (CLI) ──> C2 collectors ──> 既存 seam 群
   │                    ├─ runLizard(tests/complexity-gate.ts、in-process import)
   │                    ├─ coverage-totals.json(既存出力を読む)
   │                    ├─ tests-totals.json(C4 が書く新 seam を読む)
   │                    └─ test-size 分類器(tests/lib/test-size.ts)
   ▼
C3 (writer) ──> metrics/*.json(temp→rename)
```

- 循環なし(C4 は run-tests 側の独立追加で C1 に依存しない — C1 が C4 の出力ファイルを読むのみ。ファイル境界による疎結合)
- 依存方向: 新規(C1-C3)→ 既存 export/出力ファイル。既存コードから新規への依存はゼロ(C4 の書き出し追加は既存フローの末尾拡張で、新規モジュールを import しない)
- Law of Demeter: C1 は collector の結果型だけを知り、lizard/lcov の内部形式は各 collector に閉じる
