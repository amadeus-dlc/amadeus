# Units of Work — Dependency

Intent: 260818-priority-bug-batch-4(2 unit)

上流: `../application-design/component-dependency.md`(依存マトリクスと共有リソース)、`unit-of-work.md`(unit 定義)。

## 依存 DAG

論理依存(「A の成果を B が消費する」)は **0 本** — 両 unit は互いの成果物・契約・台帳を消費しない。トポロジ上は並行開発可能(有効なトポロジカル順序が 2 通り存在)。

## 統合点

- 共有ファイル: `packages/framework/core/tools/amadeus-orchestrate.ts`(U1 = emit 境界 :3918-:4106/:4294 系、U2 = settle 台帳 :2475-:2556/:4686-:4711 系 — 関数単位で非交差)。**論理依存ではなくファイル競合**であり、実装の直列化(またはレーン分離)の経済判断は delivery-planning が行う
- 共有台帳: model-map ハッシュピン / coverage-patch-allowlist / coverage-registry — 両 unit の PR がそれぞれ resync(後続 PR は rebase 後に再 resync)
- API・イベント・共有データの機能的統合点: なし(U1 は dispatch 面、U2 は settle 面で、間に指令ループの既存境界が挟まる)

## 並行開発の機会

{U1, U2} は依存 0 のため並行可能な集合。ただし共有ファイル競合(上記)により、並行実装する場合は worktree 分離 + 後着 rebase のコストが乗る — 選択は delivery-planning。

```yaml
units:
  - name: issue-2837-invoke-swarm-context
    kind: library
    depends_on: []
  - name: issue-3106-per-unit-outcome
    kind: library
    depends_on: []
```
