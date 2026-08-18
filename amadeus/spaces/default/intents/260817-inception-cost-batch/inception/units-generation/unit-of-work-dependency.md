# Unit of Work Dependency — インセプション固定費バッチ(#3181 + #2415)

上流入力: `unit-of-work.md`(U1/U2 定義)、application-design `component-dependency.md`(C1〜C7 マトリクス)・`decisions.md`(ADR-3 の内容依存)、`components.md`・`component-methods.md`・`services.md`(統合点の定義元)、`requirements.md`(直列化制約)。

## 依存 DAG(トポロジのみ — 実装順の経済判定は delivery-planning)

- **U2 → U1**(U2 depends on U1): U2 が契約へ書く「codekb 本体は工程記録を新規引用しない」(ADR-3)は、自 intent 事実の正規代替経路として U1 の issue-evidence 機構を名指す。U1 未着地で U2 だけが着地すると契約文が実在しない機構への dangling reference になる — 内容依存であり、同一ファイル編集の順序問題(それは delivery-planning の直列化)とは独立に成立する。

```yaml
units:
  - name: issue-evidence-upstream
    kind: library
    depends_on: []
  - name: re-input-exclusion
    kind: spec
    depends_on: [issue-evidence-upstream]
```

## 統合点

| 統合点 | 形 | 参加 Unit |
|---|---|---|
| issue-evidence artifact | record 内 markdown(様式は component-methods.md 定義)| U1 産出・U2 の契約文が正規経路として参照 |
| `reverse-engineering.md`(共有契約ファイル)| U1 面 = frontmatter consumes + Focus 導出 / U2 面 = Step 2 走査対象 + 除外宣言 | U1・U2(同一ファイル別節)|
| `RE_SCAN_EXCLUDED_PATHSPECS` 定数 | 契約逐語との drift 検査で結合(C7)| U2 のみ |

## 並行開発の余地

- DAG 上 U2 は U1 に依存するため、**両 Unit を独立に並行実装できる組は存在しない**(2 Unit・1 エッジの直鎖)。トポロジカル順序は一意(U1 → U2)。
- Unit 内部では、U1 の C1(adapter)と C3(resolver)は相互独立で並行可能。C2(verb)は両方に依存する。
