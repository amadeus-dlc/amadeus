# 既存コード分析

## 対象コード

| 対象 | 種別 | 確認内容 |
|---|---|---|
| `.amadeus/steering/policies.md` | steering 成果物 | 「provenance の最低記録項目」9 項目（build workspace の path と commit、target workspace の path と commit、host environment の識別情報、target artifacts の対象範囲、利用した昇格済み skill の path/commit/md5、利用した validator の path/commit/md5/実行結果、利用した開発用スクリプトの path/commit/md5、stage 判定の根拠、人間による次回 stage0 採用判断の有無）を定義している。記録先や記録手段は指定しておらず、手書き Markdown を前提にした記述になっている。 |
| `.amadeus/development.md` | steering 成果物 | 「stage と workspace 対応記録」の表が、build workspace、host environment、target workspace、target artifacts、validator 結果、標準検証結果の記録先を「対象 Intent の traceability、decisions、または PR 説明」に限定している。`provenance/` のような機械可読な記録先は選択肢に含まれていない。 |
| `.amadeus/intents/20260629-self-dev-steering-layer/ideation/traceability.md` | 実データ | build workspace commit `d65708fc92c0205033a047af0755336e94e4827f`、利用した validator の commit と md5 `4f7ddeabcdd8efc8a046a69b52f35da9` が Markdown の表へ手書きで転記されている。値が実測と一致するかを機械的に確認する手段がなく、もっともらしく間違った値でも成果物構造の検査（validator）は pass する。 |
| `dev-scripts/promote-skill.ts`、`.agents/skills/amadeus-validator/scripts/StateScaffold.ts` | 開発用スクリプト・同梱スクリプト | Bun + TypeScript で実装され、`dev-scripts/evals/` または skill 同梱の eval と対になっている。`provenance:generate` と `provenance:check` は、repo の自己開発運用に属し実行時参照を必要としないため、`dev-scripts/` に同じ配置方式で追加できる（Issue #296 の実施候補、Ideation の学習候補）。 |
| `package.json` の `scripts` | 標準検証入口 | `test:all` → `test:ci:mock` → `test:it:all` の chain 構造を持ち、`test:it:all` は `test:it:amadeus-validator`、`test:it:state-scaffold` など個別の `bun run dev-scripts/evals/**/check.ts` 呼び出しを `&&` で束ねている。新しい検査は同じ束ね方で `test:it:all` に追加できる。 |
| `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | 昇格済み validator | 3778 行の実装全体に `provenance` という語を含む検査が存在しない。成果物 Markdown の見出し、テーブル、参照整合性の検査に責務が限定されており、実測値（md5、commit）の再計算や記録先ディレクトリの存在確認は行っていない。 |
| `examples/skill-provenance.json` | 既存の並立候補 | example snapshot 生成に使った source skill の `SKILL.md` の md5 を記録する契約であり、`staleReason` による例外記録の仕組みを持つ。対象は example 再生成の鮮度管理に限定され、Intent 単位の作業実行記録ではない。 |

## 既存能力

- `package.json` の `test:it:all` は、新しい eval を `bun run dev-scripts/evals/<name>/check.ts` の形で追加し `&&` chain に連結するだけで標準検証へ組み込める構造を既に持つ。
- `dev-scripts/` には Bun + TypeScript のスクリプトと `dev-scripts/evals/<name>/check.ts` を対にする配置の先例（`promote-skill.ts`、`amadeus-contracts.ts` など）が複数あり、TDD ルール（`.agents/rules/dev-scripts.md`）に沿った実装パターンが確立している。
- git コマンド（commit、diff）とファイルハッシュ計算は、`dev-scripts/generate-amadeus-examples.ts` や `.agents/skills/amadeus-validator/scripts/StateScaffold.ts` など既存スクリプトが同種の実測を行っており、実装パターンとして再利用できる。

## 統合点

- `provenance:generate` と `provenance:check` は `dev-scripts/` に新設し、`package.json` に `provenance:generate` / `provenance:check` の実行入口を追加できる。
- `provenance:check` は `test:it:all` の chain に、既存の `test:it:<name>` エントリと同じ形式で組み込める。
- 記録先を対象 Intent 直下の `provenance/` にする場合、`.amadeus/steering/policies.md` の「provenance の最低記録項目」と `.amadeus/development.md` の「stage と workspace 対応記録」の記述を、この記録先と矛盾しないよう更新できる。
- 検査責務は、既存の validator（成果物構造の検証）と新設する `provenance:check`（実測値の照合）で分担でき、`AmadeusValidator.ts` に provenance 関連の検査が存在しないことが、責務を重複させない根拠になる。

## ギャップ

- 現在の provenance 記録は traceability や decisions への手書き Markdown であり、値が実測と一致するかを機械的に確認する手段がない。`20260629-self-dev-steering-layer` の実データがこの状態を示している。
- `.amadeus/development.md` の記録先の記述が「traceability、decisions、または PR 説明」に限定されており、機械可読な記録先（`provenance/`）を前提にしていない。
- 既存 Intent には provenance 記録用の `provenance/` ディレクトリが存在せず、遡及適用する場合は当時の build workspace や host environment を再現できない可能性がある。

## リスク

- `provenance:check` の検査対象を誤って全 Intent に広げると、`provenance/` を持たない既存 Intent に対して意味のない失敗を報告し、標準検証を不必要に壊す。検査対象を `provenance/` 存在 Intent に限定する契約で緩和する。
- 実測ロジック（git コマンド、ファイルハッシュ）が host environment や worktree 構成に依存すると、環境差で誤検出が起きる可能性がある。eval で固定入力による検証を先行させることで緩和する。
- policies.md と development.md の記述更新が生成スクリプトの実装と食い違うと、エージェントが再び手書きに戻る可能性がある。B003 で両文書の整合を確認する。

## Inception への入力

- 要求は、記録の生成（実測して JSON 出力）、記録と実測の照合（drift 検出）、標準検証への組み込み、記録方法の文書整合、検査責務境界の追跡可能性に分ける。
- Unit は、生成、照合、標準検証組み込み、文書整合を「信頼できる provenance 記録」という単一の価値境界として扱う単一 Unit + 複数 Bolt が候補になる。
- Bolt は、生成スクリプトと eval の実装、照合スクリプトと eval の実装および CI 組み込み、文書整合と検査責務境界の記録に分けられる。
- Construction では、dev-scripts ルールに従い eval 先行（RED → GREEN）で進め、JSON スキーマの項目の詳細型と命名、`provenance/` 配下のファイル命名規則を Functional Design で確定する。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| file | `.amadeus/steering/policies.md` | provenance の最低記録項目 9 項目の定義確認。 |
| file | `.amadeus/development.md` | stage と workspace 対応記録の表の記録先の確認。 |
| file | `.amadeus/intents/20260629-self-dev-steering-layer/ideation/traceability.md` | 手書き provenance の実データと、値が実測と一致するかを確認できない状態の確認。 |
| file | `package.json` | `test:all` から `test:it:all` への chain 構造と、個別 eval の追加パターンの確認。 |
| file | `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | provenance に関する検査が存在しないことの確認。 |
| file | `examples/skill-provenance.json` | 並立対象の既存契約（対象範囲と粒度の違い）の確認。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | `e37e439457ad9bc2ca9310b9e7b29485205e9c68` |
| analyzedAt | `2026-07-02T09:23:05Z` |
| freshness | current |

## 未確認事項

- JSON スキーマの項目の詳細型と命名、`provenance/` 配下のファイル命名規則は Construction の Functional Design で確定する。
- eval の置き場所（`dev-scripts/evals/` 配下の具体的なディレクトリ名）と `package.json` の実行入口名は Construction で確定する。
