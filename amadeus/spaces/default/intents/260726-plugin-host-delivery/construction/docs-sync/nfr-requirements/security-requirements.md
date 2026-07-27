# セキュリティ要件 — U8 docs-sync

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 脅威モデルと境界

U8 は文書 Unit であり(`business-rules.md` BR-U8-0)、`technology-stack.md` 実測どおりコードランタイムを持たない。認証・認可・ネットワーク境界は存在しないため、大半のセキュリティカテゴリは N/A である。ただし文書に**破壊的操作を含むコマンドを誤って記載しない**ことは、利用者が手順書どおり実行する前提上の安全要件として扱う。

## SEC-U8-1: 記載コマンドの非破壊性

`business-logic-model.md` フロー(実装からの転記による更新)と `business-rules.md` BR-U8-1(転記のみ)のとおり、docs のコマンドは実装(U1-U6 着地物)から転記し、実際に実行して出力を確認したものだけを記載する。記載する install / compose / doctor / drop の各手順コマンドが、利用者の意図しないデータ破壊(想定外のファイル削除・上書き)を含まないことを確認する。

- 合否: `requirements.md` FR-9 の install / doctor / drop 手順に記載するコマンドが破壊的操作(意図しない削除・上書き)を含まないことを確認する。drop 手順は `requirements.md` FR-6 のとおりプラグイン所有物と contribution のみを除去し、他プラグインの contribution・共有ファイルを推測 drop しない旨を明記する(FR-6 合否「drift した共有ファイルは推測 drop しない」の文書面)
- 合否: 記載コマンドは実際に実行し出力を確認したもののみ(`business-rules.md` BR-U8-1 — 記憶起草・未実行手順の記載禁止)。未実行の破壊的コマンドを推測で記載しない

## SEC-U8-2: 実装契約からの乖離を持ち込まない

`business-rules.md` BR-U8-5 のとおり、docs 起草中に実装と設計契約(component-methods.md C1-C6)の乖離を発見したら、docs 側で吸収せず逸脱として停止・報告する(implementation-deviation-election)。これは誤った手順書が利用者を危険な操作へ誘導することを防ぐ。

- 合否: 実装と docs 記載の乖離 0 件の宣言、または乖離発見時の裁定記録(`business-rules.md` BR-U8-5 検証)

## 非該当カテゴリ(N/A + 根拠)

- 認証 / 認可 / secret 管理: N/A。U8 は Markdown 文書更新のみで credential・認可経路を扱わない(`technology-stack.md` 実測、`business-rules.md` BR-U8-0 コード変更なし)
- 入力サニタイズ / 攻撃面: N/A。実行されるコードを追加せず、外部入力を受ける境界を持たない。唯一の安全関心は SEC-U8-1 の記載コマンド非破壊性
