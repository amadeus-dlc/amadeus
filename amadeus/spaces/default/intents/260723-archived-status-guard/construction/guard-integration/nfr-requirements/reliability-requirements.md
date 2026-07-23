# Reliability Requirements — guard-integration

`business-logic-model` の shared rejection/short-circuit と `business-rules` の不変条件を、`requirements` の FR-05〜FR-07・NFR-01/NFR-02/NFR-04、および `technology-stack` の既存 state/utility/orchestrate CLI に適用する。

## Fault containment

- archived rejection は stage resolution、cursor write、unpark marker mutation、registry status write、audit commit より前に終了する。
- `select` は intent 名、record-dir、内部 cursor writer caller の全入口を同一 resolver/preflight 契約へ収束させる。
- `next` は archived stale cursor を検出したら `{ kind: "error", message }` を一度だけ出力し、run-stage/ask/print resolution へ fall through しない。
- `unpark` は archived + parked と archived + unparked の双方を status/marker mutation 前に拒否する。

## Invariants and recovery

- journal がない fixture では call-entry と rejection-return の registry、active cursor、state、park marker、audit の対象 bytes が一致する。
- 未完了 transaction journal がある場合は、同じ workspace lock 内で recovery を完了してから status を判断する。call-entry から post-recovery までは journal が規定する期待差分との一致を検証し、post-recovery snapshot を rejection 不変性の baseline とする。post-recovery から rejection-return までは registry、cursor、state、marker、audit の対象 bytes が一致しなければならない。recovery 不能時は guard 判定を続けず typed fatal error とする。
- utility から state subprocess への委譲中に対象が消失・差替え・status 変更された場合、state 側観測で non-zero 終了し、utility は stdout、stderr、exit code を書き換えない。

## Verification matrix

- selector: intent name、record-dir、archived、対象不在、symlink/traversal、解決後消失。
- next: archived stale cursor、recovery 後 archived、許可 status。
- unpark: archived + parked、archived + unparked、許可 parked。
- corpus: cursor writer、directive開始点、marker writer、status writerを AST/symbol graph で抽出し、dynamic/未解決/未分類 path は fail closed とする。
- 各 rejection test は目的 branch の coverage 到達と永続 bytes 不変を併せて証明し、同じ exit code の別 parse error を合格にしない。

## Observability

- 常駐 monitoring、paging、distributed tracing、service SLA はローカル短命 CLI のため N/A。
- recover不能時の typed fatal diagnostic は operation、intent、status、workspace-relative journal path、期待値と観測値、手動調査が必要であることを含む。ただし絶対 home path、journal 内容、secretは出力しない。
- 通常の archived rejection は intent、status、operation、実行可能な unarchive command を含め、silent no-opを禁止する。
