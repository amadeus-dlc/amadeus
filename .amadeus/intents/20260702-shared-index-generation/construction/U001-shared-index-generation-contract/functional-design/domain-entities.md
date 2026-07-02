# Domain Entities

## 目的

共有インデックス生成契約で扱う概念を、実装と検証で同じ名前で参照できるようにする。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Index Entry | 共有インデックスの一覧の 1 行を表す。Intent では識別子、概要、依存、詳細、Discovery では識別子、テーマ、状態、判定、推奨次アクション、詳細を持つ。 | BL001, BL003 |
| DE002 | Module Heading Contract | Intent モジュールファイルの `## 概要` と `## 依存` の見出し契約を表す。Index Entry の情報源になる。 | BL001, BL002, BL005 |
| DE003 | Generation Marker | 生成物であることと編集先を示すファイル先頭の HTML コメントを表す。 | BL004, BR004 |
| DE004 | Index Generation | 収集（配下モジュールと state.json）、導出（Index Entry）、整列（識別子の辞書順）、出力（マーカー付き Markdown）の一連の処理を表す。 | BL001, BL002, BL003, BL004 |
| DE005 | Consistency Check | Index Generation の再利用による期待内容と実ファイルの完全一致検査を表す。 | BL006, BR008 |

## 関係

- DE004 Index Generation は、DE002 Module Heading Contract を満たすモジュールから DE001 Index Entry を導出する。
- DE004 Index Generation は、出力の先頭に DE003 Generation Marker を付ける。
- DE005 Consistency Check は、DE004 Index Generation を再利用して期待内容を構築する。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 反映候補なし。BC001 自己開発運用の既存境界内のインデックス管理手段の変更である。 | 反映しない | [D003](../../../inception/decisions/D003-single-unit-exception.md) |

## 未確認事項

なし。
