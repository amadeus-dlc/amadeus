---
name: amadeus
description: >-
  Amadeus の v2 ライフサイクルの単一公開入口。新しい作業テーマの開始、既存 Intent の継続や再開、
  次ステージの実行、Intent 化の判断が必要な場面では必ず使う。Intake（合流既定、受理条件の確認、scope 推定、
  Birth 提案）、Initialization（0.1〜0.3）、aidlc-state.md に基づく次ステージの解決だけを行い、
  ステージ成果物の作成はステージ内部 skill に委譲する。grilling、domain-modeling、event-storming、steering、validator の代替ではない。
---

# amadeus

## 目的

Amadeus ライフサイクルの単一公開入口として、Intake と次ステージの解決を行う。

ユーザーは phase やステージを選ばない。
入力から、既存 Intent の継続か、新しい Intent の Birth 提案かを判定し、対象 record の `aidlc-state.md` から次に実行するステージを解決して、対応するステージ内部 skill を呼び出す。

この skill 自身はステージ成果物を作らない。

## 前提

`aidlc/spaces/<space>/` の Space が存在することを前提にする。
Space は `aidlc/active-space`（なければ `default`）で解決する。
Space がない場合は停止し、先に `amadeus-steering` を使うよう案内する。

少なくとも次を読む。

- `aidlc/spaces/<space>/intents/active-intent`（存在する場合。現在作業中の record の dirName）
- `aidlc/spaces/<space>/intents/intents.json`（registry）
- `aidlc/spaces/<space>/intents/intents.md`
- 対象になり得る `aidlc/spaces/<space>/intents/<dirName>.md` と `<dirName>/aidlc-state.md`
- `aidlc/spaces/<space>/memory/`（org.md、team.md、project.md）

## Intake

入力を受けたら、次の順で判定する。

1. **継続判定**。入力が `active-intent` の指す Intent、または既存 Intent の続き（ゲートへの回答、修正指示、同じ主題の追加作業）であれば、その Intent のルーティングへ進む。判定に迷う場合は継続とみなす。新規扱いにするのは、既存 Intent の主題と無関係な、明確に別個の作業を名指ししている場合だけである。
2. **合流判定**。入力が既存 Intent のアウトカムに属する新しい作業であれば、新しい Intent を作らず、その Intent への合流を提案する。合流先は、対象 Intent に `ideation/scope-definition/intent-backlog.md` が存在する場合はスコープバックログへの追加、存在しない場合（scope が Scope Definition を実行しない、またはまだ実行していない）は Intent の要求成果物への追記にする。
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

## Initialization（Birth）

人間が Birth 提案を承認したら、Initialization phase（Stage 0.1〜0.3）を実行して Intent Record を作る。
Initialization の 3 ステージは全 scope で実行し、承認ゲートを持たない。

### 0.1 Workspace Scaffold

1. record の dirName を `<YYMMDD>-<label>` 形式で決める。日付は作業日のローカル日付の下 6 桁（YYMMDD）、label は小文字英数字とハイフンだけにする。同日同名は末尾に `-2`、`-3` の連番を付ける。
2. `aidlc/spaces/<space>/intents/<dirName>/` を作り、配下に 5 つの phase ディレクトリ（`initialization/`、`ideation/`、`inception/`、`construction/`、`operation/`）とその stage サブディレクトリ、`verification/`、`audit/` を作る。
3. Space に `knowledge/` がなければ作る。
4. `audit/audit.md` を作り、`WORKFLOW_STARTED` と、0.1 の `STAGE_STARTED`、`WORKSPACE_SCAFFOLDED`、`STAGE_COMPLETED` を追記する。イベントの形式は [references/audit-events.md](references/audit-events.md) に従う。

### 0.2 Workspace Detection

1. 対象リポジトリを読み取り専用で走査し、greenfield / brownfield、言語、フレームワーク、ビルドシステムを判定する。
2. `STAGE_STARTED`、`WORKSPACE_SCANNED`、`STAGE_COMPLETED` を audit に追記する。

### 0.3 State Initialization

1. `aidlc-state.md` を state template から生成する。template は [references/aidlc-v2/state-template.md](references/aidlc-v2/state-template.md) を使い、セクション構成と英語ラベルを変えない。
2. Project Information（Project、Project Type、Scope、Start Date、State Version 7）、Scope Configuration（実行対象ステージ、Depth）、Workspace State（0.2 の判定結果）を埋める。
3. Stage Progress を埋める。Initialization の 3 ステージは `[x]`、scope の実行対象は `[ ]`（`EXECUTE` 注記）、scope 外は `[S]`（`SKIP: out of <scope> scope` 注記）、Operation の 7 ステージは `[S]`（`SKIP: out of Amadeus scope` 注記）にする。scope とステージの対応は [references/stage-catalog.md](references/stage-catalog.md) に従う。brownfield では 2.1 を実行対象、greenfield では 2.1 を `[S]`（`SKIP: greenfield` 注記）にする。
4. 最初の実行対象ステージを `[-]` にし、Phase Progress（`Initialization` は `Verified`、最初の実行対象ステージの phase は `Active`、実行対象ステージのない phase は `Skipped`、残りは `Pending`）と Current Status、Session Resume Point を埋める。`Construction Autonomy Mode` は `unset` にする。
5. `STAGE_STARTED`、`WORKSPACE_INITIALISED`、`STAGE_COMPLETED` を audit に追記する。実行対象ステージのない phase には `PHASE_SKIPPED` を追記する。
6. registry を更新する。uuid を UUIDv7 で採番し（`bun -e "console.log(Bun.randomUUIDv7())"`）、`intents.json` に `{uuid, slug, dirName, scope, repos, status}` の行を追加する。`status` は `in_progress` にする。
7. Intent のモジュールファイル `<dirName>.md` をテンプレートから作る。モジュールファイルは `概要`、`依存`、`目標プロファイル` だけを持つ。分からない項目は空欄にせず `未確認` と書く。
8. `intents/active-intent` に dirName を書く。
9. `bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace>` で `intents.md` を再生成する。

テンプレートの優先順位は次である。

1. `aidlc/spaces/<space>/memory/templates/intents/intent-module.md`
2. この skill に同梱された `templates/intents/intent-module.md`

## ルーティング

対象 Intent が決まったら、次の手順でステージを解決する。

1. record の `aidlc-state.md` を読む。読み書きは、セクション見出し、チェックリスト行（`- [x] <stage-slug>` 形式）、フィールド行（`**Key**: value` 形式）だけを対象にし、書き込みは対象行の置換だけで行う。
2. Stage Progress のうち、Current Status の `Lifecycle Phase` に属するステージだけを判定対象にする。ステージの phase 帰属は [references/stage-catalog.md](references/stage-catalog.md) の Phase 列に従う。現在の phase に属さないステージは、状態に関わらず選択しない。
3. 判定対象がすべて `[x]` または `[S]` の場合は、手順 7 の phase 境界処理へ進む。
4. 判定対象から、checkbox が `[R]`、`[-]`、`[?]` のステージがあればそれを優先し、Condition を再判定せずに手順 6 へ進む。なければ、ステージ順序で最初の `[ ]` を選ぶ。
5. 選んだ `[ ]` のステージが `CONDITIONAL` の場合は、Condition を判定する。偽の場合は checkbox を `[S]` にして注記に skip 理由を書き、`audit/audit.md` に `STAGE_SKIPPED` イベントを追記して手順 3 へ戻る。
6. 選んだステージの checkbox を `[-]` にし、Current Status の `Current Stage` を更新し、`STAGE_STARTED` を追記して、ステージに対応する内部 skill を呼び出す。対応表は [references/stage-catalog.md](references/stage-catalog.md) に従う。対応する skill が利用できない場合は、実行せずに停止し、不足しているステージ skill 名を報告する。
7. phase 境界処理を行う。実行したステージが 1 つ以上ある phase は、phase PR の作成を案内し、merge の確認後に `PHASE_VERIFIED` イベント（Details に PR の URL）を追記して、Phase Progress を `Verified` にし、`Lifecycle Phase` を次へ進める。現在の phase が `CONSTRUCTION` の場合は、phase PR の案内の前に `construction/decisions.md` と `construction/traceability.md` を確定し、merge の確認後に Current Status の `Status` を `Completed` にし、`WORKFLOW_COMPLETED` を追記し、registry の `status` を `completed` にする。実行したステージが 1 つもない phase は、`PHASE_SKIPPED` イベントを追記し、Phase Progress を `Skipped` にして通過する。phase を進めたら手順 2 へ戻る。

phase 境界処理（phase PR の案内、`PHASE_VERIFIED` の記録、`Lifecycle Phase` の遷移）は、この skill だけが行う。
ステージ内部 skill には委譲しない。

現在の phase が `CONSTRUCTION` の場合、手順 4 から 6 のステージ選択と実行は、次の「Construction の Bolt 実行」に従う。

## Construction の Bolt 実行

Construction は Bolt を実行単位にする。

1. **Bolt の解決**。`inception/delivery-planning/bolt-plan.md` と Project Information の `Bolt Refs`、audit の `BOLT_STARTED` / `BOLT_COMPLETED` を照合し、開始済みで未完了の Bolt があればそれを続け、なければ計画順で最初の未実行 Bolt を選ぶ。Delivery Planning を実行しなかった scope では、Intent 全体を単一の暗黙 Bolt（識別子 `implicit`）として扱う。
2. **Bolt の開始**。branch と worktree を `memory/` の働き方（branch 戦略）に従って作り、Project Information の `Bolt Refs` に Bolt 識別子を追記し、`BOLT_STARTED` イベント（Bolt 名、walking skeleton かどうか）を追記する。
3. **Unit 単位ステージの実行**。Bolt に束ねた Unit ごとに、Stage 3.1 から 3.5 をステージ順で解決し、対応する内部 skill を呼び出す。Unit 単位の checkbox は、CONSTRUCTION PHASE の `Per unit: <unit>` ブロックで管理する。
4. **Build and Test**。Bolt 内の全 Unit の Code Generation 完了後に、Stage 3.6 を 1 回呼び出す。失敗時は autonomy に関わらず停止して人間に確認する（halt-and-ask）。
5. **Bolt 境界処理**。Build and Test の成功後、Bolt PR の作成を案内する。merge の確認後、`BOLT_COMPLETED` イベント（Details に PR の URL）を追記する。`Construction Autonomy Mode` が `autonomous` の Bolt では、この merge をもって Bolt 内の各ステージの `[?]` を `[x]` に確定し、`STAGE_COMPLETED`（Details に PR の URL）を追記し、Bolt 内の Functional Design が `domain-entities.md` に記録した `Domain Map と Context Map への反映候補` のうち採用判断が確定したものを、Domain Map と Context Map へ反映する。
6. **walking skeleton ゲート**。最初の Bolt は、autonomy の設定に関わらず、設計成果物と生成コードをまとめて必ず人間が承認する（Bolt PR の merge で確定する）。
7. **ladder 提案**。walking skeleton の merge 直後に一度だけ、残りの Bolt の進め方を確認し、回答を Current Status の `Construction Autonomy Mode` に記録し（`autonomous` または `gated`）、`AUTONOMY_MODE_SET` イベントを追記する。選択肢は「autonomous（残りの Bolt をゲートなしで実行する。失敗時は停止して確認する）」と「gated（Bolt ごとにゲートを提示する）」の 2 つである。
8. **反復**。次の Bolt があれば手順 1 へ戻る。全 Bolt 完了後、Stage 3.7 を Intent 単位で解決する。
9. **phase 境界**。3.7 の完了（または skip）後、`construction/decisions.md` と `construction/traceability.md` を確定し、phase PR を案内する。merge の確認後、`PHASE_VERIFIED` を追記し、Phase Progress の `Construction` を `Verified` にし、`Status` を `Completed` にし、`WORKFLOW_COMPLETED` を追記し、registry の `status` を `completed` にする。

ステージゲートで停止中の Intent を再開した場合は、ゲートの提示から再開する。
`[R]` からの再開は、ステージを最初からやり直さず、前回の成果物と差し戻し理由を提示してから修正に入る。

## ゲート

ステージの完了承認はステージ内部 skill が提示する。
この skill は、phase 境界の PR 作成の案内と、phase 境界イベントの記録だけを扱う。

ゲートを提示したターンでは、人間の回答を待つ。
回答を推測して先へ進まない。

## 禁止事項

- 人間の承認なしに Intent を作らない。承認前にモジュールファイルや `aidlc-state.md` を作らない。
- Unit 数や Bolt 数の見込みで Intent 化を判定しない。
- scope が SKIP にするステージを実行しない。
- ステージ成果物をこの skill で直接作らない。
- `intents.md` を手書きしない。
- `audit/` の記録済みイベントを書き換えない。追記だけを行う。
- record の scaffold を Initialization の外で作らない。

## 次の skill

- ステージの実行: [references/stage-catalog.md](references/stage-catalog.md) の対応表にあるステージ内部 skill
- 設計論点を一問ずつ詰める場合: `amadeus-grilling`
- ドメインモデルを磨く場合: `amadeus-domain-modeling`
- Space の初期化や補修: `amadeus-steering`
- 成果物の構造検証: `amadeus-validator`
