# Unit Dependency — solo-election

上流入力(consumes 全数): unit-of-work.md(U1/U2 定義)、components.md(変更対象の所在 — U1/U2 への振り分け根拠)、component-methods.md(split 語彙の定義所在 = 依存の実体)、component-dependency.md(SKILL→CLI→model の一方向)、services.md(実行時構成 — core/surface の役割分離の根拠)、decisions.md(ADR-3 の TS 正本主義が逆方向依存の禁止根拠)、requirements.md(FR-09 の同文照合が U2 を U1 の語彙に依存させる)。

## 依存グラフ(parseBoltDag 用 edge block)

```yaml
units:
  - name: solo-election-core
    depends_on: []
  - name: solo-election-surface
    depends_on: [solo-election-core]
```

## 依存の根拠

- solo-election-surface の SKILL 内挿文・team.md 改定文は、solo-election-core が実装する split 語彙・2体規則の実挙動を参照する(文面が未実装挙動を先取りすると mechanism-cite 違反になる)。
- 逆方向依存なし: core は SKILL/ノルムに依存しない(TS 正本主義 C-02)。
