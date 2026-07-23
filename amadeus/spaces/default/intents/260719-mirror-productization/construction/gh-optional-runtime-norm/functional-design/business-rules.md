# Business Rules — gh-optional-runtime-norm

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

## Mandatory Rules

- **BR-U1-01**: `gh`はmirror capabilityのoptional runtime dependencyとして許容する。
- **BR-U1-02**: mirror operationは外部command前に`gh`の実行可能性と認証状態を明示検査する。
- **BR-U1-03**: `gh`不在・未認証・API/rate-limit/command faultは、原因とremediationを持つloud capability faultにし、direct CLI invocationをexit 1にする。
- **BR-U1-04**: phase boundary経由ではU6がretry/skipを提示し、workflow全体を恒久停止しない。direct CLI invocationへcontinue経路は要求しない。
- **BR-U1-05**: credentialの保存、読取、再出力を行わず、`gh`のcredential storeへ委譲する。
- **BR-U1-06**: `gh`はshell stringでなくtyped argument arrayで起動する。
- **BR-U1-07**: raw environment、token、unredacted auth stderrをstdout、stderr、audit、artifactへ書かない。
- **BR-U1-08**: optional runtime例外はmirror capabilityに限定し、無関係な外部CLIの包括許可へ拡張しない。
- **BR-U1-09**: norm変更は独立PR、独立review、人間承認mergeを経る。
- **BR-U1-10**: norm PR未mergeの間、依存Unitをrelease-readyまたは配布完了と判定しない。

## Forbidden Rules

- **BR-U1-11**: `gh` packageをnpm runtime dependencyとしてbundleしない。
- **BR-U1-12**: `gh`不在をsilent skipまたはsuccessとして扱わない。
- **BR-U1-13**: `gh`不在だけを理由にworkflow全体を恒久hard-failしない。
- **BR-U1-14**: create/closeの人間承認境界をoptional dependency規則で緩和しない。
- **BR-U1-15**: norm PRへmirrorの設計・実装・無関係なrefactorを同梱しない。

## Decision Table

| Context | Ready | Authenticated | Operation | Result | Next action |
|---|---:|---:|---|---|---|
| direct CLI | No | N/A | any mirror verb | gh-unavailable、exit 1 | process終了 |
| direct CLI | Yes | No | any mirror verb | gh-unauthenticated、exit 1 | process終了 |
| direct CLI | Yes | Yes | status | execute read-only | resultに従い終了 |
| direct CLI | Yes | Yes | sync | execute after policy/precondition | resultに従い終了 |
| direct CLI | Yes | Yes | create/close | human choice後だけexecute | resultに従い終了 |
| phase boundary | N/A | N/A | reported mirror fault | existing ask | U6がretry/skipを提示 |

## Acceptance Rules

- **AR-U1-01**: `rg -c 'cid:practices-discovery:gh-scripts-boundary' amadeus/spaces/default/memory/project.md`が`1`。
- **AR-U1-02**: `rg -c 'scripts/ 配下の repo ローカル開発支援ツールに限定' amadeus/spaces/default/memory/project.md`が`0`。
- **AR-U1-03**: 対象CIDのbulletから先頭markerと末尾CID commentを除き、連続空白を1文字へ正規化した全文が`business-logic-model.md`のcanonical clauseと完全一致する。単なるsubstring包含では合格にしない。
- **AR-U1-04**: norm変更commitのapplication source diffが0件で、規範変更先は`amadeus/spaces/default/memory/project.md`だけ。intent配下にはreview/audit evidenceだけを許容する。
- **AR-U1-05**: `git diff --check`が成功する。
- **AR-U1-06**: lifecycle各状態のevidenceが揃うまで次状態へ進めず、`merged`未到達ならU1 completionを拒否する。

## Norm Replacement Contract

- ファイル: `amadeus/spaces/default/memory/project.md`
- CID: `practices-discovery:gh-scripts-boundary`
- 操作: 既存bulletを同じ位置・同じCIDで置換する。
- canonical clause: `business-logic-model.md`の「Norm Change Target」に記載した引用文を唯一の正本とする。
- U1所有範囲: 規範とevidenceのみ。runtime実装はU2/U4、phase routingはU6。
