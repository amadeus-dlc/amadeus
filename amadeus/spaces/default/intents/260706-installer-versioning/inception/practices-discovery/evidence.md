# Evidence — 260706-installer-versioning（Issue #543）

上流入力: repo 現物（実測）

| ID | 証拠 | 場所 |
|---|---|---|
| E-1 | `console.log('amadeus-install: installing into ...')`（509 行）、`runStep` の `[${n}/5] ${label.padEnd(14)}`（489 行） | scripts/amadeus-install.ts |
| E-2 | `process.stderr.write(\`  fix: ${fix}\n\`)`（497 行）、InstallError の fix フィールド | scripts/amadeus-install.ts |
| E-3 | installer eval は mkdtemp で隔離 workspace を作成し finally で削除 | dev-scripts/evals/installer/check.ts |
| E-4 | eval に再実行（冪等）検査の assertion 群（FR-2.3 系） | dev-scripts/evals/installer/check.ts |
| E-5 | 「aidlc/（現 amadeus/）はインストーラの不可侵領域」 | #451 の確定・AMADEUS.md |
| E-6 | sha256 実装（createHash("sha256")、37〜38 行） | dev-scripts/generate-parity-baseline.ts |
| E-7 | dev-scripts の TDD 必須（RED → GREEN → REFACTOR） | .agents/rules/dev-scripts.md |
