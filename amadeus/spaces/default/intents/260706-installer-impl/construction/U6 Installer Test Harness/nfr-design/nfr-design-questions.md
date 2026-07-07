# NFR Design Questions — U6 Installer Test Harness

> Stage: construction / nfr-design  
> Unit: U6 Installer Test Harness

## Questions

### Q1. U6で追加のNFR設計判断が必要か

[Answer]: No additional questions. U6のNFR RequirementsとFunctional Designで、Bun/TypeScript test runner、typed fixture builders、fake ports、isolated temp targets、snapshot normalizers、coverage registry、ratchet checks、smoke commands が固定済みであるため、追加のユーザー判断は不要。

## Ambiguity Analysis

曖昧な回答はない。U6はテストハーネスとfixtureを設計し、runtime installer behavior、live GitHub integration、npm publication、real user project mutation、release workflow fan-out は所有しない。

矛盾はない。`performance-requirements.md` はfull suite/subset/smoke/registryの時間budgetを要求し、`security-requirements.md` はfake external dependenciesとtemp filesystem isolationを要求し、`scalability-requirements.md` はtyped buildersとmachine-readable registryを要求し、`reliability-requirements.md` はdeterministic evidenceとflake preventionを要求している。`tech-stack-decisions.md` と `business-logic-model.md` はBun test runner、fake ports、coverage registry workflow、fixture workflowを定義しており、設計方針と一致する。

不足情報はない。具体的な package script names と file paths は code-generation / build-and-test が所有するが、U6はU7 CIが独立に呼べる command surface とテスト品質条件を定義する。

## Upstream Coverage

- `performance-requirements.md`: full suite、unit subset、integration subset、smoke、registry/ratchet budgets を確認した。
- `security-requirements.md`: no live network、no real project mutation、snapshot normalization、secret-safe output、no-write coverage を確認した。
- `scalability-requirements.md`: 100 mappings、250 test cases、2,000 temp files、500 tags、40 snapshots、10 smoke commands を確認した。
- `reliability-requirements.md`: deterministic fake ports、temp target states、no-write mutation tests、coverage freshness、flake prevention を確認した。
- `tech-stack-decisions.md`: Bun test runner、typed builders、fake ports、isolated temp dirs、coverage registry/ratchet を確認した。
- `business-logic-model.md`: test layers、fixture workflow、coverage registry workflow、failure modes、integration boundaries を確認した。
