# Infrastructure Design Questions — U3 Target State And Manifest

> Stage: construction / infrastructure-design  
> Unit: U3 Target State And Manifest

## Questions

### Q1. U3にtarget監視・daemon・manifest修復インフラを導入するか

[Answer]: No. U3はread-only target readerであり、manifest path、fixed sentinel paths、expected file pathsだけを読む。filesystem watcher、daemon、target lock、manifest repair、recursive scan、hosted monitoringは導入しない。

## Ambiguity Analysis

曖昧な回答はない。`security-design.md` はU3がtargetを書かない境界であることを定義し、`business-logic-model.md` はmanifest write sequencingをU5 apply後のApplication Service所有としている。

矛盾はない。`performance-design.md` はbounded read、`scalability-design.md` はprocess-wide cacheなし、`reliability-design.md` はdeterministic classificationとunknown md5を要求している。Infrastructure Designはread-only filesystem portsとfixture evidenceに限定する。

不足情報はない。具体的な manifest schema implementation と fake filesystem fixtures は code-generation/build-and-test が所有する。

## Upstream Coverage

- `performance-design.md`: manifest/sentinel/expected-file bounded readを反映する。
- `security-design.md`: read-only ports、manifest validation、path policy、no content leakageを反映する。
- `scalability-design.md`: no shared mutable state、fixed sentinel sets、2,000 entries/filesを反映する。
- `reliability-design.md`: target states、fallback、unknown md5、diagnosticsを反映する。
- `logical-components.md`: TargetDetector、ManifestReader、SentinelDetector、TargetSnapshotBuilder、PathPolicyを前提にする。
- `components.md`: Target Detector、Manifest Store、Verifier boundariesを参照する。
- `services.md`: manifest write ownership and lifecycle characteristicsを反映する。
- `business-logic-model.md`: Detection、Snapshot、Manifest Write Contract workflowsを反映する。
