# Amadeus Intent 設計メモ

## 目的

このメモは、Intent 登録を扱う公開入口を `amadeus-intent` として整理する方針を記録する。

目的は、Intent の新規登録、登録層の補修、Ideation 前の最小調整を1つの入口で扱えるようにし、他の phase skill と同じ再実行モデルに揃えることである。

## 背景

現在の入口名 `amadeus-intent-init` は、新規作成専用に見える。

一方で、Intent の登録層には、新規登録だけでなく、一覧、モジュールファイル、モジュールディレクトリ、状態ファイルの不整合を補修したい場面がある。

また、Ideation へ進む前であれば、Intent の目的、成功条件、範囲、依存関係を最小調整したい場面もある。

`amadeus-ideation`、`amadeus-inception`、`amadeus-construction` は、1つの公開入口が既存状態を読んで `guided`、`refine`、`repair` を判定する。

Intent 登録だけを `init` と `update` の別入口に分けると、この方針と揃わない。

## 判断

`amadeus-intent-init` は `amadeus-intent` に改名する。

互換 alias は残さない。

`amadeus-intent` は Intent の登録、登録層の補修、Ideation 前の最小調整を扱う公開入口にする。

新規登録後の `state.json.phase` は、従来どおり `initialized` にする。

`amadeus-intent` は skill 名であり、`initialized` は Intent が登録済みで Ideation 前である状態を表す phase 名である。

## 責務

`amadeus-intent` は登録層だけを扱う。

登録層に含めるものは次である。

- Intent のモジュールファイル。
- Intent のモジュールディレクトリ。
- `.amadeus/intents.md`。
- `.amadeus/intents/<intent-id>-<slug>/state.json`。
- Intent の目的、成功条件、範囲。
- Intent の依存関係。

`amadeus-intent` は次を扱わない。

- Ideation 成果物。
- Requirement。
- Story。
- Use Case。
- Unit。
- Bolt。
- Acceptance / Traceability。
- Construction 成果物。
- 実装方針。

## 実行モード

`amadeus-intent` の実行モードは次の5つにする。

- `auto`
- `guided`
- `scaffold-only`
- `refine`
- `repair`

既定モードは `auto` にする。

`guided` は、新しい Intent を登録する。

`scaffold-only` は、質問せず、分かる情報だけで新しい Intent を登録する。

`refine` は、`state.json.phase` が `initialized` の場合だけ許可する。

`refine` は、Intent のモジュールファイルの目的、成功条件、範囲、依存関係の最小調整だけを扱う。

`repair` は、`state.json.phase` に関係なく許可する。

`repair` は、登録層の構造補修だけを扱う。

## auto 判定

`auto` は対象 Intent の状態を読み、実行モードを判定する。

判定では、`state.json.phase` だけを信頼しない。

既存の Ideation、Inception、Construction 成果物も読み、`state.json.phase` と実際の成果物段階が一致しているか確認する。

`state.json.phase` が `initialized` でも下流成果物が存在する場合は、`refine` を実行しない。

その場合は、登録層の構造不整合として `repair` を先に実行する。

判定規則は次である。

| 状態 | 自動選択 | 理由 |
|---|---|---|
| Intent ID が未指定で、新規テーマがある | `guided` または `scaffold-only` | 新しい Intent 登録の依頼だから |
| Intent ID が指定され、登録層の構造だけが壊れている | `repair` | 登録層の補修が目的だから |
| Intent ID が指定され、`state.json.phase` と既存 phase 成果物が矛盾している | `repair` | phase 復元を先に行う必要があるから |
| Intent ID が指定され、`phase: initialized` で目的、成功条件、範囲、依存関係の調整依頼である | `refine` | Ideation 前の登録層調整だから |
| Intent ID が指定され、`phase: ideation` 以降で内容更新の依頼である | 停止 | 下流成果物との整合判断が必要だから |

`phase: ideation` 以降で内容更新の依頼を受けた場合は、現在 phase の skill または `amadeus-discovery` を案内する。

## refine

`refine` は、`phase: initialized` の Intent だけを対象にする。

`refine` の前に、Ideation、Inception、Construction 成果物が存在しないことを確認する。

下流成果物が存在する場合は、`state.json.phase` が `initialized` でも `refine` を実行しない。

その場合は `repair` で phase を整合させてから、現在 phase の skill に戻す。

Discovery 由来の Intent か、手動登録された Intent かは問わない。

`refine` で質問が必要な場合、そのターンでは成果物を更新しない。

ユーザーの回答を受け取ってから、登録層だけを最小更新する。

`phase: ideation` 以降の Intent に対して、`amadeus-intent` は目的、成功条件、範囲を更新しない。

その場合は、現在 phase の `refine` に戻す。

## repair

`repair` は、`phase` に関係なく登録層の構造だけを補修する。

許可する補修は次である。

- `.amadeus/intents.md` の対象行を追加または整合させる。
- `.amadeus/intents.md` の詳細リンクを整合させる。
- Intent のモジュールファイルを復元する。
- Intent のモジュールディレクトリを復元する。
- `state.json` を復元する。
- `.amadeus/intents.md` の依存欄と依存関係表を整合させる。

Intent のモジュールファイルが欠けている場合は、復元元がある場合だけ再生成する。

復元元は `.amadeus/intents.md`、`state.json`、既存 phase 成果物、Grilling Decision Trail の確定判断に限定する。

復元できない目的、成功条件、範囲は `未確認` と書く。

`state.json` が欠けている場合は、既存成果物から `phase` を復元する。

`state.json.phase` が既存 phase 成果物と矛盾している場合も、同じ優先順位で `phase` を補修する。

`phase` 復元の優先順位は次である。

1. Construction 成果物がある場合は `construction`。
2. Inception 成果物がある場合は `inception`。
3. Ideation 成果物がある場合は `ideation`。
4. phase 成果物がない場合は `initialized`。

`phase` を復元しても、gate は推測で `passed` にしない。

既存 gate 値が残っていて妥当な場合は維持する。

復元できない gate は `not_ready` にする。

gate の `passed` 判断は該当 phase skill に委ねる。

`.amadeus/intents.md` に登録行がない場合は、対象 Intent のモジュールファイルまたはモジュールディレクトリが存在するときだけ登録行を追加する。

依存関係が復元できない場合、依存欄と依存関係表の理由は `未確認` にする。

`なし` は、単独で成立すると判断できる場合だけ使う。

`.amadeus/intents.md` に登録行はあるが、対象のモジュールファイルとモジュールディレクトリが両方ない場合は停止する。

一覧だけを根拠に空の Intent を再生成しない。

## Grilling Decision Trail

`guided` または `refine` で質問した場合は、そのターンでは成果物を更新しない。

回答が Intent の目的、成功条件、範囲、依存関係、登録判断に影響する場合だけ、Intent のモジュールディレクトリ配下の `grillings.md` と `grillings/Gxxx-*.md` を更新する。

`repair` では原則として Grilling Decision Trail を増やさない。

## Discovery との関係

Discovery から Intent を作る次アクション表記は、`amadeus-intent` に統一する。

`decision: single_intent` の場合は、`amadeus-intent` に Intent Draft を渡す。

`decision: multi_intent` の場合は、`recommended` の Intent 候補を `amadeus-intent` に渡す。

`decision: existing_intent_update` の案内先は対象 Intent の phase で分岐する。

| 対象 Intent の phase | 案内先 |
|---|---|
| `initialized` | `amadeus-intent refine` |
| `ideation` | `amadeus-ideation refine` |
| `inception` | `amadeus-inception refine` |
| `construction` | `amadeus-construction refine` |

## 表記方針

利用者向けの操作名は「Intent 登録」に寄せる。

skill 名は `amadeus-intent` にする。

phase 名、state ブロック名、examples の snapshot 名としての `initialized` は維持する。

旧名 `amadeus-intent-init` への参照は、単純置換だけでなく、説明文を「Intent 登録、登録層の補修、Ideation 前の最小調整」に合わせて書き直す。

## 実装対象

実装では少なくとも次を変更する。

- `skills/amadeus-intent-init/` を `skills/amadeus-intent/` に移す。
- `.agents/skills/amadeus-intent-init/` を `.agents/skills/amadeus-intent/` に移す。
- `SKILL.md` の `name`、説明、実行モード、責務境界を更新する。
- Discovery、Event Storming、Ideation、Inception、Domain Modeling、Steering の案内先を更新する。
- README、AMADEUS、docs、examples、eval、dev scripts、validator の参照を更新する。
- テンプレート所有元を `skills/amadeus-intent/templates/intents/initialized.*` に移す。

examples の snapshot 名 `02-intent-initialized` は変更しない。

この名前は skill 名ではなく、`initialized` phase を表すためである。
