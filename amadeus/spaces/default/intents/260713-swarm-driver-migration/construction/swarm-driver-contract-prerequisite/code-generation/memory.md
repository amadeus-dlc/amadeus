# Code Generation Memory — swarm-driver-contract-prerequisite

## Interpretations

- 2026-07-15T03:46:44Z — prerequisiteは新しいprovider実装ではなく、U-01/U-02の既存interfaceを深くする修正として扱う。provider固有の意味をcommon moduleへ漏らさず、redacted digest referenceだけをtransportする。
- 2026-07-15T04:38:24Z — application designの`1候補の総deadline 45,000ms`を全native candidateの共通runtime上限として解釈した。provider固有の5/10/30秒step ceilingは各adapterがこの総budget内で所有する。

## Deviations

- 2026-07-15T04:38:24Z — 初回レビューで、非Codex bindingの空`resolvedModelId`をselectionだけが受理する契約不整合を検出した。contract、JSON schema、checkpoint、native executionを「field存在時は非空」へ統一し、非Codex回帰testを追加した。
- 2026-07-15T04:38:24Z — 初回の全coverage実行で、今回差分由来のcomplexity 6件と生成tree drift 3系統を検出した。helper分割とpackage/promote同期で解消した。未変更のreaper競合testは一度だけ失敗したが、全coverage再実行ではgreenとなり、今回差分外の一過性競合として記録する。

## Tradeoffs

- 2026-07-15T03:46:44Z — ProbeBinding全体をcheckpointへ保存せず、provider-neutralなseed/final digest referenceを保存する。U-04が必要とする相関を満たしつつ、credentialやcatalog payloadのcommon surface化を避ける。
- 2026-07-15T04:38:24Z — `NativeExecutionBinding`をoptionalにして既存providerとのschema互換を維持する一方、selected probeがbindingを持つ場合はexecution planにも完全一致を必須とし、partial/mismatchをprovider arm前にfail-closedする。

## Open questions
