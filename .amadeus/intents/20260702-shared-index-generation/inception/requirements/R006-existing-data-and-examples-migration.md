# R006 既存データと examples の適合

## 要求

workspace の既存 Intent と Discovery のモジュールファイル、および examples の 4 snapshot の共有インデックスが新契約に適合し、validator が pass する。

## 背景

`## 概要` または `## 依存` 見出しを持つ既存 Intent モジュールファイルは 0 件（21 件中）であり、定義元の移設には既存データの migration が必要である。
examples の 4 snapshot はすべて共有インデックスを持ち、`validate:all` の検査対象である。
examples の補修は、skill、template、validator の契約変更を先行させる規約がある。

## 受け入れ条件

- workspace の既存 Intent モジュールファイルが、概要と依存（理由付き）の見出しを持つ。
- workspace の `intents.md` と `discoveries.md` が再生成結果と一致し、validator が pass する。
- examples の 4 snapshot が新契約の下で validator pass を維持する。
- migration の差分で情報（概要、依存、理由の内容）が失われない。

## 依存

R001、R002、R003、R004、R005。

## 対応する対象境界

- SC-IN-001、SC-IN-002

## 未確認事項

- examples の migration を本 Intent の Bolt に含めるか、後続 PR に分けるかは、Bolt 分割で確定する。
