# Discovered Rules

## Mandated

- ALWAYS active scope が `amadeus-feature` なら、既存コードを変更する場合も最初の Construction Bolt に walking-skeleton gate を維持する。
- ALWAYS 認可に関わる変更を directive contract、state transition、audit invariant、race、team-mode regression、harness drift のテストで検証する。

## Forbidden

- NEVER walking-skeleton stance が有効なとき、standing grant に walking-skeleton gate を認可させない。
- NEVER 想定内の grant 失効・取消・scope 不一致 fallback を、`ERROR_LOGGED` を発生させる fatal error 経路へ流さない。
