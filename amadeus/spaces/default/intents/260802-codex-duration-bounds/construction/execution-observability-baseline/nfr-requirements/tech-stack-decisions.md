# Tech Stack Decisions — execution-observability-baseline

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 技術選定

`technology-stack.md` の現行Bun-only TypeScript monorepo、vendored OpenTelemetry、JSONL audit、fast-check、package/promote生成系を維持する。`business-logic-model.md` のC2 single-writerと `business-rules.md` の共有core所有規則を実装境界とし、[Issue #1602](https://github.com/amadeus-dlc/amadeus/issues/1602) のための独立serviceやCodex専用gateを追加しない。

| Decision | Selection | Rationale／Constraint |
|---|---|---|
| Runtime／language | Bun 1.3.13、TypeScript strict、ESM | 既存build／test／distributionと一致。Node専用daemonを追加しない |
| Canonical store | 既存per-clone JSONL audit＋mkdir lock | durable正本を増やさず、既存recovery／version controlへ統合 |
| Domain model | 判別union、opaque branded ID、versioned canonical key material | availability／outcome／terminationをtotalにし、parse-don't-validateを維持 |
| Monotonic clock | injectable Clock、productionは`performance.now()`、wall timestampは`Date.now()`を分離 | 既存Bun実測様式を再利用し、fake clockで境界を決定的に検証 |
| ID generation | C2内の注入可能なcryptographic opaque ID generator | adapter生成とcontent-derived IDを禁止し、testではdeterministic generatorを注入 |
| Projection | pure reducer＋streaming JSONL reader/writer | state/runtime/baseline manifestをauditからO(E)で再構築 |
| Telemetry | 既存vendored OTel API／local exporter、best-effort | 新規SDK／collector依存なし。canonical IDとdurationを同じschemaへ写像 |
| Testing | `bun test`、fast-check、fake clock／writer／sink／executor | live modelとsleepに依存せず、crash／idempotency／availabilityを再現 |
| Benchmark | 既存protocolのwarmup 3回＋測定20回、median／p95 | repository内で確立済みの方式を再利用し、baseline前の閾値捏造を避ける |
| Distribution | `scripts/package.ts`で7 harness、`promote-self.ts`で影響する5 self-install面を生成 | 正本以外を直接編集せず、drift guardをblockingにする |

## 配置と依存方向

- identity、measurement、availability、termination schemaは `packages/framework/core/` のdeep moduleに置き、harness adapterはnative fact変換だけを実装する。
- lifecycle mutationはC2相当のcoordinatorへ集中させる。projection、OTel、adapterからcanonical auditを逆更新しない。
- harness固有実装は `packages/framework/harness/<name>/` に閉じ、共有predicate、hard cap、termination semanticsを複製しない。
- `dist/` とpromoted root treeは生成物であり直接編集しない。正本変更後にpackage／promoteを実行する。
- baseline evidenceはactive intent recordの `construction/execution-observability-baseline/evidence/baseline-manifest.json` へ投影する。

## Rejected Alternatives と Quality Gates

| Alternative | Rejection reason |
|---|---|
| 外部database／常駐telemetry service | 短命CLIモデルに不要で、failure／credential／運用境界を増やす |
| adapter別ID・clock・termination policy | FR-06の共有core単一所有とharness conformanceを破る |
| Codex専用blocking gate | Codex固有で共有predicateへ写像不能な再現証拠がなく、要件FR-06.6に反する |
| wall clockだけのduration | clock調整で負durationを生み、FR-01.9／10を満たせない |
| baseline前の絶対ms gate | provider／host差を根拠なく固定し、NFR-04／FR-08.3に反する |
| 新規runtime dependency | 既存Bun／OTel／fast-checkで実装・検証可能で、配布面のriskだけを増やす |

Blocking検証は `bun run typecheck`、`bun run lint`、関連unit/integration/property test、`bun scripts/package.ts --check`、`bun run promote:self:check`、全supported harness capability matrixとする。Markdown成果物のlinter/type-checkはcode snippetがないため非該当だが、required-sections、upstream-coverage、answer-evidenceは適用する。
