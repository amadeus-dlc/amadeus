# Defect Candidate — Standing grant approval does not backfill the gate transition

Filed as [Issue #2013](https://github.com/amadeus-dlc/amadeus/issues/2013)。

## Summary

Standing grant の carrier を付けた `amadeus-orchestrate.ts report --result approved` は、対象 stage が `in-progress` の場合に通常の report 経路と同じ gate transition を補完せず、`awaiting-approval` 必須エラーで停止する。既に有効な grant があり、人間判断を新たに必要としない機械的前提不足なので、workflow conductor が回復可能なエラーとして自動処理できる必要がある。

## Evidence and Reproduction

Affected revision: `d72f60b5a81fc6e45f99431d61b6561e91b2fc37`

1. stage gate を持つ stage を `in-progress` まで実行する。
2. 当該 gate を覆う有効な standing grant と、engine が発行した carrier／route ID を用意する。
3. `report --stage <stage> --result approved --standing-grant-id <id> --standing-grant-route-id <route>` を実行する。
4. command は `Stage <stage> is in state 'in-progress' but command requires one of: awaiting-approval` として拒否される。
5. 同じ stage に `gate-start` を先に実行すると、その後の grant-backed report は成功する。

観測時の audit では state approve error と orchestrate report error が連続して記録された。秘密情報、credential、非公開 repository 情報は本報告に含めていない。

## Expected Versus Actual

- Expected: 通常 report 契約と同様に、grant-backed approval が必要な `in-progress → awaiting-approval` を安全に補完してから承認する。または、engine 自身が実行可能な typed recovery directive を返し、conductor が人間へ停止を委ねず再試行できる。
- Actual: grant-backed report は前提状態不足を terminal error として返し、workflow が利用者の再指示まで停止する。

## Acceptance Criteria

1. 有効な standing grant carrier を伴う report は、`in-progress` から必要な gate transition を通常 report と同じ規則で補完するか、engine 所有の決定的な自動復旧経路を完了する。
2. `GATE_AUTHORIZATION_SELECTED`、承認、stage transition を重複記録しない。
3. 同じ carrier の replay は fail-closed かつ冪等で、二重承認にならない。
4. solo mode、standing grant、stage gate 対象、phase-boundary 除外の各境界をテストする。
5. 回復可能な前提不足のために、追加の HUMAN_TURN を要求しない。
