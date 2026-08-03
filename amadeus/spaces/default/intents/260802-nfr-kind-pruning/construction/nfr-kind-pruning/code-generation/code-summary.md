# コード生成サマリー — nfr-kind-pruning

## 実装結果

- `units-generation` の計画承認、Unit定義、YAML、完了要約、sensor説明に、5種の正準kindと新規producerでの必須契約を追加した。
- `required-sections` sensorは、共有parserが成功したDAGのkind欠落Unitを `missing_unit_kinds` で返し、exit 0の `pass: false` として観測可能にした。不正kindは既存parserの `edge_block: malformed` を維持した。
- orchestratorのconsume解決にUnit kindを渡し、consume元producerの既存 `produces_kinds` と `requiredArtifactsForUnit` で非適用入力を除外した。`consumes_kinds`、library特例、新規kind語彙は追加していない。
- NFR RequirementsとNFR Designのstage契約を、directiveのapplicable outputsとpresent consumesに限定し、既決内容の `file:line` 参照、1行の非適用理由、pruned placeholder禁止へ同期した。
- `cid:nfr-design:c1-engine-produces-all-five` の1項だけを、既知kindはpruning、kindless legacyは全5成果物fallbackという条件付き表現へ訂正した。

## 変更ファイル

手書き正本とテスト:

- `packages/framework/core/amadeus-common/stages/inception/units-generation.md`
- `packages/framework/core/amadeus-common/stages/construction/nfr-requirements.md`
- `packages/framework/core/amadeus-common/stages/construction/nfr-design.md`
- `packages/framework/core/tools/amadeus-sensor-required-sections.ts`
- `packages/framework/core/sensors/amadeus-required-sections.md`
- `packages/framework/core/tools/amadeus-orchestrate.ts`
- `tests/unit/t133-bolt-dag-compile.test.ts`
- `tests/unit/t248-stage-contract.test.ts`
- `tests/integration/t248-stage-contract-routing.test.ts`
- `tests/e2e/t416-nfr-kind-pruning.test.ts`
- `tests/.coverage-registry.json`
- `tests/.coverage-ratchet.json`
- `amadeus/spaces/default/memory/project.md`

`bun scripts/package.ts` と `bun run promote:self` により、7 harnessの `dist/` 配布面とproject-local harness面へ正本変更を生成同期した。生成物は直接編集していない。

## 主な判断

- producer適用性の唯一の正本は既存 `produces_kinds` のままとし、consumeにも同じ判定関数を投影した。
- kind省略は新規producer gateで拒否する一方、runtimeではUnit単位のfull matrix fallbackを維持した。不正kind・不正Unit集合・runtime graph欠落はkind map全体を破棄する既存の安全側挙動を維持した。
- `tech-stack-decisions` optional化、scope-grid、functional-design mapは変更していない。

## テストと検証

- 赤の実証: 実装前focused 3 suitesは exit 1、`73 pass / 15 fail`。sensor kind欠落、consume投影、3 stage正本契約が失敗することを確認した。
- `bun test --timeout 120000 tests/unit/t133-bolt-dag-compile.test.ts tests/unit/t248-stage-contract.test.ts tests/integration/t248-stage-contract-routing.test.ts` — exit 0、`88 pass / 0 fail`。
- `bun run lint` — exit 0。既知baselineのcomplexity等 `386 warnings / 23 infos`、errorなし。
- `bun run typecheck` — exit 0。初回は環境の `tsc: command not found` でexit 127だったため、`bun install --frozen-lockfile` で依存を復元して再実行した。
- `bun scripts/package.ts` — exit 0。
- `bun run promote:self` — exit 0。
- `bun scripts/package.ts --check` — exit 0、7 harnessすべてOK。
- `bun run promote:self:check` — exit 0。
- `git diff --check` — exit 0。
- `bun test --timeout 120000 tests/e2e/t416-nfr-kind-pruning.test.ts` — exit 0、`1 pass / 0 fail`。packaged Codex harness上でlibrary UnitがNFR Requirements 2件を生成し、NFR Designへ3入力・2出力で進み、両stageのartifact guardを通過することを確認した。
- `bun run test:ci -- --verbose` — smoke・unitとintegrationの対象コードは成功。共有CPU上で既知のheavy integration `t-team-up-codex-resume.serial.test.ts` だけが15秒制限を超過した。
- `bun test --timeout 120000 tests/integration/t-team-up-codex-resume.serial.test.ts` — 単独再実行でexit 0、`57 pass / 0 fail`。AGENTS.mdの既知timeout手順に従い、CI失敗がコード回帰ではないことを確認した。
- 初回全CIで検出したcoverage registry drift、sensor complexity、unit層test-size purityは、レジストリ再生成、kind検査helper抽出、file-I/O assertionsのintegration層移動で解消し、各guardを再実行してgreenを確認した。

## Plan逸脱と保全状況

- Architecture Review iteration 1の指摘に従い、full CIとpackaged E2EをCode Generation内へ前倒しした。要件を狭めず検証を強化する変更であり、実装scopeの逸脱はない。
- project-local生成面の同期に必要な `bun run promote:self` を正本生成の後に実行した。
- `.codex/tools/data/stage-graph.json` の既存 `formal-model-check` plugin nodeは、promotionのcomposition-ledger mergeにより保全され、実行前後のgit diffが同一であることを確認した。
- `.codex/.amadeus-plugin-*`、`.codex/.amadeus-plugin-src/`、`.codex/plugins/`、`.codex/skills/` は削除・上書き・revertしていない。その他の既存codekb・intent registry変更にも触れていない。
