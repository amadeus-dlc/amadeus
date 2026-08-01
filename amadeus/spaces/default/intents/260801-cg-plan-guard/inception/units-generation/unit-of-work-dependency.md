# Unit of Work Dependency — 260801-cg-plan-guard

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

- 依存方向は `component-dependency.md` の層構造(判定入力の信頼化 → 発行側 → 実績側 → docs)を転記した。`requirements.md` の NFR-1(誤発動ゼロ)により、U1 の判別子確立が全ガードの前提。
- U2→U3 の canonical 消費関係は `decisions.md` ADR-4(guardMessage 1定義)と `component-methods.md` の guardMessage シグネチャに由来。同一ファイル交差の判定は `services.md` / `components.md` のモジュール割当(orchestrate に C1/C6 同居)から導出。

## 依存の根拠

- **U1 → U2**: U2 の violation/ok 判定は U1 の `bolt_dag_absence` 判別子を消費(absent/malformed と「units 無し scope」の区別なしには誤発動する)。
- **U2 → U3**: U3 の3部メッセージは U2 の `guardMessage` canonical を消費(cross-unit-note-canonical-reference — 独立再定義禁止)。同一ファイル(amadeus-orchestrate.ts)交差のため直列が安全側。
- **U3 → U4**: docs は実装確定後の記述(挙動が確定しない段階の docs は陳腐化する)。

## 直列編成の理由記録(本 intent 自身のガード要件との整合)

全 unit 直列(並行幅 1)。理由: (1) U1→U2→U3 は真の判定入力依存+同一ファイル交差(c6) (2) U4 は記述依存。**bolt-plan 段でもこの直列を維持する — 本 intent が導入するガード自身の「正当直列」corpus 実例となる**(delivery-planning に理由記録を残す本規範の自己適用)。

## 機械可読 DAG(required-sections センサー要求様式)

```yaml
units:
  - name: dag-integrity
    depends_on: []
  - name: issuance-guard
    depends_on: [dag-integrity]
  - name: approve-reconciliation
    depends_on: [issuance-guard]
  - name: docs-sync
    depends_on: [approve-reconciliation]
```
