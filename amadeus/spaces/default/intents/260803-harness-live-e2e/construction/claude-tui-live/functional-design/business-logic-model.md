# Business Logic Model — claude-tui-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U05はClaude tmux TUIを共通policy/lifecycleへ接続し、既存session価値を維持する。

## Execution Workflow

1. C2が`AMADEUS_TUI_LIVE === "1"`とGHA hard denyを評価する。runnerの`--all`、`--release`、`--debug`はopt-inを自動設定しない。
2. C5 preflightが`claude`、`tmux`、versions、`dist/claude`、auth lease、private socket/session capabilityを検査する。
3. C4がregistrar、fresh project/home、git、distを準備する。
4. C5がproject-only settings、allow-listed env、private tmux socket/session、TUI argvを準備する。developerの既存tmux server/sessionへ接続しない。
5. C6が1〜数promptを送信し、tool/state/audit/file anchorとbounded terminal conditionを観測する。
6. timeout/cancel/failure/successの全経路でpane captureをsanitizedし、session→server→credential→scratchの順でcleanupする。
7. supportedならlive receipt、capability不成立なら完全なevidence package+Issueへ閉じる。

## Session Isolation

socket pathとsession nameはrun identityからfreshに生成し、既存serverをlist/killしない。tmux commandはすべてprivate socketを明示する。debug保持ではsanitized pane log/projectだけを残し、session、server、credential materialは残さない。

## Result Mapping

| Observation | Common result |
|---|---|
| CI/opt-in deny | skip、tmux/CLI call 0 |
| binaryなし | `SKIP:BINARY_MISSING` |
| version不適合 | `SKIP:VERSION_UNSUPPORTED` |
| distなし/不整合 | `SKIP:DIST_MISSING` |
| auth不成立 | `SKIP:AUTH_UNAVAILABLE` |
| private socket/send/capture/terminate capability不成立 | `SKIP:CAPABILITY_UNSUPPORTED` |
| TUI terminal success + anchors | success |
| process/session non-zero | execution failure |
| deadline | timeout、interrupt/kill/reap |
| anchor mismatch | assertion failure |
| cleanup/leak/ledger failure | green禁止 |

上表は1 runのcanonical resultである。Unit closureは別に評価する。`CI_FORBIDDEN`と`OPT_IN_REQUIRED`は通常skipでありIssueを作らず、U05は未完了のまま明示live runを待つ。maintainer指定live環境で`BINARY_MISSING`、`VERSION_UNSUPPORTED`、`DIST_MISSING`、`AUTH_UNAVAILABLE`、`CAPABILITY_UNSUPPORTED`のいずれかが再現してlive greenを阻害する場合、同じcodeを持つ`UnsupportedEvidencePackage`とIssueが必須で、それが揃った場合だけalternative closureとなる。

## Verification

U02 kitとfake tmux/Claude executableでargv、private socket、env、settings、send/capture、timeout、cleanupを検証する。暗黙opt-in mutantは必ずred。supported branchはminimal live、unsupported branchは実測evidence+Issue+matrixを要する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:40:00Z
- **Iteration:** 1
- **Scope decision:** none

依存循環や参照切れは認められないが、Claude TUIのpreflight不成立時の結果分類が一意でなく、実装可能なclosed contractになっていない。

### Findings

- BLOCKER | business-logic-model.mdはbinary/version/auth/session capability不足をpreflight skipまたはunsupported evidenceとしており、同一観測をどちらへ分類するか未定義である。requirements.mdのFR-2はBINARY_MISSING、VERSION_UNSUPPORTED、AUTH_UNAVAILABLE、CAPABILITY_UNSUPPORTEDの一意な主codeを要求し、FR-7およびBR-C02はunsupported時のIssue closureを要求するため、実装者によってLiveOutcome、ledger、matrix、完了判定が分岐する。各preflight findingからcanonical LiveCodeへの対応と、skipを返すだけの条件／UnsupportedEvidencePackageとIssueを必須にする条件を決定表として閉じる必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:43:54Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のBLOCKERは解消された。各preflight findingからcanonical skip codeへの対応、優先順位、通常skipとalternative closureの境界が一意に定義され、FR-2・FR-7・BR-C02と整合している。

### Findings

- None
