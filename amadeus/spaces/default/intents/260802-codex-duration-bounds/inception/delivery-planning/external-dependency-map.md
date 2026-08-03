# External Dependency Map — Codex Duration Bounds

## Upstream Inputs

本mapは `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` を入力とする。本repoは短命Bun CLI monorepoで、新しいexternal API、database、cloud resource、外部チーム手渡しを追加しない。

## Blocking Dependencies

| Dependency | Owner | Lead time | Blocks | Mitigation / workaround | Status |
|---|---|---|---|---|---|
| GitHub change review / merge | 人間reviewer・ユーザー | 人間判断まで | 次Bolt着手 | なし。AIはmergeせず、worktreeと証跡を保持 | REQUIRED |
| Issue labelの `in-progress` 付け替え | conductor | merge直後 | 次Bolt開始の受入証跡 | 前Issueから除去後に次Issueへ付与 | REQUIRED |
| 最新 `main` とのrebase/conformance | conductor + developer | merge直後 | 次Bolt実装 | 後続branchがなければ開始時にlatest mainから作成 | REQUIRED |

[Pull Request一覧](https://github.com/amadeus-dlc/amadeus/pulls) は人間の不可逆境界であり、standing grantやConstruction autonomyはmerge権限を含まない。

## Capability-Dependent Dependencies

| Dependency | Consuming Bolts | Blocking? | Evidence rule |
|---|---|---|---|
| live Codex/Claude/他provider journey | 1〜4の該当変更 | No | CLI/provider/credentialが利用可能な場合に実行。skip理由を明記し、deterministic passに数えない |
| GitHub Actionsのremote checks | 1〜4 | merge判断上はYes | ローカルdeterministic gateを先に通し、remote resultを[Pull Request一覧](https://github.com/amadeus-dlc/amadeus/pulls)で確認 |

## Non-Dependencies

- External API / third-party data: なし。
- External team hand-off: なし。
- AWS account / infrastructure / database: なし。
- Release workflow / version bump / GitHub Release / npm publish: 本IntentのBolt DoD外。手動 `workflow_dispatch` と人間承認を維持。
- Codex製品本体まmodel/provider/network性能改善: スコープ外。

## Dependency Closure

全blocking dependencyはrepository内の人間merge境界とその直後処理に限定される。未割当owner、不明な外部lead time、データ待ちはない。release/publishを含めないため、Construction完了と出荷操作を混同しない。
