# Business Rules — U4 Follow-Up Migration Preparation

## Upstream Trace

この rules は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` の U4 mapping に基づく。

## Mandated Rules

- ALWAYS future migration follow-up は source root abstraction を first safe slice 候補として含める。
- ALWAYS test fixture abstraction と manifest contract seam を migration preparation として扱う。
- ALWAYS follow-up はこの intent の scope 外であることを明記する。
- ALWAYS `packages/setup` intent との coordination point を記録する。

## Forbidden Rules

- NEVER follow-up をこの intent の必須 implementation task に昇格しない。
- NEVER full workspace normalization を採用済み decision として記録しない。
- NEVER directory move を first safe slice として推奨しない。

## Validation Rules

Follow-up は actionability を持つ必要がある。少なくとも目的、非目的、対象 file area、guard command を含める。
