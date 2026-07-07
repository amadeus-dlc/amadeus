# NFR Design Questions — U3 Target State And Manifest

> Stage: construction / nfr-design  
> Unit: U3 Target State And Manifest

## Questions

### Q1. U3で追加のNFR設計判断が必要か

[Answer]: No additional questions. U3のNFR RequirementsとFunctional Designで、manifest-first detection、sentinel fallback、ambiguous harness、read-only snapshot、unknown md5、no-write boundary が固定済みであるため、追加のユーザー判断は不要。

## Ambiguity Analysis

曖昧な回答はない。U3の判断は既存成果物により固定されている。

矛盾はない。`performance-requirements.md` は bounded read を要求し、`security-requirements.md` は read-only trust boundary を要求し、`scalability-requirements.md` は full workspace traversal を禁止し、`reliability-requirements.md` は deterministic classification と unknown md5 表現を要求している。`tech-stack-decisions.md` と `business-logic-model.md` は `FileSystemPort` / `ManifestStorePort` / `PromptPort` による境界を定義しており、設計方針と一致する。

不足情報はない。実装時の詳細は、manifest schema validator の実装方法、sentinel path table、snapshot fixture、fake filesystem assertions として code-generation / testing で具体化する。

## Upstream Coverage

- `performance-requirements.md`: bounded detection/snapshot performance targets を設計質問なしの前提にした。
- `security-requirements.md`: manifest validation、path normalization、no content leakage の判断を確認した。
- `scalability-requirements.md`: 2,000 entries/files と no recursive scan の制約を確認した。
- `reliability-requirements.md`: deterministic target states、invalid manifest fallback、unknown md5 を確認した。
- `tech-stack-decisions.md`: TypeScript/Bun、ports、schema validation、md5 hashing の選択を確認した。
- `business-logic-model.md`: manifest-first detection、sentinel fallback、snapshot workflow、manifest write ownership を確認した。
