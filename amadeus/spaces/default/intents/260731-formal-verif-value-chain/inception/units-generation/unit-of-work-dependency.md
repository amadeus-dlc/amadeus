# Unit Dependency — formal-verif-value-chain

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

component-dependency.md の C 依存グラフを Unit 粒度へ写像した edge block。parseBoltDag が消費する(per-unit-loop-activation (a))。

## Edge Block

```yaml
units:
  - name: u1-runner-relocation
    depends_on: []
  - name: u2-residue-deletion
    depends_on: [u1-runner-relocation]
  - name: u3-boundary-guard
    depends_on: [u1-runner-relocation]
  - name: u4-tools-distribution
    depends_on: [u1-runner-relocation]
  - name: u5-advisories-channel
    depends_on: []
  - name: u6-impl-only-path
    depends_on: [u1-runner-relocation]
  - name: u7-mirror-model
    depends_on: [u6-impl-only-path]
  - name: u8-e2e-acceptance
    depends_on: [u4-tools-distribution, u5-advisories-channel, u7-mirror-model]
```

## 依存の根拠

- u1 → u2/u3/u4/u6: 移設確定が削除面・ガード検査面・配布対象・loader パスの前提(component-dependency の C1 → C2/C10/C6/C7 を継承)。
- u6 → u7: モデル追加前に impl-hash 正規復旧経路を用意する安全順序(C7 → C8 継承)。
- u5 は独立(orchestrate/activation クラスタ — 移設系と非交差。実 diff での交差再判定は delivery-planning)。
- u8 は u4/u5/u7 の完了後(e2e 実測の前提機構が全て揃う)。

## バッチ見込み(トポロジカル)

1. batch 1: u1(walking skeleton — 単独・ゲート付き)+u5(並行可、ただし walking-skeleton ゲート方針により u1 単独先行)
2. batch 2: u2 / u3 / u4 / u6(u1 後の並行 — 同時 active builder 上限4の枠内)
3. batch 3: u7
4. batch 4: u8
