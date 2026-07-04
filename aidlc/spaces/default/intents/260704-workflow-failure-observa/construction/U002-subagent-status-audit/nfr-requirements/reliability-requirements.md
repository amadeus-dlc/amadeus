# Reliability Requirements: U002-subagent-status-audit

## 上流文脈

この reliability-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、trustworthy status field、unknown fallback、old row compatibility、audit append failure の処理を定義している。

`business-rules` は、free text 推測禁止、stdout JSON 非干渉、`AuditWriteResult.failed`、old row compatibility を不変条件としている。

`requirements` は、R004、R007、R008、R009、NFR001、NFR004、NFR005 を定義している。

## Reliability Targets

| ID | Target | Verification |
|---|---|---|
| REL001 | trustworthy success status は success outcome になる。 | success fixture |
| REL002 | trustworthy failure status は failure outcome になる。 | failure fixture |
| REL003 | missing status は unknown outcome になる。 | missing status fixture |
| REL004 | `tool_input.status` は outcome source として信頼されない。 | untrusted field fixture |
| REL005 | old audit row は missing outcome を valid unknown として読める。 | old row fixture |
| REL006 | new audit row は outcome、source、evidence ref を読める。 | new row fixture |
| REL007 | stdout JSON parse test は Subagent Status path で成功する。 | JSON parse fixture |
| REL008 | audit append failure は `AuditWriteResult.failed` を返し、Subagent Status が `.drops` を所有しない。 | failure fixture |

## SLI and SLO

| SLI | SLO | Measurement window |
|---|---|---|
| fixture matrix pass rate | 100% before PR readiness | PR preparation |
| old/new row compatibility | 100% for covered fixture rows | PR preparation |
| stdout JSON parse success | 100% for covered command fixtures | PR preparation |
| unknown fallback correctness | 100% for missing or untrusted status fixtures | PR preparation |

U002 は外部 service ではないため、availability percentage は定義しない。

代わりに、classification correctness と compatibility fixture の pass を reliability target とする。

## Recovery Requirements

unexpected status value は unknown として処理する。

JSON parse できない hook input は hook wrapper 側で no-op または hook drop として扱い、Subagent Status domain rule には入れない。

audit append failure は failed result として返す。

old row の compatibility 問題が見つかった場合は、migration ではなく reader normalization を修正する。

## Fault Isolation

Subagent Status の classification failure は Error Audit の `ERROR_LOGGED` path を壊さない。

audit append failure は stdout JSON command を壊さない。

unknown outcome の増加は U003 の traceability warning に渡せるが、U002 から U003 を呼ばない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Reliability target は success、failure、unknown、old row compatibility、stdout JSON 非干渉を直接検証できる。

unexpected input は unknown に寄せるため、誤分類より安全な失敗形になる。
