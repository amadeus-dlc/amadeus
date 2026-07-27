# 信頼性要件 — U7 conformance-suite

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 信頼性の中核契約

U7 の信頼性は 2 つの契約に還元される — (1) **32/32 被覆**(暗黙成功を許さない全数被覆)と (2) **レポート導出**(検証劇場を許さない実行結果からの導出)。前者は `business-rules.md` BR-U7-1、後者は BR-U7-5 に対応する。`technology-stack.md` 実測どおり常駐 service を持たないため、可用性 SLO ではなく、テスト集合の完全性とレポートの真正性という決定的契約として表現する。

## REL-U7-1: 32/32 被覆(BR-U7-1)

`business-rules.md` BR-U7-1 と `business-logic-model.md` フロー 1 のとおり、追跡表は上流 32 ケース全行を持ち、各行の disposition は 3 値(adopted / covered-existing / n-a)のいずれか+n-a は根拠必須とする。`requirements.md` FR-8 合否と対応。

- 合否: 追跡表の行数 count=32 かつ disposition 空欄 0 の機械検査(`business-rules.md` BR-U7-1)。未対応ケースの暗黙成功扱いを不合格とする(表を先に確定 — BR-U7-2)
- 合否: covered-existing 行はフルパス+シンボル引用で実在を確認し、意味被覆をレビューする(`business-rules.md` BR-U7-3/7 — tNNN 短形禁止、同番号複数ファイルの誤解決防止)

## REL-U7-2: レポート導出(BR-U7-5、検証劇場禁止)

`business-rules.md` BR-U7-5 と `business-logic-model.md` フロー 4 のとおり、ConformanceReportSection の suiteResult はテスト実行 exit code からの導出のみとし、`requirements.md` FR-10 の検証劇場禁止と対応する。

- 合否(落ちる実証): 意図的 red 状態でレポートが red を示す(注入は runtime 消費行へ — inject-runtime-consumed-lines)。status のハードコード・自己参照比較・両分岐同一の条件式は不合格

## REL-U7-3: 実起動検証(BR-U7-4、暗黙成功禁止)

`business-rules.md` BR-U7-4 のとおり、per-harness trigger 面は native hook 実起動、不能面は文書化された手動 fallback E2E とし、いずれも期待値を固定する(U4 BR-U4-3 と共有)。未対応・degrade を期待値として固定し、暗黙成功の扱いを不合格とする(`requirements.md` FR-8 合否)。

- 合否: per-harness trigger 面が native hook 実起動または手動 fallback E2E で検証され、未対応・degrade も期待値として固定される(暗黙成功禁止)

## REL-U7-4: 表が先(BR-U7-2)・pin 固定(BR-U7-8)

`business-rules.md` BR-U7-2 のとおりテスト実装は追跡表確定後(表のコミットがテスト追加コミットに先行 — `business-logic-model.md`「実行順」)、BR-U7-8 のとおり上流参照は commit `29a31f78` 固定とする。これらは追跡の再現性・監査可能性を担保する信頼性契約である。

- 合否: 追跡表のコミットがテスト追加コミットに先行する(`business-rules.md` BR-U7-2 — bolt-plan Bolt 7 順序)
- 合否: 追跡表ヘッダに上流 pin `29a31f78` が記載される(`business-rules.md` BR-U7-8 — `requirements.md` A-4)

## 非該当カテゴリ(N/A + 根拠)

- 可用性 SLO / MTTR / フェイルオーバー: N/A。U7 はテストスイートで常駐 service ではない(technology-stack.md 実測)。信頼性はテスト集合の完全性(32/32)とレポート真正性(検証劇場禁止)へ置換される
- リトライ / 冗長化: N/A。テスト失敗は CI 上で loud に赤くなり(BR-U7-5)、リトライ層を持たない
