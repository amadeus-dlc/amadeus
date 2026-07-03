# Business Rules：v2 完全準拠の中核ロジック

## 目的

v2 完全準拠の実装と移行で守る規則と、Intent として保証する契約を確定する。

## 業務ルール

| # | ルール | 根拠 |
|---|---|---|
| 1 | v2 規定と現行実装が衝突する場合は、常に v2 を優先する | Issue #387 の確定判断 1 |
| 2 | 機械可読・構造的成果物（aidlc-state.md、intents.json、audit/、memory.md の構造、改名対象のファイル名）は v2 の構造と英語ラベルをそのまま使う。記述系成果物の本文は日本語規範を維持する | GD001 |
| 3 | Intent 状態の持ち主は `aidlc-state.md` の 1 ファイルだけにする。他の成果物に状態の複製を持たせない | R003、二重管理の drift 防止 |
| 4 | Intent の正準 ID は `intents.json` の uuid（v7）であり、record ディレクトリ名 `<YYMMDD>-<label>` は表示用の一意名として扱う | R004、v2 の registry 設計 |
| 5 | `audit/` は追記だけを行い、記録済みイベントを書き換えない | v2 の decision trail の意味論 |
| 6 | record scaffold（phase ディレクトリ、verification/、audit/）は Initialization 0.1 だけが作る。ステージ skill は不足ディレクトリを暗黙に作らない | R002、構造の単一責務 |
| 7 | 旧ファイル名と旧構造（state.json、.amadeus/、YYYYMMDD 命名、units.md ほか改名対象の旧名）を契約（文書、skill、テンプレート、validator、eval）に残さない | R005、後方互換規則 |
| 8 | Amadeus 独自成果物（grillings、traceability、phase decisions、モジュールファイル、intents.md 索引）は、v2 規定の位置と衝突しない場所（record の phase ディレクトリ配下、intents/ 直下）に置き、v2 成果物の名前空間を侵さない | Issue #387 の確定判断 2 |
| 9 | 移行は一括移行スクリプトだけで行い、手作業でファイルを動かさない | 再現性と検証可能性 |

## 例外

- Operation phase は scaffold のディレクトリ作成だけを行い、stage の実行と成果物契約は対象外のまま維持する。
- v2 の engine / tooling（aidlc-utility.ts、hooks、sensors）は移植しない。同じ意味論を Amadeus の skill と validator で実装する。
- audit のイベント種別は v2 の全 68 種を義務にせず、v2 で必須（assertion-tested）とされる集合と、Amadeus が実行する lifecycle（workflow、phase、stage、session、bolt）に対応する集合だけを採用する。採用集合は code generation で確定する。

## Intent Contracts

| 契約 | 事前条件 | 事後条件 |
|---|---|---|
| PRE001：一次情報の固定 | v2 の state template と audit format の原文を取得し、vendored copy として repo に固定してから実装する | 準拠判定が「vendored copy との差分ゼロ」として観測できる |
| PRE002：移行前の green | 一括移行の実行前に `npm run test:all` が pass している | 移行起因の退行を切り分けられる |
| INV001：段階的 green | 改名、状態移行、構造移行の各段階で全検証を green に保つ | 中間状態でも main が壊れない |
| INV002：ID の不変 | 移行で uuid を再採番せず、既存 Intent の同一性を保つ（新規採番は移行時の初回だけ） | registry の履歴追跡が壊れない |
| POST001：受け入れ条件の成立 | R001〜R007 の受け入れ条件がすべて観測できる | Issue #387 をクローズできる |
| POST002：旧構造の消滅 | 旧 `.amadeus/` と `state.json` が working tree に存在しない | 完全移行（GD003）が完了している |

## 未確認事項

- audit イベントの採用集合（v2 の必須 ✓ 一覧の確定）。code generation で v2 原文から確定する。
