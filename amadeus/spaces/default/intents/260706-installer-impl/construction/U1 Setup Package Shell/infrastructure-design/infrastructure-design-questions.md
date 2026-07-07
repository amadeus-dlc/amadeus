# Infrastructure Design Questions — U1 Setup Package Shell

> Stage: construction / infrastructure-design  
> Unit: U1 Setup Package Shell

## Questions

### Q1. U1にクラウド/ホスト型インフラを導入するか

[Answer]: No. U1はlocal CLI/package shellであり、cloud compute、database、cache、queue、load balancer、hosted monitoringは不要。Infrastructure Designはnpm package boundary、GitHub Actions gate、release dry-run/package dry-run evidence、CLI smoke executionに限定する。

## Ambiguity Analysis

曖昧な回答はない。`logical-components.md` と `services.md` が、U1には長期稼働backend serviceやAWS runtime infrastructureがないことを明示している。

矛盾はない。`performance-design.md` はthin startup pathを要求し、`security-design.md` はwrapper/parser/package contents controlsを要求し、`scalability-design.md` はstateless processを要求し、`reliability-design.md` はclassified exitsとno-writeを要求している。`components.md` と `business-logic-model.md` は `packages/setup/` のpackage shellとしてU1を定義している。

不足情報はない。具体的なGitHub Actions workflowやpackage scriptsはU7/U8/code-generationが所有するが、U1 Infrastructure Designはそれらに渡すpackage boundaryとCI evidenceの責務を定義する。

## Upstream Coverage

- `performance-design.md`: startup/help/error pathをhosted serviceなしで扱う。
- `security-design.md`: wrapper delegation、parser validation、package contents controlを対象にする。
- `scalability-design.md`: stateless process、no daemon、package size disciplineを反映する。
- `reliability-design.md`: classified exit、no-write、stdout/stderr stabilityを反映する。
- `logical-components.md`: npm bin wrapper、Bun entrypoint、parser、renderers、package metadata checkerを前提にする。
- `components.md`: `packages/setup/` package shellとPackage Checkを対象にする。
- `services.md`: no backend service、GitHub Actions PR gates、manual release workflow boundaryを反映する。
- `business-logic-model.md`: Startup、Command Parsing、Help、Delegation workflowsを反映する。
