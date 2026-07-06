# Initiative Brief — 260706-harness-codex（Issue #552）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[scope-document.md](../scope-definition/scope-document.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)。

## イニシアチブ概要

core / harness / dist 三層化（Issue #552）のうち、本 Intent は (a) 三層化全体の設計確定と (b) Phase 1 = `harness/codex/` の新設 + 上流 openai.yaml 群の適応取り込みを実施する。Phase 2（core/ 一本化 + build 化）は設計確定成果物を添えて後続 Intent へ切り出す。

## Ideation の到達点

- **設計確定（中核成果、feasibility）**: 設計論点 6 問を全メンバー同報ピア協議で 5/5 全員一致確定。Q1=A（core 直下 + 拡張分同居）、Q2=A（実体コピー正 + symlink 配線規則化）、Q3=A（Phase 1 は tooling 不変）、Q4=A（粒度制約は Phase 2 で CI 検証へ）、Q5=A（Phase 分割）、Q6=B（openai.yaml は source skills + 既存 promote、harness/codex は契約 + provenance）。
- **スコープ確定（scope-definition）**: Phase 1 実装 3 点（harness/codex 2 文書、上流対応 skill への openai.yaml、promote 昇格）+ 検証。境界細部 2 問（上流対応 skill のみ、README + provenance のみ）確定。
- **実現可能性（feasibility-assessment）**: ブロッカーなし。実測裏取り 3 件（promote の agents 許可、parity checkSkills の範囲、仮置き実測）。
- **接触面**: engineer3（#554）非接触確定。engineer1（bug 束ね）非接触。

## Inception / Construction への引き継ぎ

- Inception: requirements-analysis で backlog P1-1〜P1-6 と受け入れ条件（openai.yaml が parity / 言語方針の検査対象に乗らないこと = engineer5 提案を含む）を要求化する。
- Construction: 実装は rename 契約（C-2）、純正性検証（C-3 = fresh clone + provenance 照合）、既存 promote 経路（設計確定 Q6）に従う。
- Phase 2 の起案材料: feasibility-questions.md（設計確定）+ intent-backlog.md の後続候補表 + 本 brief。

## 承認状態

Intent 承認（ディスパッチ、Maintainer 2026-07-06 14:42 JST）済み。各 stage gate は auto 委任経路（人間 → leader → engineer4）で承認済み（intent-capture、feasibility、scope-definition。market-research / team-formation / rough-mockups は条件不成立 skip）。
