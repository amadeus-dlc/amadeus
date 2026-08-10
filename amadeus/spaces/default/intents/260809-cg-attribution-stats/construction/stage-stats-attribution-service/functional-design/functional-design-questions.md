# Functional Design Questions — stage-stats-attribution-service

## Interaction mode

- Mode: Guide me
- Decision: `auto-decision-d32232d75463e2c79834b61ebcb66e9a`
- Intent autonomy: semi

## Questions and answers

追加質問は0件。上流の `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` がwindow eligibility、orchestration owner、statistics population、outlier、renderer parity、exit ladder、pipe、read-only、Issue完了条件1〜10を一意に固定している。

## Evidence

- C-01だけがC-03→C-04→C-05をorchestrateし、C-05はaccountingを再実行しない。
- FR-STAT-1〜2、FR-OUT-1〜4、FR-CLI-1〜2、FR-COMP-1、FR-TEST-1〜3がsemantic reportとservice boundaryを固定する。
- U-04のowned testsは既存t486/t487であり、provider Unitのpure testsへownershipを広げない。
