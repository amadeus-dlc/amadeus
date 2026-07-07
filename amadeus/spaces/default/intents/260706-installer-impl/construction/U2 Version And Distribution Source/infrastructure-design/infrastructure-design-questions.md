# Infrastructure Design Questions — U2 Version And Distribution Source

> Stage: construction / infrastructure-design  
> Unit: U2 Version And Distribution Source

## Questions

### Q1. U2に永続キャッシュや認証付きGitHubアクセスを導入するか

[Answer]: No. First releaseではpublic canonical repositoryからtag/archiveを取得し、per-invocation temp directoryで処理する。persistent cache、GitHub token、offline bundled cache、hosted source mirrorは導入しない。

## Ambiguity Analysis

曖昧な回答はない。`scalability-design.md` はpersistent cacheなし、`security-design.md` はcanonical repoとarchive containment、`services.md` はGitHub tag/archive sourceを外部service contractとして定義している。

矛盾はない。`performance-design.md` はreal GitHub network latencyをdeterministic gatesから除外し、`reliability-design.md` はadapter-owned retryとclassified failureを要求している。U2はtarget projectへ書かない。

不足情報はない。具体的なGitHub API/archive URL implementationとscanner/fixture commandはcode-generation/build-and-testが所有する。

## Upstream Coverage

- `performance-design.md`: fake ports/local fixturesで測定する方針を反映する。
- `security-design.md`: canonical repo、archive containment、metadata validation、no target writesを反映する。
- `scalability-design.md`: no cache、selected harness extraction、per-invocation temp dirsを反映する。
- `reliability-design.md`: retry ownership、classified failures、cleanup diagnosticsを反映する。
- `logical-components.md`: TagSourcePort、ArchiveSourcePort、ArchiveExtractorPort、Temp Directory Managerを前提にする。
- `components.md`: Version Resolver、GitHub Archive Adapter、Archive Extractor、Distribution Metadata Readerを対象にする。
- `services.md`: GitHub Tag/Archive Source external contractを反映する。
- `business-logic-model.md`: Default/Explicit Version Resolution、Archive Loading、Source Metadata Reading workflowsを反映する。
