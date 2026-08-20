# Unit Dependency — 260820-fmc-drift-batch

上流入力: `inception/application-design/` の5成果物(依存2辺の宣言は `component-dependency.md`、unit 対応は `components.md` C1〜C4、変更面は `component-methods.md`、新設サービス不在は `services.md`、辺の由来は `decisions.md` ADR-1)と `unit-of-work.md`。requirements.md の Constraints(所有権由来1本)+ AD の import 由来1本を unit グラフへ写像。

## 機械可読エッジブロック(runtime compiler 用)

```yaml
units:
  - name: revise-model-commit
    kind: library
    depends_on: []
  - name: boundary-three-face
    kind: library
    depends_on: []
  - name: advisory-retirement
    kind: library
    depends_on: []
  - name: applicability-arms
    kind: library
    depends_on:
      - revise-model-commit
      - advisory-retirement
```

## 依存 DAG

```
U1 revise-model-commit ──┐(leaf モジュール新設 → U4 が import)
U3 advisory-retirement ──┼──> U4 applicability-arms(直列末端)
U2 boundary-three-face ──┘(依存なし — U4 とはファイル非交差)
```

<!-- Text fallback: U4 は U1(leaf 依存)と U3(tla-authoring.ts / stages / docs 共有)の両方の着地後に着手。U2 はどの unit とも非依存で完全並列。 -->

| 辺 | 由来 | 種別 |
|---|---|---|
| U3 → U4 | `tla-authoring.ts` / `stages/tla-authoring.md` / docs 2面の共有(requirements Constraints の1本) | ファイル所有権 |
| U1 → U4 | leaf モジュール `authoring-routes.ts` は U1 が新設し U4 が import(ADR-1) | コンパイル時 import |

U2 への辺・U2 からの辺はなし。U1 / U2 / U3 は相互にファイル非交差で並列実装可(反証は AD component-dependency.md の並列可節 — C2×C3 / C2×C4 の2件 + 本書の write scope 突合)。

## 並列バッチ構成(delivery-planning への入力)

- **並列集合**: {U1, U2, U3}(worktree 分離、共有リソース `model-map.json` は U2 のみがソース経路で触る — U1 の書込はランタイム挙動でありソース編集なし)
- **直列末端**: U4(U1 + U3 の着地後)
