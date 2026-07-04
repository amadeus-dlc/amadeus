# Reliability Design: U002-subagent-status-audit

## 上流文脈

この reliability-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、classification と audit field construction の処理予算を定義している。

`security-requirements` は、trusted source、unknown fallback、audit integrity を定義している。

`scalability-requirements` は、3 状態 outcome と old row compatibility を定義している。

`reliability-requirements` は、REL001 から REL008 までの classification と compatibility の検証条件を定義している。

`tech-stack-decisions` は、pure helper、reader normalization、既存 audit adapter を使う判断を定義している。

`business-logic-model` は、trustworthy status field から outcome、audit fields、normalized outcome へ進む処理を定義している。

## Reliability Architecture

| Failure mode | Design | Target |
|---|---|---|
| trustworthy success | success allowlist に一致した場合だけ success にする。 | REL001 |
| trustworthy failure | failure allowlist に一致した場合だけ failure にする。 | REL002 |
| missing status | unknown にする。 | REL003 |
| untrusted `tool_input.status` | outcome source として無視する。 | REL004 |
| old audit row | missing outcome を valid unknown として読む。 | REL005 |
| new audit row | outcome、source、evidence ref を additive field として読む。 | REL006 |
| stdout JSON | Subagent Status path で診断文を stdout に出さない。 | REL007 |
| audit append failure | `AuditWriteResult.failed` を返し、`.drops` を所有しない。 | REL008 |

## Fault Isolation

Subagent Status の classification failure は Error Audit の `ERROR_LOGGED` path を壊さない。

Audit append failure は stdout JSON command を壊さない。

Unknown outcome の増加は U003 の traceability warning に渡せるが、U002 から U003 を呼ばない。

Old row compatibility 問題は migration ではなく reader normalization の修正で扱う。

## Recovery Design

Unexpected status value は unknown として処理する。

JSON parse できない hook input は hook wrapper 側の no-op または hook drop として扱う。

Subagent Status domain rule は parse 済み hook payload から始める。

Audit append failure は failed result として返す。

## SLO Design

fixture matrix pass rate は PR readiness までに 100% にする。

old/new row compatibility は covered fixture rows で 100% にする。

stdout JSON parse success は covered command fixtures で 100% にする。

unknown fallback correctness は missing または untrusted status fixtures で 100% にする。

## Verification Design

success fixture で REL001 を確認する。

failure fixture で REL002 を確認する。

missing status fixture で REL003 を確認する。

untrusted field fixture で REL004 を確認する。

old row fixture で REL005 を確認する。

new row fixture で REL006 を確認する。

JSON parse fixture で REL007 を確認する。

failure fixture で REL008 を確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Reliability design は success、failure、unknown、old row compatibility、stdout JSON 非干渉を直接検証できる。

unexpected input を unknown に寄せるため、誤分類より安全な失敗形になる。
