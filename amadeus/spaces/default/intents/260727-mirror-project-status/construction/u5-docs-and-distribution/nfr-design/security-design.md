# Security Design — u5-docs-and-distribution

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

security-requirements の docs 秘匿・リリース境界・生成物完全性を、記述規約と既存ガードの再利用で実現する。

## docs の秘匿設計

- 認証節は権限の**名前**(`project` scope)と gh credential store 委譲の方針のみ(security-requirements — business-logic-model のドキュメント更新フロー)。token 値・実環境識別情報・生応答例を docs に書かない記述規約とし、診断出力例も識別子・ラベルのみのサンプルに限る。
- 対訳同期(en/ja — business-logic-model)は両言語で同一の秘匿水準を保つ(片側だけに実値例を書かない)。

## リリース境界の設計

- バージョン・バッジ・リリースノート非接触(security-requirements — tech-stack-decisions のリリース対象外決定)。U5 の変更面は docs・契約台帳・生成物再生成のみで、release.yml の境界に触れる経路を持たない。
- scopeExclusions の docs 記載は既存 parity テストで機械固定(security-requirements)— consent 境界の記述が実装契約から乖離しない。

## 生成物の完全性設計

- dist / self-install の手編集禁止 — 正本修正 → 再生成の一方向(business-logic-model のエラー節)。drift guard(reliability-requirements の機械検査)が無申告注入の検出器。
- 台帳不変検収(business-logic-model の配布同期フロー — 変化は逸脱シグナルとして停止・報告)は意図しない配布面拡大の検出器を兼ねる(security-requirements)。検収の数値は実出力転記のみ(performance-requirements の既存枠実行と対の実測規律 — scalability-requirements の固定集合を母集団とする)。
