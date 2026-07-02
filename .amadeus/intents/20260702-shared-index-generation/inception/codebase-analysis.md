# 既存コード分析

## 対象コード

| 対象 | 種別 | 確認内容 |
|---|---|---|
| `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | validator 実装 | `checkIntents()` が `intents.md` の見出し、一覧列（識別子、概要、依存、詳細）、ID 形式、依存値、詳細リンク、state ディレクトリ対応、依存関係表（インテント、依存、理由）を検査している。`discoveries.md` は Discovery 行の状態と判定を `state.json` と突き合わせる検査が既にある。 |
| `.agents/skills/amadeus-validator/scripts/StateScaffold.ts` | 同梱スクリプト先例 | CLI 契約は `bun run StateScaffold.ts <workspace> <transition> --intent <intent-dir>`。実在ファイルの走査で出力を確定する方式と、既存値保持の更新規則が確立している。 |
| `skills/amadeus-ideation-intent-capture/SKILL.md` | index writer | 手順に `intents.md` への行追加と Discovery 候補状態の更新が含まれる。生成物化の後は「モジュール記述 + 再生成」へ手順変更が必要になる。 |
| `skills/amadeus-discovery/SKILL.md` | index writer | `discoveries.md` の一覧へ行を 1 つ追加する手順と「既存行は並べ替えない」規約を持つ。生成順規則との整合が必要になる。 |
| `skills/amadeus-steering/templates/steering/intents.md`、`discoveries.md` | 初期テンプレート | steering 初期化で作られる index の雛形。生成マーカー付きの形へ変更が必要になる。 |
| `.amadeus/intents/*.md`（21 件）、`.amadeus/discoveries/*.md`（5 件） | 実データ | `## 概要` または `## 依存` 見出しを持つ Intent モジュールファイルは 0 件である。概要と依存（理由）の定義元は現状 `intents.md` にしかなく、移設の migration が必要になる。 |
| `examples/*/.amadeus/intents.md`、`discoveries.md`（4 snapshot） | example snapshot | 4 snapshot すべてが共有インデックスを持つ。生成契約の確定後は同じ規則に一致する必要があり、example 補修は skill と template の契約変更を先行させる規約がある。 |

## 既存能力

- validator に index の構造検査（`checkIntents`、discoveries 検査)が既にあり、不整合検査と生成マーカー検査の追加位置が明確である。
- `discoveries.md` の状態列と判定列は `state.json` との突き合わせ検査が既に動いており、index の一部情報が機械可読な定義元を持つ先例になっている。
- StateScaffold の同梱スクリプト方式（workspace 引数、実在ファイル走査、既存値保持）と promote 契約が確立しており、生成入口はこのパターンを再利用できる。

## 統合点

- 再生成スクリプトは `skills/amadeus-validator/scripts/` に新設し、promote で `.agents/skills/amadeus-validator/scripts/` へ反映できる。
- validator の `checkIntents()` と discoveries 検査に、再生成結果と実ファイルの一致検査、生成マーカーの存在検査を追加できる。
- `amadeus-ideation-intent-capture` と `amadeus-discovery` の SKILL.md 手順を、行の手書き追加から「モジュールファイルへの記述 + 再生成の実行」へ差し替えられる。
- steering テンプレートの index 雛形を、生成マーカー付きの形へ差し替えられる。
- eval は `skills/amadeus-validator/evals/` と `dev-scripts/evals/` の既存構成に追加でき、昇格先へ混入しない。

## ギャップ

- Intent の概要と依存（理由）の定義元が `intents.md` にしかなく、モジュールファイルに対応する見出しが存在しない。
- `intents/` と `discoveries/` 配下から index を再生成する実行可能な手段が存在しない。
- index が手書き対象かどうかをファイル自身が示す手段（生成マーカー）と、その検査が存在しない。
- `discoveries.md` のテーマ列と推奨次アクション列を、Discovery モジュールファイルのどの見出しから抽出するかの規約が未定義である。

## リスク

- migration の範囲が広い。workspace の Intent 21 件と Discovery 5 件への見出し追加、examples 4 snapshot の index と配下モジュールの整合が必要になる。
- examples は「実際の skill で生成できる成果物だけを置く」規約があるため、example の index だけを直すことはできず、skill、template、validator の契約変更を先行させる順序制約がある。
- 行の並び順の決定論が必要になる。現行の index は追記順（時系列）であり、`amadeus-discovery` の「既存行は並べ替えない」規約と生成順規則の整合を確定する必要がある。
- 再生成結果が現行 index と文言レベルで一致しない場合、migration 時に大きな差分が出る。生成結果を正とする判断を明示する必要がある。

## Inception への入力

- 要求は、モジュールファイルへの情報移設（概要、依存見出しの契約化）、再生成手段、validator の不整合検査と生成マーカー検査、writer skill の手順更新、既存データの migration、検証の先行追加に分けられる。
- Unit は、生成と検査の契約を核とした単一の価値境界にまとめ、writer skill 手順更新と migration を Bolt で分ける構成が候補になる。スクリプトと検査は不可分（検査は生成規則の存在が前提）である。
- Bolt は、(1) 再生成スクリプトと検証の RED から GREEN、(2) validator の不整合検査と生成マーカー検査、(3) writer skill 手順とテンプレートの更新と promote 同期、(4) workspace と examples の migration、に分けられる見込みである。
- Construction では skill 変更 PR としてレビュー支援契約が適用され、スクリプト実装は dev-scripts ルールに従い検証先行で進める。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| file | `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | `checkIntents()`（1714 行付近）の検査項目と、discoveries の状態、判定の突き合わせ検査（924 行付近）の確認。 |
| file | `.agents/skills/amadeus-validator/scripts/StateScaffold.ts` | CLI 契約、実在ファイル走査、既存値保持の更新規則の確認。 |
| file | `skills/amadeus-ideation-intent-capture/SKILL.md` | `intents.md` 行追加と Discovery 候補状態更新の手順位置の確認。 |
| file | `skills/amadeus-steering/templates/steering/intents.md` | 初期テンプレートの存在確認。 |
| command | `grep -l '^## 概要\|^## 依存' .amadeus/intents/*.md` | 該当 0 件（21 件中）。定義元が index にしかないことの確認。 |
| command | `ls examples/*/.amadeus/intents.md` | 4 snapshot すべてに index が存在することの確認。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | 9fd3b483 |
| analyzedAt | 2026-07-02T16:35+09:00 |
| freshness | current |

## 未確認事項

- 行の並び順規則（現行の時系列追記順を保持するか、ID 順にするか）は Unit Design Brief と Construction Functional Design で確定する。
- `discoveries.md` のテーマ列と推奨次アクション列の抽出元見出しの規約は Construction Functional Design で確定する。
- 再生成スクリプトの名前と CLI 契約の詳細は Construction Functional Design で確定する。
- examples の migration を本 Intent の Bolt に含めるか、別 PR に分けるかは Bolt 分割で確定する。
