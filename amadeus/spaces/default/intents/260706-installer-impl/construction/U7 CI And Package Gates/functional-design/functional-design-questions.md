# Functional Design Questions — U7 CI And Package Gates

> Stage: construction / functional-design  
> Unit: U7 CI And Package Gates  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Decision

追加の人間質問は実施しない。U7 の範囲は `requirements.md` の FR-016、`unit-of-work.md` の U7 定義、`unit-of-work-story-map.md` の US-010、`components.md` の Package Check / Release Workflow Contract、`component-methods.md` の `checkPackageMetadata` / `ReleaseWorkflowContract`、`services.md` の GitHub Actions PR Gates で固定済みである。

## Fixed Answers

### Q1: U7 は publish まで所有するか

- [Answer]: A
- A. PR の blocking gate と package validation までを所有し、実際の publish は U8 Manual Release And Docs に渡す。

### Q2: installer-related PR の検出はどこで閉じるか

- [Answer]: A
- A. GitHub Actions の `paths` と repository-local detector の両方で表現し、手動実行時や reusable workflow でも同じ分類を使えるようにする。

### Q3: security scanner はこの stage で具体ツールまで固定するか

- [Answer]: A
- A. 具体 scanner 実装は NFR/CI Pipeline で差し替え可能にし、U7 では normalized adapter schema、allowlist path/schema、severity/reachability/verified 判定を固定する。

### Q4: vulnerability allowlist はどの粒度にするか

- [Answer]: A
- A. High/Critical のみ例外登録を許し、package, advisory id, affected range, reason, expiry, owner を必須にする。

## Ambiguity Analysis

曖昧さは残っていない。`requirements.md` は U7 の blocking gates を列挙し、`team.md` は coverage registry/ratchet と dist/self-install drift guard を quality gate として承認済みである。audit/OSV と secret scan の具体ツール名は上流で未固定だが、U7 では `packages/setup/src/maintainer/security-gate.ts` が受け取る normalized JSON schema と allowlist schema を固定し、scanner implementation はその schema を満たす adapter として扱う。U8 が `workflow_dispatch` release と publish を所有するため、U7 は publish 副作用を持たない。

## Upstream Coverage

- `unit-of-work.md`: U7 の primary boundary と traceability を採用する。
- `unit-of-work-story-map.md`: US-010 を主対象、US-001 / US-004 / US-009 / US-011 を supporting story として扱う。
- `requirements.md`: FR-016 を主契約、FR-001 / FR-003 / FR-017 / NFR-005 を補助契約として扱う。
- `components.md`: Package Check と Release Workflow Contract を CI gate の入力契約として使う。
- `component-methods.md`: `checkPackageMetadata` と `ReleaseWorkflowContract` を maintainer-facing method として具体化する。
- `services.md`: GitHub Actions PR Gates を外部サービス境界として扱う。
