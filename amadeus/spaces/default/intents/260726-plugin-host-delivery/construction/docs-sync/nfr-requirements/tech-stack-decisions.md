# 技術スタック決定 — U8 docs-sync

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 決定: 既存ドキュメント基盤のみ・runtime dependency 追加ゼロ

`technology-stack.md` の本 intent 差分リフレッシュは「新規外部パッケージもゼロ」と実測しており、U8 は文書 Unit として `docs/guide/` 配下の Markdown 更新と既存 docs 参照整合ゲート(t174 系)の実行に閉じる(`business-rules.md` BR-U8-0/BR-U8-4)。`requirements.md` NFR-3(Bun-only、runtime dependency 追加禁止)を継承し、新規のドキュメント生成ツール・変換器を導入しない。

- ドキュメント形式: 既存 `docs/guide/19-plugins.md` / `19-plugins.ja.md` の Markdown(日英ペア)。`business-logic-model.md` のとおり実装からの転記のみで更新
- 検査: 既存 docs 参照整合ゲート(`business-rules.md` BR-U8-4 の t174 系 legacy-refs / 言語切替リンク検査)。`technology-stack.md` 実測の `bun:test` + 自作ランナー上で走る既存ゲートを再利用し、新規検査を新設しない
- 語彙棚卸し: `business-rules.md` BR-U8-2 の repo 全域 grep(既存シェルツールのみ)。専用の索引ツールを持ち込まない

## 決定: コード・record への非干渉

`business-rules.md` BR-U8-0(責務境界)のとおり、U8 の更新範囲は 19-plugins 両言語+語彙棚卸しで確定した追加対象のみとし、C1-C7 の実装物・record には触れない。`technology-stack.md` 実測の core/harness 境界・配布同期機構には一切変更を加えない。

- 合否: 新規 runtime dependency ゼロ(`package.json` / `bun.lock` の diff が空 — `technology-stack.md` 実測手順の再現)。文書 Unit のため通常はコード diff なし
- 合否: 既存 docs 参照整合ゲートの再利用のみで新規検査・ツールを追加しない(`requirements.md` FR-9 合否の既存ゲート通過)

## 代替案と却下理由

- 却下: 新規のドキュメント生成/検証ツールの導入 — `requirements.md` NFR-3(Bun-only)違反。既存 docs ゲートで参照整合を担保でき、`technology-stack.md` 依存追加ゼロ実測と整合
- 却下: docs 側で実装との差異を吸収して記述 — `business-rules.md` BR-U8-5 違反(乖離は逸脱扱いで裁定へ)。技術選定ではなく契約違反として却下する
