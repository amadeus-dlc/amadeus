# Unit of Work Dependency — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

依存の導出元: component-dependency の追加エッジ(policy→executor/lifecycle、codec→reducer→executor)と unit-of-work の分割。U1(skeleton)が全 Unit の基盤 — component-methods が規定する gateway 4メソッドと policy の expectedProjectStatus、台帳最小形 — を提供する。境界外条件(gh subprocess・認証)は services のプロセス境界表に従い、全 Unit に共通適用される(依存エッジにはならない)。requirements の受入条件写像は unit-of-work / story-map 側が正。components / decisions の割付・ADR は各エッジの根拠列で引用する。

## 依存エッジ(parseBoltDag 用 YAML)

```yaml
units:
  - name: u1-project-sync-skeleton
    depends_on: []
  - name: u2-state-reconcile-hardening
    depends_on: [u1-project-sync-skeleton]
  - name: u3-lifecycle-integration
    depends_on: [u1-project-sync-skeleton, u2-state-reconcile-hardening]
  - name: u4-config-overrides-and-diagnostics
    depends_on: [u1-project-sync-skeleton, u2-state-reconcile-hardening]
  - name: u5-docs-and-distribution
    depends_on: [u3-lifecycle-integration, u4-config-overrides-and-diagnostics]
```

<!-- Text fallback: U1 が基盤(依存なし)。U2 は U1 に依存。U3 と U4 は U1・U2 に依存し相互には独立(並行可能)。U5 は U3・U4 の完了後(全 Unit の成果を docs・配布へ集約)。 -->

## 依存の根拠

| エッジ | 根拠 |
|---|---|
| U2 → U1 | reconcile は U1 の projectSync 台帳最小形・gateway メソッドを拡張する(codec/reducer の同一面) |
| U3 → U1, U2 | completion ゲート(FR-8)は U2 の per-Project receipt 完全形を判定材料にする。boundary 統合は U1 の同期ステップを呼ぶ |
| U4 → U1, U2 | config 完全形は U1 の最小 parse の一般化。診断(FR-9)は U2 の台帳と U1 の expectedProjectStatus を read-only 消費 |
| U3 ∥ U4 | 触る面が非交差(U3: lifecycle/executor の boundary 面 / U4: config+repair 面)— ファイル単位交差は executor で軽微に接触しうるため、並行時は着手前に対象ファイル目録の突き合わせで確認(cid:code-generation:c6) |
| U5 → U3, U4 | docs・契約・dist 再生成は全機能の最終形を反映する集約面 |

## トポロジー上の事実(delivery-planning への入力 — 順序推奨はしない)

本成果物はトポロジーのみを記述する。Bolt 番号の割当・実装順序・クリティカルパスの選定は 2.8 delivery-planning の経済的判断であり、ここでは行わない。delivery-planning が使える事実は次の3点のみ: (1) U1 は全 Unit の唯一の根(依存なし) (2) U3 と U4 は相互独立(依存エッジなし — 並行が可能かどうかの最終判断はファイル交差の実測を含め 2.8 以降) (3) U5 は U3・U4 の両方に依存する唯一の合流点。
