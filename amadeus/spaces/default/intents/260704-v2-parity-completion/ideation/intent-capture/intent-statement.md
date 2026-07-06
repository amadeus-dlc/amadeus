# Intent Statement：260704-v2-parity-completion

## 目的

AI-DLC v2（awslabs/aidlc-workflows、v2 branch）との完全一致を完成させる。
柱は 3 本である。

- **A（成果物の双方向一致）**：v2 規定なのに未生成または不一致の成果物を補完し、v2 の成果物で代替できる重複独自ファイルを削除する。
- **B（skill 一覧の一致）**：対応漏れ 15 skill を追加し、独自 skill は amadeus-grilling、amadeus-domain-modeling、amadeus-validator の 3 個だけを残して削除する。
- **C（TS エンジン駆動化）**：状態遷移、ルーティング、gate 判定、audit 記録を TS エンジンに移し、skill を薄いラッパーにする。

基本戦略は、本家 `dist/claude/` からの適応コピーである（MIT-0）。
適応点は 2 つで、skill 名を amadeus-* へ改名すること、質問提示を amadeus-grilling プロトコルへ結線することである。

## 対象

主対象は Amadeus 本体開発者（このリポジトリでの自己開発）である。
痛みは、散文駆動入口によるコンテキスト消費と挙動の不安定さ、および本家との乖離を手作業で追跡するコストである。

副次対象は、将来 Amadeus を導入する利用チームである。

## 成功条件

次の 3 点をすべて満たしたとき、成功と観測する。

1. パリティ検査が機械化され green である。本家 `dist/claude/` との skill 一覧と成果物一覧の差分がゼロである（amadeus-* への名前写像を適用し、意図的な除外と結線層は除外リストに明記する）。
2. `npm run test:all` が green である。
3. この Intent 自身が、新エンジン駆動でライフサイクルを 1 周完走している。

保存する振る舞いは次である。

- 記述系成果物とユーザー向け gate 文言の日本語規範。
- 独自 3 skill（amadeus-grilling、amadeus-domain-modeling、amadeus-validator）の機能。

## 契機

Issue #396（v2 完全準拠後の独自色再評価）の Intake 整理で、#387 / PR #389 の準拠に要求漏れがあったと判明した。
漏れは成果物ファイルだけでなく、skill 一覧（15 skill）と実行アーキテクチャ（TS エンジン駆動）にも及んでいた。

## 範囲

含めるもの:

- 対応漏れ 15 skill の適応コピー（`amadeus-init` 相当、session-cost、replay、outcomes-pack、scope 系 4 個、Operation 系 7 個）。
- Operation phase（4.1〜4.7）の完全採用と「Operation は Amadeus 対象外」契約の撤廃。
- TS エンジン（orchestrate、utility 相当）と sensor 機構のコピー、および amadeus-grilling との結線。
- v2 規定成果物の補完（Initialization 出力、`verification/phase-check-<phase>.md`、questions ファイルの A〜E+X 形式、audit shard、`decision-log.md`、3.6 成果物名の再確認）。
- 重複独自ファイルの削除（grillings は `<stage>-questions.md` と `decision-log.md` へ分解吸収）。Issue #396 の 7 論点の採否確定を含む。
- 独自 skill の削除（amadeus-learning-review、amadeus-decision-review、amadeus-history-review、amadeus-domain-grilling、amadeus-event-storming）と amadeus-steering の 0.1 / 2.2 への畳み込み。
- 規範改定（SKILL.md と TS スクリプトの英語必須化、sensor 採用に伴う Issue #393 判断の上書き、backward-compatibility の記録）。
- amadeus-validator の新成果物契約への追従。
- パリティ検査の機械化。

含めないもの:

- 完了済み 2 record（260703-aidlc-v2-full-compliance、260703-amadeus-skill-english-rollout-plan）の新形式への移行（現状のまま残す）。
- 独自 3 skill（grilling、domain-modeling、validator）の削除または縮小。
- 記述系成果物の英語化。
- 本家 `dist/claude/` に存在しない新機能の追加。
