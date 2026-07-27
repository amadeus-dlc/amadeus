# 信頼性要件 — U8 docs-sync

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 信頼性の中核契約

U8 の信頼性は 3 つの文書契約に還元される — (1) **転記のみ**(実装からの転記で偽装文書化を防ぐ)、(2) **日英同期**(対訳の内容差ゼロ)、(3) **ゲート通過**(既存 docs 参照整合ゲート green)。いずれも `business-rules.md` の BR と 1:1 で、`technology-stack.md` 実測どおりコード変更を伴わない文書 Unit の信頼性を、文書の真正性と参照整合として表現する。

## REL-U8-1: 転記のみ(BR-U8-1)

`business-rules.md` BR-U8-1 と `business-logic-model.md` フロー(実装からの転記による更新)のとおり、docs のコマンド・パス・出力例は実装(U1-U6 着地物)からの転記のみとし、記憶起草・未実行手順の記載を禁止する。`business-logic-model.md` 順序制約(bolt-plan Bolt 8)のとおり U7(適合テスト)着地後に実施し、テストで固定された挙動だけを手順化する(実装と一致しない手順書の先行公開=偽装文書化の防止)。

- 合否: 記載コマンドを実際に実行し出力を確認した記録を持つ(`business-rules.md` BR-U8-1・`business-logic-model.md` 検証「記載どおりに実行して期待出力を得る」)
- 合否: U7 着地後に実施し、テストで固定された挙動のみを手順化する(`business-logic-model.md` 順序制約 — 実装未確定の手順を先行公開しない)

## REL-U8-2: 日英同期(BR-U8-3)

`business-rules.md` BR-U8-3 のとおり、`19-plugins` の日英ペアは同一変更で更新し内容差ゼロとする(CLAUDE.md 言語規約+既存対訳同期レビュー観点)。

- 合否: `19-plugins.md` と `19-plugins.ja.md` の節構成・コマンドが対応照合で一致(`business-rules.md` BR-U8-3 検証 — 内容差ゼロ)

## REL-U8-3: ゲート通過(BR-U8-4)・クラス語彙(BR-U8-6)

`business-rules.md` BR-U8-4 のとおり既存 docs 参照整合ゲート(t174 系 legacy-refs / 言語切替リンク検査)を green とし、BR-U8-6 のとおりハーネス別クラスの記載は ADR-4 正準 literal(`native-manifest | folder-drop-auto | manual-only`)の逐語使用とする。`requirements.md` FR-9 合否「docs 参照整合ゲートの通過」と対応。

- 合否: 既存 docs 参照整合ゲートの実行 exit 0(`business-rules.md` BR-U8-4 検証 — テスト実行 exit 0 の転記)
- 合否: クラス語彙は ADR-4 正準 literal の逐語使用で、非正準表記の grep が 0 件(`business-rules.md` BR-U8-6 検証)

## REL-U8-4: 乖離は逸脱扱い(BR-U8-5)

`business-rules.md` BR-U8-5 のとおり、docs 起草中に実装と設計契約の乖離を発見したら docs 側で吸収せず逸脱として停止・報告する(implementation-deviation-election)。誤った手順書を publish しないための信頼性契約である。

- 合否: 乖離 0 件の宣言、または乖離発見時の裁定記録(`business-rules.md` BR-U8-5 検証)

## 非該当カテゴリ(N/A + 根拠)

- 可用性 SLO / MTTR / フェイルオーバー / リトライ: N/A。U8 は文書更新のみで常駐 service・ランタイム経路を持たない(`technology-stack.md`「HTTP・DB はない」実測、`business-rules.md` BR-U8-0 コード変更なし)。信頼性は文書の真正性(転記のみ・日英同期・ゲート通過)へ置換される
