# Functional Design Questions — population-interval-accounting

## Interaction mode

- Mode: Guide me
- Decision: `auto-decision-d32232d75463e2c79834b61ebcb66e9a`
- Intent autonomy: semi

## Questions and answers

追加質問は0件。上流の `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` が半開区間、同一intent/stage filter、idle差引、category/global union、candidate単位disposition、population-wide invariantとUnit境界を一意に固定している。

## Evidence

- FR-INT-1〜4がclip、idle差引、category union、global residual恒等式を規定する。
- FR-EVT-3/5が同一intentへの帰属とpost-accounting reasonを規定する。
- C-04 method contractがpure primitiveと単一`accountAttributionPopulation`呼出しを固定する。
- U-03はevent decode、statistics、outlier、rendererを所有しない。
