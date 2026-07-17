# Business Logic Model — U4 verification-docs

intent: `260715-opencode-cursor-harness` / Unit: U4
上流入力: unit-of-work.md(U4)、unit-of-work-story-map.md(3視点の文書価値)、requirements.md(FR-5 AC-5b / FR-6 AC-6a / FR-7)、application-design の components.md(C4/C5・AC-5c 目録)/ component-methods.md(C4 契約)/ services.md(機能単位表の原型)。

## 処理フロー(検証)

1. **smoke test 1本**(`tests/smoke/t<NNN>-opencode-cursor-dist-structure.test.ts`): dist/opencode/・dist/cursor/ の主要ファイル実在表(manifest 経由生成物)+ harness.json の rulesSubdir 値 + package.ts --check 対象への編入(discoverHarnessNames の帰結)を fs 直読で検査(spawn 不要 — in-process seam は生成結果の検査に限定、bun-coverage-spawn-blindspot 回避)
2. 落ちる実証: 生成物1ファイルを故意に欠いた状態で smoke が赤くなることを1回実測(新設検査の完成条件 — Mandated)
3. **期待ファイル表の保守規約**: manifest.ts の生成物構成を変更する PR は、同一 PR で smoke の期待ファイル表を追補する — この規約を smoke テストのモジュールスコープコメントに焼き込む(under-coverage の静かな進行を防ぐ)

## 処理フロー(文書)

1. README のハーネス対応表へ opencode / cursor 行を追加
2. `docs/harness-engineering/` に両ハーネスの対応ページ(または既存ページへの節追加 — 対象文書の特定は本 Unit 冒頭で実測): 実行モデル・制約・権限モデル差・promote:self 非対象・installer 非対応(暫定)・**機能単位表**(services.md 原型を U2/U3 の実測結果で確定して転記 — ⚠ 行の解消 or 降格を反映)
3. docs は英語(リポジトリ言語規約 — docs/ は英語正)。README のハーネス表も英語

## 処理フロー(Issue 起票)

1. **installer 対応 Issue**(AC-6a 留保): タイトル・本文は日本語(issues-in-japanese)、本文に (i) RE scan-notes の閉じ列挙台帳(installer 5ファイル)verbatim (ii) `install --harness opencode` が弾かれる再現実測(コマンド+出力)(iii) 種別 enhancement+P ラベル見立て
2. **opencode hooks(plugins)Issue**(ADR-3): 将来対応の scope 記述+機能表の該当行参照
3. 起票後クロスレビュー2名(issue-cross-review)— 起票報告に含める
