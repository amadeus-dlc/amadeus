# Amadeus template evals

## 検証対象

この eval は、Amadeus 成果物を生成する skill の標準テンプレート契約を検証する。

対象 skill は次である。

- `amadeus-steering`
- `amadeus-event-storming`
- `amadeus`（単一入口）
- Ideation の 7 ステージ skill
- Inception の 8 ステージ skill
- Construction の 7 ステージ skill

あわせて、維持 skill（decision-review、history-review、learning-review、domain-modeling、domain-grilling、validator ほか）の本文契約を text contract として検証する。

## 検証条件

- 各 skill の `SKILL.md` が `.amadeus/settings/templates` と同梱 `templates/` の優先順位を説明している。
- source skill と promoted skill の両方に標準テンプレートが存在する。
- 標準テンプレートに必須見出しが存在する。
- JSON テンプレートは JSON として解釈できる。
- `promote-skill.ts` で一時昇格した結果に `templates/` が含まれる。

## 再実行コマンド

```sh
bun run dev-scripts/evals/amadeus-templates/check.ts
```
