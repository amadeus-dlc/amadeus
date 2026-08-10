# NFR Requirements を省略する scope で NFR Design の契約と nfr-budget が矛盾する

## 概要

`self-feature` scope は、NFR Requirements を `SKIP` しながら NFR Design を `EXECUTE` する構成を意図的に採用しています。しかし NFR Design の stage 条件は「NFR Requirements が skipped なら skip」と規定し、`nfr-budget` sensor も sibling の NFR Requirements に安定 ID が存在しない場合は NFR Design の全成果物を `missing-nfr-ids` と判定します。このため、正当な `consumes_absent.expected=true` の実行でも stage 契約と sensor が恒常的に矛盾します。

## 証拠と再現

影響を確認した revision: `82e2f30c0c6d1bbebeb3d6201584a314306d00ac`

1. `self-feature` scope で Intent を開始します。
2. scope 定義により `nfr-requirements` は `SKIP`、`nfr-design` は `EXECUTE` になります。
3. NFR Design directive は NFR Requirements の各入力を `consumes_absent.expected=true` として発行し、NFR Design 成果物の生成を要求します。
4. `nfr-budget` を NFR Design 成果物へ適用すると、sibling の NFR Requirements に宣言 ID がないため `missing-nfr-ids` になります。

関連する公開 source:

- `packages/framework/core/scopes/amadeus-self-feature.md`: NFR Requirements を省略し、NFR Design を残す意図を明記。
- `packages/framework/core/amadeus-common/stages/construction/nfr-design.md`: NFR Requirements が skipped の場合に NFR Design を skip する条件と、upstream ID の参照契約を定義。
- `packages/framework/core/tools/amadeus-sensor-nfr-budget.ts`: sibling の NFR Requirements ID を NFR Design 計測の分母として必須扱い。

## 期待する挙動

scope が NFR Requirements を意図的に省略し、NFR Design を実行する場合でも、stage 条件・input contract・sensor が同じモデルに合意し、正当な NFR Design 成果物が構造的な偽陽性を受けないこと。

## 実際の挙動

エンジンは期待どおり NFR Design を実行しますが、stage の宣言条件は実行を否定し、`nfr-budget` は全成果物を `missing-nfr-ids` と判定します。成果物の内容を改善しても sibling stage 自体が省略されているため解消できません。

## 受け入れ条件

1. NFR Requirements を省略し NFR Design を実行する scope の契約を一意に定義する。
2. NFR Design の stage 条件、`requires_stage`、required consumes をその契約へ整合させる。
3. `nfr-budget` は意図的な upstream 省略を認識し、構造的な `missing-nfr-ids` 偽陽性を出さない。
4. NFR Requirements を実行する通常 scope では、既存の ID traceability と budget 検証を維持する。
5. `self-feature` の scope consistency と NFR sensor の回帰テストを追加する。

## 起票結果

- [Issue #2773](https://github.com/amadeus-dlc/amadeus/issues/2773)
