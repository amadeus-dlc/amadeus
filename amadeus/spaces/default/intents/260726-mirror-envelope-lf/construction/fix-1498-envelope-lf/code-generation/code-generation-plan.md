# Code Generation Plan — fix-1498-envelope-lf

上流入力(consumes 全数): requirements.md(FR-1〜FR-4 / NFR-1〜3 が設計契約。degrade 構成につき設計系成果物は非生成)。

- 対象: #1498(P1/S2)、ブランチ `fix/1498-envelope-lf`(最新 origin/main 起点 — Kimi harness 込みの dist 14 パス同期が必須)
- 方式: regression-first — 実 gh 出力 fixture(scan-notes §5 採取素材)で赤固定 → FR-1(パーサ LF/CRLF 両対応)→ FR-2(findArgv の --slurp 廃止・1ページずつ、裁定 Q1=A)→ FR-3(fixture 実出力化+落ちる実証)
- 検証: typecheck / lint / t272 系 / dist:check / promote:self:check / フルスイート / lcov 追加行 0 / allowlist gateway ピン5件の更新(NFR-3)
- PR: 1本、日本語本文(機序訂正=bare LF 主因を明記)、Closes #1498、マージは人間承認
