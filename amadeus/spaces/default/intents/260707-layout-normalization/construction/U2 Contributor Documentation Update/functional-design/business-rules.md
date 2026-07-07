# Business Rules — U2 Contributor Documentation Update

## Upstream Trace

この rules は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` の U2 mapping に基づく。

## Mandated Rules

- ALWAYS docs は root framework zone と package-owned setup zone を区別する。
- ALWAYS `core/` と `harness/<name>/` を framework source of truth として説明する。
- ALWAYS `dist/<harness>/` は generated かつ public install source として説明する。
- ALWAYS `packages/setup` は別 intent の sibling package として説明する。
- ALWAYS docs update は U1 design record と矛盾しない。

## Forbidden Rules

- NEVER docs で full workspace normalization が採用済みであるかのように書かない。
- NEVER install examples の path を変更する場合に tests/CI impact を説明せず変更しない。
- NEVER `packages/setup` の implementation details をこの intent の docs update に混ぜない。

## Validation Rules

Docs は Issue #610 の acceptance criteria を補助するが、最終 decision source は U1 の design record とする。docs が design record と矛盾する場合は docs を修正する。
