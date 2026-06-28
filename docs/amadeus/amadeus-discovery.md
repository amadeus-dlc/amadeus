# Amadeus Discovery

## 背景

Amadeus では、課題サイズが明確な場合は `amadeus-intent-init` で Intent を初期化できる。

しかし、入力テーマが巨大または曖昧な場合、そのまま Intent を作ると Intent が過大になる。
たとえば `ECサイトを作りたい` のような入力は、単一 Intent ではなく複数 Intent の候補に分けて扱う必要がある。

また、入力テーマが新規 Intent なのか、既存 Intent の更新なのか、まだ調査だけに留めるべきなのかも、初期入力だけでは判断できない。
そのため、Intent を作る前に課題粒度、既存 Intent との関係、次に進めるべき入口を整理する layer が必要である。

## 判断

**Discovery** は、Steering と Intent の間に置く正式 layer として扱う。

Discovery は、入力テーマをそのまま Intent 化しない。
Discovery は `amadeus-grilling` で必要なだけ確認し、Intent 化方針を判定する。

Discovery は `amadeus-intent-init` の置き換えではない。
課題サイズが明確な場合は、従来どおり `amadeus-intent-init` を使う。
課題サイズが曖昧、大きい、または既存 Intent との関係が不明な場合は、`amadeus-discovery` を使う。

```text
Steering
  ├─ amadeus-discovery -> Discovery -> amadeus-intent-init -> Intent
  └─ amadeus-intent-init -> Intent
```

`amadeus-discovery` は Discovery を完了しても、`amadeus-intent-init` を自動実行しない。
Intent を作るには、人間の明示指示を必要とする。

## 責務

`amadeus-discovery` は、Intent 化前の入力テーマを交通整理する。

`amadeus-discovery` は次を行う。

- 入力テーマを記録する。
- 既存 Discovery との重複を確認する。
- 既存 Intent との関係を確認する。
- `amadeus-grilling` で課題粒度、課題境界、成功状態、除外範囲、依存順序を確認する。
- 単一 Intent、複数 Intent、既存 Intent 更新、調査のみ、Intent 不要のいずれかを判定する。
- 判定理由と推奨次アクションを記録する。

`amadeus-discovery` は次を行わない。

- Requirement を定義しない。
- Use Case を定義しない。
- Unit を定義しない。
- Bolt を分割しない。
- Task を分解しない。
- 実装方針を決めない。
- `amadeus-intent-init` を自動実行しない。

## 成果物構造

Discovery layer は `.amadeus/discoveries/**` に置く。

```text
.amadeus/
  discoveries.md
  discoveries/
    <discovery-date>-<slug>.md
    <discovery-date>-<slug>/
      state.json
```

**Discovery ID** は Discovery 正本ファイルと Discovery ディレクトリの stem 全体である。
Discovery ID は workspace 内で一意にする。

Discovery ID は `discovery-date` と `slug` で構成する。

`discovery-date` は作成日を表す。

```text
YYYYMMDD
```

`slug` は入力テーマを短く表すラベルにする。
Discovery ID は `<discovery-date>-<slug>` にする。
同じ日に同じ `slug` が既に存在する場合は、`slug` に短い識別語を追加して一意にする。

Discovery ID の例は次である。

```text
20260628-ec-site
```

Discovery と Intent は別 namespace として扱う。

## Discovery 一覧

`.amadeus/discoveries.md` は Discovery の一覧である。

`.amadeus/` がない workspace では、`amadeus-discovery` は停止して `amadeus-steering` を案内する。
`.amadeus/` があり、`.amadeus/discoveries.md` がない場合は、`amadeus-discovery` が作成してよい。

`amadeus-steering` は、新規 workspace 初期化時に空の `.amadeus/discoveries.md` を作る。

標準形式は次である。

```md
# Discovery 一覧

## 一覧

| 識別子 | テーマ | 状態 | 判定 | 推奨次アクション | 詳細 |
|---|---|---|---|---|---|
```

`詳細` は `discoveries/<discovery-date>-<slug>.md` を指す。
`識別子` は Discovery ID を書く。

## state.json

Discovery ごとに `state.json` を置く。

最小構造は次である。

```json
{
  "schemaVersion": 1,
  "phase": "discovery",
  "status": "in_progress",
  "decision": "undecided",
  "gate": "not_ready"
}
```

`state.json` は機械判定用に絞る。
入力テーマ、確認した前提、判定理由は `Discovery 正本ファイル` に置く。

`status` は最初は次の2値にする。

```text
in_progress
completed
```

`status` は Discovery の判定作業状態だけを表す。
Intent 候補の進行状態は `Discovery 正本ファイル` の Intent 候補表に置く。

`status: completed` は Discovery の判定が完了したことを表す。
`decision: multi_intent` で待機候補が残っていても、判定が完了していれば `completed` にできる。

`initialized` や `waiting` は Intent 候補表の状態であり、Discovery の `status` には使わない。

`gate` は次の2値にする。

```text
not_ready
passed
```

`decision` は次の6値にする。

```text
single_intent
multi_intent
existing_intent_update
research_only
no_intent
undecided
```

`state.json` に `targetIntents` のような配列は持たせない。
Intent 候補の状態と Intent へのリンクは `Discovery 正本ファイル` の表で管理する。

## 判定別責務

判定ごとの必須内容、追加 gate 条件、推奨次アクションは次に集約する。

| decision | Intent Draft | Intent 候補 | 既存 Intent | gate: passed の追加条件 | 推奨次アクション |
|---|---|---|---|---|---|
| `single_intent` | 必須 | `該当なし` | 関係があれば記録 | なし | `amadeus-intent-init` に Intent Draft を渡す |
| `multi_intent` | `該当なし` | 2件以上必須 | 関係があれば記録 | 未初期化なら `recommended` が1件だけあり、初期化済み候補があれば `recommended` が0件または1件である | `recommended` の Intent 候補がある場合は `amadeus-intent-init` に渡す |
| `existing_intent_update` | `該当なし` | `該当なし` | 対象を1件だけ記録 | 対象既存 Intent が1件だけある | 対象 Intent の該当 phase skill を使う |
| `research_only` | `該当なし` | `該当なし` | 関係があれば記録 | 調査論点が記録されている | `amadeus-grilling` 継続または none |
| `no_intent` | `該当なし` | `該当なし` | 関係があれば記録 | Intent にしない理由が記録されている | none |
| `undecided` | `該当なし` | `該当なし` | 関係があれば記録 | `gate: passed` にできない | `amadeus-grilling` 継続 |

## Discovery 正本ファイル

`Discovery 正本ファイル` は、人間向けの判断記録である。

必須見出しは次である。

```md
# <テーマ> Discovery Brief

## 入力テーマ
## 確認した前提
## 判定
## 判定理由
## Intent Draft
## Intent 候補
## 候補判断
## 既存 Intent との関係
## 推奨次アクション
```

`state.json.decision` と `Discovery 正本ファイル` の `判定` は一致させる。
値が矛盾する場合は validator が失敗させる。

判定ごとの必須内容は、「判定別責務」に従う。
対象外の見出しには `該当なし` を明記する。
空欄にはしない。

## Intent Draft

`decision: single_intent` の場合、`Discovery 正本ファイル` に Intent Draft を含める。

Intent Draft は、`amadeus-intent-init` に渡すための軽量な入力である。
Requirement、Use Case、Unit、Bolt、Task は書かない。

標準形式は次である。

```md
## Intent Draft

| 項目 | 内容 |
|---|---|
| Intent 名 | 商品を閲覧できる |
| 課題 | 利用者が商品を探せない |
| 成功状態 | 商品一覧と商品詳細を見られる |
| 除外範囲 | カート、決済、注文管理 |
```

## Intent 候補

`decision: multi_intent` の場合、`Discovery 正本ファイル` に複数の Intent 候補を置く。

`amadeus-discovery` は複数 Intent の一括初期化を推奨しない。
最初に作るべき Intent を1つ推奨し、残りは待機候補として残す。

標準形式は次である。

```md
## Intent 候補

| 候補 | 状態 | Intent | 課題 | 成功状態 | 除外範囲 | 依存 |
|---|---|---|---|---|---|---|
```

`状態` は次の4値にする。

```text
recommended
waiting
initialized
discarded
```

`recommended` は、次に Intent 化する候補を表す。
Discovery 完了時点でまだ Intent 化された候補がない場合は、`recommended` を1件だけ置く。

`initialized` は、既に Intent 化された候補を表す。
`amadeus-intent-init` が `recommended` の候補を Intent 化した後は、対象候補の `状態` を `initialized` に変更する。
このとき、別の候補を次に Intent 化すると決めていないなら、`recommended` は0件でよい。

`Intent` は未作成なら `未作成` と書く。
作成済みなら `../intents/<intent-id>.md` への相対リンクを書く。

`amadeus-intent-init` が Discovery Brief の候補を Intent 化した場合、対象候補の `状態` を `initialized` に更新し、`Intent` に作成済み Intent へのリンクを書く。

`amadeus-discovery` は既存 Discovery の候補を `discarded` に更新できる。
ただし `initialized` 済み候補を人間確認なしに `discarded` にしない。

## 候補判断

`候補判断` には、Intent 候補の採用、不採用、破棄、待機の理由を残す。

候補表には状態だけを置き、理由は `候補判断` に分ける。

標準形式は次である。

```md
## 候補判断

| 候補 | 判断 | 理由 |
|---|---|---|
| 管理者が商品を登録できる | discarded | 今回の利用者価値の検証には不要 |
```

## 既存 Discovery と既存 Intent

`amadeus-discovery` は、既存 Discovery を必ず確認する。

最低限読むものは次である。

```text
.amadeus/discoveries.md
.amadeus/discoveries/*.md
.amadeus/discoveries/*/state.json
```

同じテーマ、近いテーマ、未完了 Discovery がある場合は、新規作成ではなく既存 Discovery の再開または補修を優先する。

`amadeus-discovery` は、既存 Intent も必ず確認する。

最低限読むものは次である。

```text
.amadeus/intents.md
.amadeus/intents/*.md
.amadeus/intents/*/state.json
```

必要な場合は、関連しそうな既存 Intent の `scope.md`、`requirements.md`、`traceability.md` まで読む。
ただし Discovery は Intent 境界判断を行う layer であり、Ideation や Inception の代替にはしない。

`decision: existing_intent_update` の場合、`Intent Draft` は `該当なし` にする。
対象既存 Intent は `既存 Intent との関係` に1つだけ記録する。
複数候補の比較は残してよいが、`gate: passed` には対象既存 Intent を1つに絞る。
複数候補の比較を残す場合は、`既存 Intent との関係` に比較表として置く。

## Grilling 方針

`amadeus-discovery` は、必要なだけ `amadeus-grilling` を行う。

質問回数の上限や下限は設けない。
ただし質問範囲は Discovery の責務に限定する。

質問対象は次である。

- 入力テーマの課題。
- 利用者または影響対象。
- 成功状態。
- 除外範囲。
- 既存 Discovery との関係。
- 既存 Intent との関係。
- Intent として大きすぎるか。
- Intent 候補間の依存順序。
- 最初に Intent 化すべき候補。

質問対象外は次である。

- Requirement 詳細。
- Use Case 詳細。
- Unit Design Brief。
- Bolt 分割。
- Task 分解。
- 実装方針。

## Gate 条件

Discovery が `gate: passed` になるには、次を満たす必要がある。

- 入力テーマが記録されている。
- grilling で確認した前提が記録されている。
- `decision` が `undecided` ではない。
- 判定理由が書かれている。
- 推奨次アクション、または no-action 理由が書かれている。

判定ごとの追加条件は、「判定別責務」に従う。

## 推奨次アクション

Discovery の `推奨次アクション` は、「判定別責務」に従う。

`decision: multi_intent` では、残りの候補を Discovery Brief の待機候補として残す。
`recommended` が0件の場合、すぐに Intent 化する候補はない。
次の候補を進める場合は、`amadeus-discovery` で待機候補から1件だけ `recommended` に変更してから `amadeus-intent-init` を使う。

`research_only` は専用 phase へ進めない。
必要な場合は `Discovery 正本ファイル` に調査すべき論点を残す。
現時点では `.amadeus/research/**` は作らない。

`no_intent` は、Amadeus の Intent lifecycle に載せる価値がない入力に使う。
ただし Discovery を起こした場合は、Intent にしなかった理由を `Discovery 正本ファイル` に残す。

## amadeus-intent-init との関係

`amadeus-intent-init` は、課題サイズが明確な場合の入口である。

`amadeus-intent-init` は、巨大または曖昧な入力を受けた場合、`amadeus-discovery` を案内して停止する。
自動で Discovery を開始しない。

Discovery 後に Intent を作る場合、`amadeus-intent-init` は Discovery Brief を読む。
`state.json.gate` が `passed` でなければ停止する。

`decision: single_intent` の場合、`amadeus-intent-init` は `Intent Draft` を入力にする。
`decision: multi_intent` の場合、`amadeus-intent-init` は `recommended` の候補だけを入力にする。
人間が待機候補を指定した場合でも、先に `amadeus-discovery` で対象候補を `recommended` に変更する。

`amadeus-intent-init` は Intent 作成後に、同じ操作の中で Discovery 成果物を更新する。

更新対象は次である。

- `Discovery 正本ファイル`：`decision: single_intent` では、`推奨次アクション` に作成済み Intent へのリンクと次に使う phase skill を書く。
- `Discovery 正本ファイル`：`decision: multi_intent` では、対象候補の `状態` を `initialized` にし、`Intent` に作成済み Intent へのリンクを書く。
- `.amadeus/discoveries.md`：対象 Discovery の `状態`、`判定`、`推奨次アクション`、`詳細` を `state.json` と `Discovery 正本ファイル` に合わせる。
- `state.json`：`status`、`decision`、`gate` を再判定する必要がある場合だけ更新する。

`state.json` に Intent へのリンクや候補状態は持たせない。

Intent 作成、Discovery `Discovery 正本ファイル` 更新、`.amadeus/discoveries.md` 更新、必要な `state.json` 更新は一体の操作として扱う。
いずれかを完了できない場合は停止し、部分更新を成功として扱わない。

## Validator 方針

`amadeus-validator` は Discovery layer も検証対象にする。

validator は次を検査する。

- `.amadeus/discoveries.md` が存在する。
- `.amadeus/discoveries.md` の `一覧` 表に必須列がある。
- `詳細` リンクが存在する。
- `.amadeus/discoveries.md` の対象行が `state.json` と `Discovery 正本ファイル` に対応している。
- 各 Discovery に `Discovery 正本ファイル` と `state.json` がある。
- `state.json.phase` が `discovery` である。
- `state.json.status` が許可値である。
- `state.json.gate` が許可値である。
- `state.json.decision` が許可値である。
- `state.json.decision` と `Discovery 正本ファイル` の `判定` が一致する。
- `gate: passed` の場合に gate 条件の構造を満たす。
- `decision: multi_intent` の場合に Intent 候補が2行以上ある。
- `decision: multi_intent` の場合、`initialized` が0件なら `recommended` の候補が1件だけある。
- `decision: multi_intent` の場合、`initialized` が1件以上なら `recommended` の候補が0件または1件である。
- `initialized` の Intent 候補が存在する Intent へリンクしている。

validator は構造検査に留める。
本文の意味的妥当性、課題理解の正しさ、分割判断の品質、推奨 Intent の事業上の妥当性は扱わない。

## 非採用

Discovery を `.amadeus/intents/**` 配下には置かない。
Discovery は Intent 前段の layer であり、Intent ID が確定する前に Intent ディレクトリを作らない。

Discovery の成果物を `docs/**` には置かない。
`docs/amadeus/amadeus-discovery.md` は設計メモであり、実行時の Discovery 成果物ではない。

外部 skill との対応関係はこの文書に書かない。
Amadeus の lifecycle と成果物だけで説明する。

質問回数の固定制限は置かない。
質問を制限するのは回数ではなく、Discovery の責務範囲である。
