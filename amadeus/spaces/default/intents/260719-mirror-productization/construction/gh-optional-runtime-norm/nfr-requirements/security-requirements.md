# Security Requirements — gh-optional-runtime-norm

> 上流: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Controls

- credentialは`gh`のcredential storeへ委譲し、Amadeusが保存・読取・再出力しない。
- token、environment secret、raw auth stderrをstdout/stderr/audit/artifactへ記録しない。
- `gh`はargument arrayだけで起動し、shell interpolationを禁止する。
- optional例外をmirror capability以外へ拡張しない。
- create/closeの人間承認境界を維持する。

## Threat Verification

credential exposure、command injection、scope creep、silent bypassをthreat fixtureとして検査し、違反時はblocking failureとする。規制対象データや新規PIIは扱わない。
