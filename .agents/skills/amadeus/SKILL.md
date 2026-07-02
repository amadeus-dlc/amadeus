---
name: amadeus
description: >-
  Amadeus の v2 互換ライフサイクルの単一公開入口。新しい作業テーマの開始、既存 Intent の継続や再開、
  次ステージの実行、Intent 化の判断が必要な場面では必ず使う。Intake（合流既定、受理条件の確認、scope 推定、
  Birth 提案）と、state.json に基づく次ステージの解決だけを行い、ステージ成果物の作成はステージ内部 skill に委譲する。
  grilling、domain-modeling、event-storming、steering、validator の代替ではない。
---

# amadeus

## 目的

Amadeus ライフサイクルの単一公開入口として、Intake と次ステージの解決を行う。

ユーザーは phase やステージを選ばない。
入力から、既存 Intent の継続か、新しい Intent の Birth 提案かを判定し、対象 Intent の `state.json` から次に実行するステージを解決して、対応するステージ内部 skill を呼び出す。

この skill 自身はステージ成果物を作らない。

## 前提

`.amadeus/` の steering layer が存在することを前提にする。
`.amadeus/` がない場合は停止し、先に `amadeus-steering` を使うよう案内する。

少なくとも次を読む。

- `.amadeus/active-intent`（存在する場合。現在作業中の Intent 識別子）
- `.amadeus/intents.md`
- 対象になり得る `.amadeus/intents/<intent-id>-<slug>.md` と `state.json`
- steering layer

## Intake

入力を受けたら、次の順で判定する。

1. **継続判定**。入力が `active-intent` の指す Intent、または既存 Intent の続き（ゲートへの回答、修正指示、同じ主題の追加作業）であれば、その Intent のルーティングへ進む。判定に迷う場合は継続とみなす。新規扱いにするのは、既存 Intent の主題と無関係な、明確に別個の作業を名指ししている場合だけである。
2. **合流判定**。入力が既存 Intent のアウトカムに属する新しい作業であれば、新しい Intent を作らず、その Intent のスコープバックログ（`ideation/scope-definition/intent-backlog.md`）への追加を提案する。
3. **受理条件の確認**。新しいアウトカムに見える入力は、次の 3 条件を確認する。①観測可能な成功基準を持つ（技術的な作業は、保存すべき振る舞いと観測可能な改善指標を持つ）、②独立して完了判断できる、③既存 Intent のアウトカムに属さない。満たさない場合は拒否せず、`amadeus-grilling` のプロトコルで一問ずつ確認し、成功基準を言語化できれば受理し、既存 Intent の成功条件の一部だと分かれば合流へ導く。
4. **scope 推定**。入力の語から scope を推定する（後述）。
5. **Birth 提案**。新しい Intent の作成を、推定した scope を明示した一問として人間に確認する。人間の明示的な承認なしに Intent を作らない。

Intake は Intent の規模を数値で判定しない。
Unit 数や Bolt 数の見込みを受理の判定材料にしない。
1 回の入力から作る Intent は最大 1 個であり、テーマ内の残りの作業はスコープバックログが受け皿になる。

## scope 推定

次のキーワードを手掛かりに scope を推定する。
推定は仮説であり、確定は必ず Birth 提案で人間が行う。

| Scope | 手掛かり |
|---|---|
| bugfix | fix、bug、broken、バグ、不具合、修正したい |
| refactor | refactor、clean up、simplify、リファクタリング、整理したい、簡素化 |
| poc | poc、prototype、proof of concept、spike、試作、プロトタイプ |
| security-patch | security、CVE、vulnerability、patch、脆弱性 |
| infra | infrastructure、deploy、infra、インフラ、デプロイ |
| mvp | mvp、minimum viable |
| workshop | workshop、lab、training、ワークショップ、研修 |
| enterprise | 手掛かりなし。人間が明示した場合だけ使う |
| feature | 既定値。上記に当てはまらない入力、またはテーマを文章で説明した入力 |

英語キーワードは単語境界で照合し、部分文字列では発火させない（debug は bugfix の手掛かりにしない）。
複数の scope に当てはまる場合や判断に迷う場合は `feature` を仮説にし、Birth 提案で選択肢を示す。

## Birth

人間が Birth 提案を承認したら、Intent Record の骨格を作る。

1. Intent 識別子を `YYYYMMDD-<slug>` 形式で決める。日付は作業日のローカル日付、slug は小文字英数字とハイフンだけにする。同日同名は末尾に `-2`、`-3` の連番を付ける。
2. Intent のモジュールファイルをテンプレートから作る。分からない項目は空欄にせず `未確認` と書く。
3. `state.json` をテンプレートから作る。`scope` と `depth` を確定値にし、`stages` には scope が実行対象にするステージだけを `pending` で列挙する（[references/stage-catalog.md](references/stage-catalog.md) の対応表に従う）。
4. scope が Ideation の全ステージを SKIP にする場合は、`phase` を `inception` にし、`phaseGates.ideation` に `{"skipped": true}` を記録する。
5. `.amadeus/active-intent` に Intent 識別子を書く。
6. `bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace>` で `.amadeus/intents.md` を再生成する。

テンプレートの優先順位は次である。

1. `.amadeus/settings/templates/intents/intent-module.md` と `.amadeus/settings/templates/intents/state.json`
2. この skill に同梱された `templates/intents/intent-module.md` と `templates/intents/state.json`

## ルーティング

対象 Intent が決まったら、次の手順でステージを解決する。

1. `state.json` を読む。`status` が `parked` の場合は `currentStage` から再開する。
2. 現在 phase の実行対象ステージがすべて `completed` または `skipped` の場合は、手順 6 の phase 境界処理へ進む。
3. `stages` から、状態が `revising`、`active`、`awaiting_approval` のステージがあればそれを優先する。なければ、ステージ順序（[references/stage-catalog.md](references/stage-catalog.md)）で最初の `pending` を選ぶ。
4. 選んだステージが `CONDITIONAL` の場合は、Condition を判定する。偽の場合は状態を `skipped` にし、理由を記録して手順 2 へ戻る。
5. ステージに対応する内部 skill を呼び出す。対応表は [references/stage-catalog.md](references/stage-catalog.md) に従う。対応する skill が利用できない場合は、実行せずに停止し、不足しているステージ skill 名を報告する。
6. phase 境界処理を行う。実行したステージが 1 つ以上ある phase は、phase PR の作成を案内し、merge の確認後に `phaseGates.<phase>` へ approval evidence（`approvedAt`、`via: "pr"`、`reference` に PR の URL）を記録して、`phase` を次へ進める。実行したステージが 1 つもない phase は、`phaseGates.<phase>` に `{"skipped": true}` を記録して通過し、手順 2 へ戻る。

phase 境界処理（phase PR の案内、`phaseGates` の記録、`phase` の遷移）は、この skill だけが行う。
ステージ内部 skill には委譲しない。

ステージゲートで停止中の Intent を再開した場合は、ゲートの提示から再開する。
`revising` からの再開は、ステージを最初からやり直さず、前回の成果物と差し戻し理由を提示してから修正に入る。

## ゲート

ステージの完了承認はステージ内部 skill が提示する。
この skill は、phase 境界の PR 作成の案内と、`phaseGates` の記録だけを扱う。

ゲートを提示したターンでは、人間の回答を待つ。
回答を推測して先へ進まない。

## 禁止事項

- 人間の承認なしに Intent を作らない。承認前にモジュールファイルや `state.json` を作らない。
- Unit 数や Bolt 数の見込みで Intent 化を判定しない。
- Discovery 成果物（`.amadeus/discoveries/**`）を作らない。
- scope が SKIP にするステージを実行しない。
- ステージ成果物をこの skill で直接作らない。
- `.amadeus/intents.md` を手書きしない。

## 次の skill

- ステージの実行: [references/stage-catalog.md](references/stage-catalog.md) の対応表にあるステージ内部 skill
- 設計論点を一問ずつ詰める場合: `amadeus-grilling`
- ドメインモデルを磨く場合: `amadeus-domain-modeling`
- steering layer の初期化や補修: `amadeus-steering`
- 成果物の構造検証: `amadeus-validator`
