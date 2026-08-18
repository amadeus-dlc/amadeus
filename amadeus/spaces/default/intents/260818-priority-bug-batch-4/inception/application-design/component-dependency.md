# Application Design — Component Dependency

Intent: 260818-priority-bug-batch-4(depth Minimal)

上流: `../requirements-analysis/requirements.md`(Constraints — 共有ファイル直列化)、codekb `architecture.md` / `component-inventory.md` 本 intent 節(依存の現在形)。

## 依存マトリクス(変更対象間)

| 依存元 → 依存先 | 種類 | Unit |
|---|---|---|
| `amadeus-orchestrate.ts` → `amadeus-directive.ts` | directive 型・validator の消費 | U1 |
| conductor 面 7 面 → invoke-swarm directive | 契約文書(prose が payload を転記) | U1 |
| conductor 面 7 面 → `amadeus-swarm.ts` CLI | 手順が引数を渡す(batch は directive 転記へ) | U1 |
| `amadeus-swarm.ts` pool 台帳 → `--batch` 値 | durable 冪等鍵(unit-pool:<batch>:initial-enqueue) | U1 |
| `settlePerUnitOutcomes` → canonical construction outcome projection | cancelled/failed の観測源(read-only) | U2 |
| `readPerUnitConsumePopulation` → settle 台帳(audit 行) | reader(3値受理へ拡張) | U2 |
| `amadeus-per-unit-consume-fanout.ts` → population | 変更なし(KNOWN_OUTCOMES 既受理) | U2 |
| tests(t135/t113/t181/t533 + 新規) → 上記全面 | 契約固定 | 両 |

## 共有リソースと直列化(delivery-planning への引き渡し)

- **`packages/framework/core/tools/amadeus-orchestrate.ts` を両 unit が変更する**(U1: emit 境界 + join 面、U2: settle emitter/reader)。patch 面は関数単位では非交差(U1 = :3918-:4106/:4294 系、U2 = :2475-:2556/:4686-:4711 系)だが、同一ファイルのため**Bolt は直列実行**とする(並行 worktree での同時変更を作らない — requirements Constraints の確定)。
- 台帳 3 面(model-map ハッシュピン / coverage-patch-allowlist / coverage-registry)は**両 unit の PR がそれぞれ** resync を同梱する(先行 unit 着地後、後続 unit は rebase 後に再 resync)。
- record 同梱 PR の直列着地(intents.json 再構成 + uuid 一意性検査)は既存ノルムどおり。

## データフロー(方向)

U1: engine(batch 算出)→ directive(搬送)→ conductor 面(転記)→ swarm prepare(pool identity)— 一方向、逆流なし。
U2: solo skip/fail arm(BOLT_COMPLETED)→ canonical projection(観測)→ settle emitter(記録)→ settle 台帳 → population reader → fanout 診断 — 一方向。pool 経路の terminal は de-dup で優先(settle 由来を積まない)。

## 循環依存

なし(新規エッジはいずれも既存の一方向依存の内側。`amadeus-directive.ts` は orchestrate から消費される葉、projection は read-only 観測源)。
