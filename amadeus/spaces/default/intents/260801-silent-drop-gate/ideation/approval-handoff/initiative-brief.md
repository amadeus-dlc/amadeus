# Initiative Brief — no-silent-drop

## 上流入力とフェーズ判断

本 Brief は `intent-statement.md`、`scope-document.md`、`intent-backlog.md`、`feasibility-assessment.md`、`constraint-register.md` を統合する。`competitive-analysis.md`、`team-assessment.md`、`wireframes.md` は Market Research、Team Formation、Rough Mockups が明示的に SKIP のため未生成である。本 self-feature は既存 Amadeus の開発・CI・配布契約を改善する内部 initiative であり、これら3成果物の欠如は Inception 進入を妨げない。

**推奨判断: GO。** Ideation の意図、実現可能性、スコープ、優先バックログは整合している。実装前依存の解消と検証基準を保持したまま、Inception の Reverse Engineering へ引き渡せる。

## Intent と解決する問題

Amadeus の主要な欠陥族は、失敗を成功に見せる「無音化」である。分類済みバグ181件中53件（29%）を占め、直近の S1-FATAL 3件も同族だった。個別修正と人手棚卸しの反復から脱却するため、次の3形態を構造的に検出し、実行時も fail-closed にする。

1. 空またはログだけで終了する catch
2. 成否を返す emit 系・Result 系呼び出しの戻り値破棄
3. 永続化を伴わない emit や、実態なしに成功を返す偽成功

受益者は、CI で早期検出するフレームワーク開発者と、state / audit の信頼性向上を受ける Amadeus ユーザーである。

## 投資根拠と市場検証の扱い

`competitive-analysis.md` は未生成である。外販製品の市場選定ではなく、既存リポジトリで反復する欠陥族への自己改善であるため、投資根拠は内部実測に置く。

- 無音化53件、分類済みの29%
- 同根の棚卸しが #1849→#1874/#1878、#1860→#1961/#1963 と反復
- 新規防止ゲートがなく、既存の callsite guard / complexity gate には shrink-only ratchet の再利用可能な先行例がある

## スコープ境界

### In

- 固定 ast-grep と3形態の検出ルール、positive / negative fixture
- 手書き正本 `packages/framework/core/`、`packages/framework/harness/`、`scripts/` の census
- 理由付き baseline / 単一ノード exemption と、両者の shrink-only ratchet
- ツール・ルール・baseline・走査異常の型付き fail-closed
- #1878・#1874 のランタイム fail-closed 修正
- [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) による #1963 修正の回帰検証
- blocking CI、配布再生成、Comprehensive テスト、再現可能な完了証跡

### Out

- #1906、#1878・#1874 以外の既存真陽性の一括修正
- #1963 の重複実装、生成投影の手編集、テスト fixture の本番走査
- Biome 全般、汎用静的解析基盤、無関係な runtime 再設計
- AWS・デプロイ・監視・規制対象データ処理

## Feasibility と主要リスク

`feasibility-assessment.md` は条件付き Go、`constraint-register.md` は C-01〜C-16 を確定した。blocking constraint は現時点でないが、次の入口条件を守る。

| リスク | 影響 | 対応・出口 |
|---|---|---|
| 誤検出 | 正常変更を CI が拒否 | 初期全件分類、偽陽性率5%以下、fixture 100% |
| baseline / exemption の抜け道化 | 新規違反を既存債務へ偽装 | 理由必須、単一ノード、両 shrink-only |
| [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) との競合 | #1963 の後退・重複実装 | 最新 main 統合確認、回帰契約を先に固定 |
| loud 化による callsite 破壊 | state / audit の部分更新 | 全 callsite 棚卸し、失敗注入、バイト不変 |
| CI 遅延 | 開発者待ち時間増加 | no-silent-drop 単独15秒以内 |
| 配布ドリフト | harness 間の挙動不一致 | 正本のみ編集、package / promotion drift guard |

## Concept と価値ストリーム

`wireframes.md` は未生成であり UI 変更もない。共有 concept は次のテキストフローで表す。

`上流契約 → 検出契約 → census・分類 → 対象修正 → shrink-only ratchet・CI → 配布・証跡`

価値は「既存欠陥を見つける」だけでなく、「新規違反が入らない」「残債と免除が増えない」「内部障害も成功に見えない」の3段で成立する。

## Team・資源・Delivery 方針

`team-assessment.md` は未生成である。新規外部予算、AWS 資源、専任運用要員は不要で、既存 Bun / GitHub Actions / packager と AI-DLC の stage persona を用いる。詳細な Unit、担当、Bolt DAG は Inception の Units Generation と Delivery Planning で確定する。

本 initiative は単一の価値目標として管理し、Construction では walking-skeleton を最初の Bolt とする。成果は Bolt ごとの独立した [PR](https://github.com/amadeus-dlc/amadeus/pulls) とし、各 Bolt を単独で検証・承認できる deployable slice にする。複数 Unit を単一 [PR](https://github.com/amadeus-dlc/amadeus/pulls) へ無条件に束ねない。

## 成功条件と Handoff Contract

| ID | 成功条件 |
|---|---|
| S-01 | 3形態の positive / negative fixture を100%分類 |
| S-02 | 実リポジトリの初期偽陽性率5%以下 |
| S-03 | CI 単独ステップ15秒以内 |
| S-04 | ツール・ルール・baseline・0件走査・部分走査を型付き非0終了 |
| S-05 | baseline 外違反、baseline 増加、exemption 増加を CI fail |
| S-06 | #1878・#1874 修正後に baseline 件数が減少 |
| S-07 | [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) 統合後の #1963 回帰契約が green |
| S-08 | package / promotion drift guard と Comprehensive テストが green |

Inception は次を引き継ぐ。

- Reverse Engineering で実コード、既存 guard、CI、packager、対象 callsite を再実測する。
- Requirements Analysis で C-01〜C-16 と S-01〜S-08 を双方向追跡可能な要件へ変換する。
- Application Design で検出・ratchet・runtime failure の境界を定義する。
- Units Generation / Delivery Planning で walking-skeleton を先頭に Bolt ごとの [PR](https://github.com/amadeus-dlc/amadeus/pulls) 境界を確定する。
- Construction 進入前に record 成果物をレビュー可能な状態へ着地させ、実行可能な振る舞いは TDD で実装する。

## Go / No-Go

**GO:** 意図とスコープは承認済み、全 Must-have に feasibility backing があり、重大リスクには測定可能な緩和策がある。未解消の blocking constraint、未回答のスコープ判断、外部予算依存はない。

**No-Go 条件:** [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) 未統合のまま #1963 を再実装する、偽陽性を無理由で baseline 化する、fail-closed や shrink-only を緩和する、Bolt 境界を無視して複数 Unit を単一 [PR](https://github.com/amadeus-dlc/amadeus/pulls) へ束ねる場合は停止して再裁定する。
