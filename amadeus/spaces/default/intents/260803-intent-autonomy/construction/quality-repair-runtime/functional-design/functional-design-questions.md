# Functional Design Questions — quality-repair-runtime

## 確認方針

ユーザーから「Issueに書いてあることの抜け漏れ・矛盾だけを質問し、それ以外はIssueどおりに進める」という明示指示を受けている。#2096と次の上流成果物を照合し、実装を一意に決められない矛盾・欠落のみを質問対象とした。

- `units-generation/unit-of-work.md`
- `units-generation/unit-of-work-story-map.md`
- `requirements-analysis/requirements.md`
- `application-design/components.md`
- `application-design/component-methods.md`
- `application-design/services.md`

[Answer]: Issueに書いてあることの抜け漏れ・矛盾だけを指摘し、それ以外はIssueどおりに実行する。

## 曖昧性分析

| 候補 | #2096の記述 | 上流で確定済みの解釈 | 追加質問 |
|---|---|---|---|
| sensor failure | sensor失敗・不完全を対象に含む | 明示的にblocking指定されたsensorだけをobligation化し、advisoryを暗黙昇格しない | 不要 |
| `repair` route | 閉じた分岐の1つ | T未満とstrict progress後の決定論的継続とし、T到達時のJudgeは初回`replan`、replan後`repair-stalled`のsingleton制約 | 不要 |
| suspended grant | grantを終了させない | `full`だけactiveのまま、`none / semi`はgrantなしのまま。U2はgrant状態を変更しない | 不要 |
| 再開条件 | evidence変化または人間retry | 真部分集または新しいverifier成功証拠、および実在人間の明示retryに限定 | 不要 |

未解決の重大な曖昧性は0件である。optional `frontend-components.md`は、本Unitが既存CLI / status表示だけを拡張し、frontend / UI componentを含まないため生成しない。
