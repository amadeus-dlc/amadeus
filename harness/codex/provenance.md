# harness/codex provenance — 上流取り込みの記録

この文書は、上流 dist/codex の skill 別 `agents/openai.yaml` 群の取り込み記録である（Issue #552 Phase 1、Intent 260706-harness-codex）。

## 取り込み元

- リポジトリ: awslabs/aidlc-workflows（上流）
- 基準 commit: `b67798c37c71855271b70882a33f47890d41f212`（parity-baseline の baselineCommit と同一）
- 取得方法: fresh clone + 基準 commit checkout（純正性検証 #541。2026-07-06 実施）

## 照合結果（A-1 検証）

- 上流 `dist/codex/.agents/skills/*/agents/openai.yaml` は 38 件。
- 38 件全件が同一内容（sha256 = `a1499d95abd8447558c535fe5554adcc3c9b988a0a39264a6283d430effe1e94`）で、内容は guard（`policy: allow_implicit_invocation: false`）のみ。相違なし。
- 上流の orchestrator skill（aidlc-workflows の bare 入口 skill。当方の amadeus 入口に対応）は openai.yaml を持たない（dist/codex の skill dir は 39、yaml は 38）。

## 適応規則

1. skill 名の写像: parity-map の skillNameMapping（prefix 規則 `aidlc-<x> → amadeus-<x>`）を機械適用し、当方 `skills/` の実在ディレクトリと交差した（個別対応表は使わない）。
2. 内容: 上流実体を正とする。guard 内容に旧名（aidlc / /aidlc）は含まれないため無変換で取り込み、冒頭に provenance コメント 4 行（取り込み元 path、基準 commit、写像、guard の意味）を付した。
3. 除外: 上流に対応のない amadeus 独自 skill（amadeus、amadeus-domain-modeling、amadeus-grilling、amadeus-validator）には付与しない。うち amadeus-grilling と amadeus-domain-modeling には skill-forge 由来の別形式 openai.yaml が既存し、これらには触れていない。amadeus（orchestrator）は上流の bare 入口 skill と同じく yaml 対象外。

## 写像表（38 件、全件取り込み対象）

| 上流 skill | 写像 | 判定 |
|---|---|---|
| aidlc-application-design | amadeus 側: amadeus-application-design | 取り込み対象 |
| aidlc-approval-handoff | amadeus 側: amadeus-approval-handoff | 取り込み対象 |
| aidlc-bugfix | amadeus 側: amadeus-bugfix | 取り込み対象 |
| aidlc-build-and-test | amadeus 側: amadeus-build-and-test | 取り込み対象 |
| aidlc-ci-pipeline | amadeus 側: amadeus-ci-pipeline | 取り込み対象 |
| aidlc-code-generation | amadeus 側: amadeus-code-generation | 取り込み対象 |
| aidlc-compose | amadeus 側: amadeus-compose | 取り込み対象 |
| aidlc-delivery-planning | amadeus 側: amadeus-delivery-planning | 取り込み対象 |
| aidlc-deployment-execution | amadeus 側: amadeus-deployment-execution | 取り込み対象 |
| aidlc-deployment-pipeline | amadeus 側: amadeus-deployment-pipeline | 取り込み対象 |
| aidlc-environment-provisioning | amadeus 側: amadeus-environment-provisioning | 取り込み対象 |
| aidlc-feasibility | amadeus 側: amadeus-feasibility | 取り込み対象 |
| aidlc-feature | amadeus 側: amadeus-feature | 取り込み対象 |
| aidlc-feedback-optimization | amadeus 側: amadeus-feedback-optimization | 取り込み対象 |
| aidlc-functional-design | amadeus 側: amadeus-functional-design | 取り込み対象 |
| aidlc-incident-response | amadeus 側: amadeus-incident-response | 取り込み対象 |
| aidlc-infrastructure-design | amadeus 側: amadeus-infrastructure-design | 取り込み対象 |
| aidlc-init | amadeus 側: amadeus-init | 取り込み対象 |
| aidlc-intent-capture | amadeus 側: amadeus-intent-capture | 取り込み対象 |
| aidlc-market-research | amadeus 側: amadeus-market-research | 取り込み対象 |
| aidlc-mvp | amadeus 側: amadeus-mvp | 取り込み対象 |
| aidlc-nfr-design | amadeus 側: amadeus-nfr-design | 取り込み対象 |
| aidlc-nfr-requirements | amadeus 側: amadeus-nfr-requirements | 取り込み対象 |
| aidlc-observability-setup | amadeus 側: amadeus-observability-setup | 取り込み対象 |
| aidlc-outcomes-pack | amadeus 側: amadeus-outcomes-pack | 取り込み対象 |
| aidlc-performance-validation | amadeus 側: amadeus-performance-validation | 取り込み対象 |
| aidlc-practices-discovery | amadeus 側: amadeus-practices-discovery | 取り込み対象 |
| aidlc-refined-mockups | amadeus 側: amadeus-refined-mockups | 取り込み対象 |
| aidlc-replay | amadeus 側: amadeus-replay | 取り込み対象 |
| aidlc-requirements-analysis | amadeus 側: amadeus-requirements-analysis | 取り込み対象 |
| aidlc-reverse-engineering | amadeus 側: amadeus-reverse-engineering | 取り込み対象 |
| aidlc-rough-mockups | amadeus 側: amadeus-rough-mockups | 取り込み対象 |
| aidlc-scope-definition | amadeus 側: amadeus-scope-definition | 取り込み対象 |
| aidlc-security-patch | amadeus 側: amadeus-security-patch | 取り込み対象 |
| aidlc-session-cost | amadeus 側: amadeus-session-cost | 取り込み対象 |
| aidlc-team-formation | amadeus 側: amadeus-team-formation | 取り込み対象 |
| aidlc-units-generation | amadeus 側: amadeus-units-generation | 取り込み対象 |
| aidlc-user-stories | amadeus 側: amadeus-user-stories | 取り込み対象 |

## 再取り込み手順

1. `git clone https://github.com/awslabs/aidlc-workflows.git && git checkout <新基準 commit>`
2. `dist/codex/.agents/skills/*/agents/openai.yaml` を全列挙し、sha256 で内容の同一性を照合（相違があれば本文書へ記録）。
3. prefix 規則を機械適用して写像表を再生成し、本文書の表と基準 commit を更新。
4. 取り込み対象の `skills/amadeus-*/agents/openai.yaml` を上流実体 + provenance コメント 4 行で更新。
5. 対象 skill を `bun run dev-scripts/promote-skill.ts <skill> --replace` で 1 件ずつ昇格し、`npm run test:it:promote-skill` と `npm run test:all` を実行。

Phase 2（build.ts 化）でこの手順は「生成物の再生成 CI 検証」へ置き換わる予定（README.md を参照）。
