# Practices Discovery — Evidence(260719-ballot-failclosed-amend)

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md

## 証跡スキャンの代用(practices-discovery:c1)

同日(2026-07-19)の RE diff-refresh(re-scans/260719-ballot-failclosed-amend.md、observed 6f2455c43)が CI・テスト・コードスタイル・配布境界のスキャン面をカバーしているため、これを証跡として代用する。独立の再スキャンは行わない。

## 実測証跡(RE 由来+本ステージ確認)

| 面 | 証跡(実測) | affirm 済みルールとの対応 |
| --- | --- | --- |
| テスト層 | 選挙テスト9ファイル実在(unit t234/t238/t239、integration t235/t236/t240/t242、e2e t237/t241)— tests/ 配下 Bun runner 4層 | Testing Posture(team.md)どおり |
| コードスタイル | scripts/amadeus-election-*.ts は TypeScript/ESM、判別 union Result(BallotError 等)採用 — Biome lint 対象(package.json lint スコープに scripts/ 含む) | Code Style(project.md functional-domain-modeling-ts / Tech Stack)どおり |
| 配布境界 | scripts/ は dist 投影 0件(git ls-files 実測)、SKILL.md のみ3面 | gh-scripts-boundary(project.md)の同区画運用どおり |
| CI | PR/CI 基準は typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci(project.md Testing Posture)— 本 intent は dist 非該当 | 既存 CI gate 不変 |
| 選挙運用 | election-cli-canonical(E-ETF-CANON)が CLI 指令ループを正本宣言済み — 本 intent はその CLI 自身の受理境界修正 | team.md 既決 |
