# Business Rules — U8 docs-sync

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## BR 一覧

- **BR-U8-0(責務境界)**: 本 Unit の更新範囲は components.md C8 の責務行(19-plugins 両言語)+BR-U8-2 の語彙棚卸しで確定した追加対象のみ。C1-C7 の実装物・record には触れない(検証: diff の対象ファイル検分)
- **BR-U8-1(転記のみ)**: docs のコマンド・パス・出力例は実装(U1-U6 着地物)からの転記のみ。記憶起草・未実行手順の記載禁止(requirements FR-9。検証: 記載コマンドの実行確認記録)
- **BR-U8-2(語彙起点の棚卸し)**: 更新対象は対象語彙の repo 全域 grep から導出(docs/ ディレクトリ起点の列挙は不合格 — 正本知識ファイルの見逃し防止。検証: grep コマンドと結果の転記)
- **BR-U8-3(日英同期)**: 19-plugins の日英ペアは同一変更で更新し内容差ゼロ(CLAUDE.md 言語規約+既存対訳同期レビュー観点。検証: 節構成・コマンドの対応照合)
- **BR-U8-4(ゲート通過)**: 既存 docs 参照整合ゲート(legacy-refs / 言語切替リンク検査)green(検証: テスト実行 exit 0 の転記)
- **BR-U8-5(乖離は逸脱扱い)**: docs 起草中に実装と設計契約(component-methods.md C1-C6)の乖離を発見したら、docs 側で吸収せず逸脱として停止・報告(implementation-deviation-election。検証: 乖離 0 件の宣言 or 裁定記録)
- **BR-U8-6(クラス語彙)**: ハーネス別クラスの記載は ADR-4 正準 literal(`native-manifest | folder-drop-auto | manual-only`)の逐語使用+利用者向けの説明文(検証: 非正準表記の grep 0 件)

## 検証への trace

全 BR は文書検査+既存ゲート実行(コード変更なしの Unit — unit-of-work.md U8 の standalone 文書面)。数値・件数はコマンド出力転記のみ。
