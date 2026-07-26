# Unit of Work Dependency — plugin-host-delivery

> 上流入力(consumes 全数): components、component-methods、services、component-dependency、decisions、requirements
> component-dependency.md の C 依存グラフを Unit 粒度へ射影した DAG。requirements.md の委譲(FR-1 が対応面集合の確定条件)と decisions.md ADR-1 裁定済みを反映。parseBoltDag 用の YAML edge block(必須 — per-unit-loop-activation)を含む。

## 依存 DAG(YAML edge block — engine が読む正本)

```yaml
units:
  - name: harness-capability-matrix
    depends_on: []
  - name: walking-skeleton-claude
    depends_on: [harness-capability-matrix]
  - name: host-projection-all
    depends_on: [walking-skeleton-claude]
  - name: hook-wiring-remaining
    depends_on: [host-projection-all]
  - name: doctor-observability
    depends_on: [walking-skeleton-claude]
  - name: activation-policy
    depends_on: [walking-skeleton-claude]
  - name: conformance-suite
    depends_on: [hook-wiring-remaining, doctor-observability, activation-policy]
  - name: docs-sync
    depends_on: [conformance-suite]
```

## 依存の根拠

| エッジ | 根拠 |
|---|---|
| U1 → U2 | U2 の claude フック配線・投影形式は U1 マトリクスの claude 行(trigger 語彙・root 解決)が確定条件(requirements FR-1、components.md C9) |
| U2 → U3 | 残面投影は U2 で確立した投影骨格(per-harness projector の枠、ADR-5)と移設済み engine のパスを前提にする |
| U3 → U4 | 残面のフック snippet は U3 の投影生成物に含まれる(component-methods.md C3/C4 — 投影なしに配線対象がない) |
| U2 → U5 | doctor 行は C1 CLI(U2 で新設)の diagnosePlugins 到達経路を表示する |
| U2 → U6 | activation policy は compose 済み plugin stage の存在(U2 の統合経路)を前提に `--single` 撤廃を実装する |
| U4/U5/U6 → U7 | 適合テストは投影・trigger・doctor・activation の実装確定後に層別で固定(先行するとテストが仕様を先取りする) |
| U7 → U8 | docs は実装+テストで確定した手順のみを記載(先行すると偽装文書化 — scope-document シーケンス根拠) |

## 並行性の注記

U3・U5・U6 は U2 着地後に相互非依存で並行可能(worktree 分離、ファイル交差は着手前に実 diff で判定 — c6)。U4 のみ U3 の投影生成物に依存して直列。クリティカルパス: U1 → U2 → U3 → U4 → U7 → U8。

## テキストフォールバック(DAG の文章表現)

U1(マトリクス)が起点。U2(walking skeleton、単独ゲート)が全実装の骨格。U2 の後に U3(全投影)・U5(doctor)・U6(activation)が並行、U4(残フック)は U3 の後。U7(適合テスト)は U4/U5/U6 の合流点、U8(docs)が最終。循環なし(全エッジが番号昇順方向)。
