# Tech Stack Decisions — guard-integration

`business-logic-model` と `business-rules` の既存境界を、`requirements` の FR-05〜FR-07・NFR-04、および brownfield の `technology-stack` に従って実装する。

## Decision: existing runtime

- TypeScript strict mode、ESM、Bun を維持し、新規 runtime dependency を追加しない。
- state、utility、orchestrate の既存 core tools と workspace lock/preflight を再利用する。
- typed rejection は判別 union とし、Parse, Don't Validate に従って strict status parser の証明を後続へ渡す。

## Decision: corpus verification

- `packages/framework/core/tools/**/*.ts` を source root とし、TypeScript AST/symbol graph で cursor write/delete、stage directive開始点、unpark marker mutation、registry status write の sink を抽出する。
- named import、re-export、direct wrapper call を public CLI root まで逆向きに追跡する。computed property、dynamic import、解決不能 alias、未分類 sink は fail closed とする。
- 6 harness 配布物と self-install tree は core から生成し、既存 dist/self-install drift guard と禁止旧 pattern scan で同期を検証する。
- analyzer の complexity guard は実 source 1倍と仮想path複製2倍を比較し、時間・peak RSS中央値の増加を各2.5倍以下、sink数を正確に2倍とする。

## Decision: CI and tests

- `bun install --frozen-lockfile` 後、既存 `bun run typecheck`、Biome lint、unit/integration test、coverage、dist/self-install drift を実行する。
- typecheck は repository の既存2つの tsconfig を対象とする。command 不在による exit 127 は実装失敗でなく bootstrap 不備として区別する。
- falling proof は selector、stale cursor `next`、`unpark` の3系統を持ち、修正前の赤と修正後の緑、目的 branch coverage、永続 bytes 不変を保存する。

## Alternatives rejected

- 新規 lock library: 既存 transaction/preflight 契約を分裂させるため不採用。
- `--force` や implicit unarchive: human-presence と archived guard を迂回するため不採用。
- harness ごとの手書き guard/corpus graph: core 正本との drift を作るため不採用。
- daemon、database、外部 observability backend: ローカル CLI の要求範囲を超えるため不採用。
