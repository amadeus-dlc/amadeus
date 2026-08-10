# Code Summary — issue-2833-failure-transition

## 変更と判断

- `amadeus-orchestrate.ts` に監査-backed outcome projection、Retry/Skip/Abortのselector配線、`resolve-failure` 応答経路、Abort後のterminal `parked`判定を実装。
- `amadeus-bolt.ts` / `amadeus-swarm.ts` でsoloのstage・attempt・batch-id相関とfailコマンドの識別子を明示。
- `amadeus-directive.ts` と `amadeus-construction-outcome-projection.ts` で空相関・未知Outcome・不正監査行・監査書込み失敗をfail-closed化。
- 変更対象の契約に対応するfocused tests（t113、t207、t211、t425、t379等）を追加・補強。distや生成self-install面はcommitしていない。

## 検証結果

- Commit: `ad0b709861874907b1507365f938f01da558908d` (`fix(construction): enforce failure audit integrity`)
- PR: [#2864](https://github.com/amadeus-dlc/amadeus/pull/2864)
- focused tests: 153 pass / 0 fail。追加bolt相関テスト: 14 pass / 0 fail。
- 最新PR CI: run 31421720252 — required jobs全成功。
- patch coverage: measured 844 / covered 844 / allowlisted 0 / uncovered 0。
- build、typecheck、lint、complexity、no-silent-drop、source-only、coverage registry、test-size purity、diff-check、stale selector: すべてexit 0。
- CodeRabbit review threads: 23件、未解決0件。PRはready for review、mergeable。マージは未実施。

## 既知の外因

full coverageでteam-up safety-wait/active-run raceが再現したが、本Unitの変更面と無関係。隔離再実行で他の6対象suiteはgreen、本件関連failureは0件だった。
