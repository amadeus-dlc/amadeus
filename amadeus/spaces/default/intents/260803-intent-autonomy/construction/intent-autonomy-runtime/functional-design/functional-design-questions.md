# Functional Design Questions — intent-autonomy-runtime

## 確認方針

ユーザーの明示指示に従い、#2067と次の上流成果物を照合し、Issueにない矛盾・欠落で実装方針が分岐する場合だけを質問対象とした。

- `units-generation/unit-of-work.md`
- `units-generation/unit-of-work-story-map.md`
- `requirements-analysis/requirements.md`
- `application-design/components.md`
- `application-design/component-methods.md`
- `application-design/services.md`

[Answer]: Issueに書いてあることの抜け漏れ・矛盾だけを指摘し、それ以外はIssueどおりに実行する。

## 曖昧性分析

| 候補 | 上流から一意に導く契約 | 追加質問 |
|---|---|---|
| `semi`のphase内gateにgrantがない | human-provenance付きmode設定をbasisに`AUTO_DECIDED + gate effect`を原子commitし、`GRANT_EXERCISED`は作らない | 不要 |
| `full`のgate | grant scope内ならdeterministic approval。質問だけをpolicy→norm/history→election→recommendationで解く | 不要 |
| 旧standing grant | audit / replay / migration diagnosticだけに使い、modeやIntent grantへ自動変換しない | 不要 |
| Walking Skeleton | 特例化せず通常mode表を適用し、`full` grantだけが自動承認 | 不要 |
| PR / merge | Coreの進行・完了条件へ入れない | 不要 |

未解決の重大な曖昧性は0件である。optional `frontend-components.md`は、本Unitが短命CLIのengine / audit / status契約でfrontend componentを含まないため生成しない。
