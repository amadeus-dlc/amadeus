# Unit Of Work

## Upstream Trace

この unit 分解は `components`, `component-methods`, `services`, `component-dependency`, `decisions`, `requirements` を根拠とする。`decisions` の推奨は staged mixed layout であり、full workspace normalization の即時実装ではない。

## Unit Definitions

| Unit | Description | Boundary | Deployment model | Complexity |
| --- | --- | --- | --- | --- |
| U1 Layout Decision Record | Issue #610 に対応する ADR または同等 design record を作成する | design/docs artifact。runtime code は含めない | documentation-only | M |
| U2 Contributor Documentation Update | README/docs/contributing guide に root framework zone と package-owned setup zone の違いを明文化する | public/contributor docs | documentation-only | M |
| U3 Guard Validation Plan | `dist:check`, `promote:self:check`, typecheck, lint, tests の維持方針を design record または docs に明記する | validation contract | documentation + command verification | S |
| U4 Follow-up Migration Preparation | 将来 full normalization を再検討する場合の source root abstraction / fixture abstraction issue を記録する | follow-up issue or backlog item | planning-only | S |

## Unit Responsibilities

### U1 Layout Decision Record

U1 は `decisions` の ADR-001 から ADR-004 を、repository に残る設計記録へ変換する。status quo、staged mixed layout、full workspace normalization、source root abstraction first の tradeoff を含める。

### U2 Contributor Documentation Update

U2 は root `core/`, `harness/`, `scripts/`, `dist/` が framework source/distribution contract であり、`packages/setup` は sibling package として別 intent で扱うことを docs に反映する。

### U3 Guard Validation Plan

U3 は layout decision が `dist:check` と `promote:self:check` を壊さないことを明文化し、必要に応じて validation command を実行して結果を記録する。

### U4 Follow-up Migration Preparation

U4 は full workspace normalization を将来行う場合の first safe slice を backlog 化する。候補は source root abstraction、test fixture abstraction、manifest contract seam である。

## Constraints

- `packages/setup` の実装は含めない。
- `dist/<harness>/` は手編集しない。
- directory move はこの unit set の必須作業に含めない。
- Markdown artifact は日本語で書く。path、CLI、file name は正確性を優先して保持する。
