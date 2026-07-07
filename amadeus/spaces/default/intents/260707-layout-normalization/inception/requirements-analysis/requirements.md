# Requirements

## Intent Analysis

この要求分析は `intent-statement` と `scope-document` を上流入力とし、GitHub issue #610 の repository layout decision を後続設計へ渡すために作成する。目的は、Amadeus の root-level `core/`, `harness/`, `dist/`, `scripts/` を維持するのか、`packages/setup` と並行する staged layout を続けるのか、または `packages/<name>/{core,harness,dist,scripts}` のような full workspace normalization へ進むのかを、根拠付きで判断できる状態にすることである。

この intent は runtime feature 追加ではない。`business-overview` が示す通り、Amadeus は one-core-many-harnesses の framework repository であり、今回の成果は layout decision、path impact、migration/no-migration rationale、guard preservation の明確化である。

## Functional Requirements

### FR-1: Layout candidates must be compared

設計成果物は、最低限次の候補を比較しなければならない。

- status quo: root-level `core/`, `harness/`, `dist/`, `scripts/` を維持する。
- staged mixed layout: framework source は root-level に残し、`packages/setup` などの package-owned 領域だけを別 intent として進める。
- full workspace normalization: `packages/<name>/{core,harness,dist,scripts}` 形式へ framework 側も寄せる。
- reverse engineering で見つかった低リスク variant。例: source root abstraction を先に導入し、directory move は後続に分ける案。

合否基準: Application Design または ADR/設計記録に、各候補の利点、欠点、変更範囲、release/drift guard への影響が記載されている。

### FR-2: Path impact inventory must be traceable

設計成果物は `code-structure` と `architecture` の棚卸しを根拠に、次の path impact を明示しなければならない。

- `scripts/package.ts`
- `scripts/promote-self.ts`
- `scripts/manifest-types.ts`
- `harness/*/manifest.ts`
- `harness/codex/emit.ts`
- `dist/*`
- `.claude/`, `.codex/`, `.agents`
- README と docs
- tests, fixtures, coverage registry, docs legacy gates
- `.github/workflows/ci.yml`

合否基準: 各領域について、維持する場合の理由または変更する場合の migration impact が書かれている。

### FR-3: Release and drift guards must be preserved

layout decision は `team-practices` に従い、`dist:check` と `promote:self:check` を第一級の guard として扱わなければならない。実装へ進む場合は、`bun run typecheck`, `bun run lint`, relevant `tests/run-tests.sh` profile も validation plan に含める。

合否基準: migration plan または no-migration rationale が、`dist:check` と `promote:self:check` を壊さない理由を説明している。

### FR-4: `packages/setup` must remain a sibling intent dependency

この intent は `packages/setup` の実装を吸収してはならない。`packages/setup` は別 intent の sibling dependency として扱い、layout comparison の文脈に限定して参照する。

合否基準: requirements, design, delivery plan のいずれにも `packages/setup` をこの intent の実装対象とする記述がない。

### FR-5: Decision outcome must support both migration and no-migration

設計成果物は migration を前提にしてはならない。full workspace normalization を選ぶ場合は staged migration plan を示す。migration しない場合は root-level `core/` / `harness/` が framework source boundary として妥当な理由を明文化する。

合否基準: 選択した結論に応じて、migration plan または no-migration rationale が issue #610 の acceptance criteria を満たしている。

### FR-6: Documentation impact must be explicit

layout decision は README、docs guide、contributing guide に対する影響を含めなければならない。`dist/` が public install source である限り、docs の install command と contributor mental model は design outcome と一致していなければならない。

合否基準: docs update が必要な場合、対象ファイルと更新方針が delivery plan に入っている。不要な場合は、なぜ現行 docs が正しいままかを説明している。

## Non-Functional Requirements

### NFR-1: Maintainability

layout decision は maintainer が source of truth、generated output、runtime install target を混同しない状態を保たなければならない。特に `core/`, `harness/`, `dist/`, `.claude/.codex/.agents` の責務境界を曖昧にしてはならない。

### NFR-2: Testability

各候補は検証可能でなければならない。migration を選ぶ場合、各 slice は `dist:check`, `promote:self:check`, typecheck, lint, relevant tests のいずれかで合否を確認できる必要がある。

### NFR-3: Reversibility

full workspace normalization を選ぶ場合でも、directory move と behavior change を同時に行わない。可能な限り、source root abstraction、docs update、test fixture update、actual move を分ける。

### NFR-4: Safety

`scripts/promote-self.ts` の preservation behavior、composed scopes、local settings、root `.claude/.codex/.agents` を破壊してはならない。self-install target の扱いは migration plan の明示項目とする。

### NFR-5: Documentation Quality

Markdown artifact は日本語で書く。path、CLI、コード識別子、machine-readable heading は正確性のため原文を保持してよい。

## Constraints

- `packages/setup` は別 intent で進める。
- 現 checkout には `packages/` directory が存在しないため、local filesystem evidence として扱わない。
- Bun、TypeScript、Biome、test runner、CI をこの intent で置き換えない。
- `dist/<harness>/` を手編集して layout decision を成立させない。
- UI mockups、market research、cloud infrastructure、deployment environment は対象外である。
- GitHub issue #610 への回答は、設計記録または同等 artifact で traceable にする。

## Assumptions

- `dist/` は現時点で generated output であると同時に public install source である。
- `scripts/package.ts` と `scripts/promote-self.ts` は root layout の主要な coupling point である。
- `.claude/`, `.codex/`, `.agents` は dogfood runtime install target として root に残る可能性が高い。
- `packages/setup` の parallel intent は、framework layout decision と coordination すべきだが、この intent の実装対象ではない。
- User Stories stage は現在 skip でよい。今回の対象は user-facing workflow ではなく maintainer-facing architecture decision である。

## Out Of Scope

- `packages/setup` の実装。
- npm installer package の publish、rename、runtime behavior change。
- Bun、TypeScript、Biome、test runner、CI/CD の置換。
- generated `dist/<harness>/` の手編集。
- UI、market research、cloud infrastructure、deployment pipeline。
- GitHub issue #610 と無関係な repository refactor。

## Open Questions

- Application Design で、`dist/` を root-level public install contract として残すか、package-local output に移すかを決める。
- Application Design で、manifest paths を package-local relative path にするか、repository-wide logical path として保つかを決める。
- Delivery Planning で、migration を選んだ場合の first safe slice を source root abstraction、test fixture abstraction、docs update のどれにするか決める。
