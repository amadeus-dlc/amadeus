# セキュリティ設計 — U8 docs-sync

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## SEC-U8-1 への設計: 記載コマンドの非破壊性チェックリスト

`security-requirements.md` SEC-U8-1 を、docs 起草時の**転記手順チェックリスト**として設計する(`business-logic-model.md` フロー 2「コマンドは実際に実行し、出力を確認したものだけを記載」の運用具体化):

1. install / compose / doctor / drop の各記載コマンドを scratch 環境で実行し、実出力を確認してから転記する(記憶起草・未実行手順の記載禁止 — BR-U8-1)
2. 各コマンドについて「書込・削除の対象パス」を出力から確認し、意図しない削除・上書きを含むコマンドを記載しない
3. drop 手順には「プラグイン所有物と contribution のみを除去し、他プラグインの contribution・共有ファイルを推測 drop しない」旨を明記する(FR-6 合否の文書面)
4. 実行確認の記録(コマンド・実行日・出力要旨)を stage diary へ残す

## SEC-U8-2 への設計: 乖離の逸脱扱い

`security-requirements.md` SEC-U8-2(BR-U8-5)のとおり、起草中に実装と設計契約(component-methods.md C1-C6)の乖離を発見したら docs 側で吸収せず停止・報告する(implementation-deviation-election)。`reliability-requirements.md` REL-U8-4 と同一契約(参照継承 — 二重規定しない)。成果物へは「乖離 0 件の宣言 or 裁定記録」を残す。

## 非該当カテゴリ

N/A — `security-requirements.md` 非該当カテゴリ(認証 / 認可 / secret / 入力サニタイズ)の N/A を参照継承(文書 Unit — `performance-requirements.md` / `scalability-requirements.md` と同一の「コード変更なし」前提)。
