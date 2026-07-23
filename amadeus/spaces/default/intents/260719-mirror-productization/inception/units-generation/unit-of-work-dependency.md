# Unit of Work Dependency — 260719-mirror-productization

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

> 依存辺の導出元: component-dependency.md の C2→C1 / C4→C3 / C4→C1。ユニット境界と規模は components.md・component-methods.md、順序制約(T-norm)は decisions.md ADR-7 と requirements.md FR-7 (c)、外部面の非依存(services.md の gh optional)は DAG に辺を作らない。

## 依存 DAG(prose)

- U1-mirror-tool: 依存なし(T-norm の norm PR マージが**マージ順序の前提** — コード依存ではないため DAG 外、delivery-planning で順序制約として扱う)
- U2-mirror-skill: U1 に依存(SKILL が呼ぶ `{{HARNESS_DIR}}/tools/amadeus-mirror.ts` は U1 の移設が前提 — component-dependency.md C2→C1)
- U3-mirror-config: 依存なし(葉モジュール — C3 は C1/C2 を知らない)
- U4-engine-boundary: U3 に依存(C4→C3 の resolve 読取)+U1 に依存(print 指令が sync verb を名指し — 移設後パスが前提)

サイクルなし(U1←U2、U3←U4、U1←U4 の一方向のみ)。

## 機械可読 edge block

```yaml
units:
  - name: U1-mirror-tool
    depends_on: []
  - name: U2-mirror-skill
    depends_on: [U1-mirror-tool]
  - name: U3-mirror-config
    depends_on: []
  - name: U4-engine-boundary
    depends_on: [U1-mirror-tool, U3-mirror-config]
```

## Bolt 対応(D-08 既決)

- Bolt 1(縦スライス・単独ゲート): U1+U2(T-norm 先行)
- Bolt 2+: U3 → U4(U3 と U1 は非交差につき、Bolt 1 完了後は U3 から並行可)
