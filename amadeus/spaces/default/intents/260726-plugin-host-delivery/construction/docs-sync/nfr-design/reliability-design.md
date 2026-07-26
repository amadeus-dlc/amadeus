# 信頼性設計 — U8 docs-sync

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## REL-U8-1 への設計: 転記手順(実行 → 確認 → 転記の順序固定)

`reliability-requirements.md` REL-U8-1(BR-U8-1)を、`business-logic-model.md` フローの 4 ステップを順序固定した起草手順として設計する:

1. 語彙起点棚卸し(scalability-design.md の grep 手順 — `scalability-requirements.md` BR-U8-2 の有界確定)で DocsTarget を確定
2. 各節を U1-U6 着地物から転記 — コマンドは scratch で実行し出力確認済みのもののみ(`security-requirements.md` SEC-U8-1 のチェックリスト設計と同一実行を共有)
3. **U7 着地後にのみ着手**(bolt-plan Bolt 8 順序 — テストで固定された挙動だけを手順化。実装未確定の手順の先行公開 = 偽装文書化の防止)
4. 実行記録(コマンド・出力要旨)を stage diary へ残す

## REL-U8-2 への設計: 日英同期の照合手順

`reliability-requirements.md` REL-U8-2(BR-U8-3)の内容差ゼロを、機械照合可能な形で設計する:

- `19-plugins.md` / `19-plugins.ja.md` は**同一コミット**で更新する(片側のみの変更をレビューで差し戻す)
- 照合手順: (a) H2/H3 見出し数と順序の一致 (b) コードフェンス(コマンド・出力例)の byte 一致 — コマンドとパスは翻訳対象外のため両言語で同一 (c) 節ごとの対応の目視レビュー。(a)(b) は grep/diff で機械確認し、結果を転記する

## REL-U8-3 への設計: ゲート実行とクラス語彙

`reliability-requirements.md` REL-U8-3 のとおり:

- 既存 docs 参照整合ゲート(t174 系 legacy-refs / 言語切替リンク検査)を文書更新後に実行し、exit 0 の転記をもって合とする(`performance-requirements.md`「検査面」と同一実行 — 新規検査を追加しない)
- クラス語彙は ADR-4 正準 literal(`native-manifest | folder-drop-auto | manual-only`)の逐語使用とし、非正準表記(自由訳・別名)の grep 0 件を機械確認する(BR-U8-6)。日本語版でもクラス名は literal のまま保持する(project.md「path、CLI、コード識別子は正確性を優先して保持」)

## REL-U8-4 への設計: 乖離の逸脱扱い

N/A — security-design.md SEC-U8-2 の設計(停止・報告・裁定記録)を参照継承する(`reliability-requirements.md` REL-U8-4 と同一契約)。

## 非該当カテゴリ

N/A — `reliability-requirements.md` 非該当カテゴリ(可用性 SLO / MTTR / リトライ)の N/A を参照継承(文書 Unit)。
