# D004: Unit と Bolt の粒度判断

## 背景

- Issue #248 は、報告先、判断基準、最低項目、採用方式、代表 skill 試行範囲を扱う。
- Ideation は、代表的な skill で試す対象を Codebase Analysis で確認するよう引き継いでいる。
- Codebase Analysis では、公開 skill の共通契約欠落と、source skill、昇格先 skill、eval の整合確認が別の作業性を持つことを確認した。

## 判断

- Unit は `U001 reporting contract` と `U002 skill adoption verification` に分ける。
- Bolt は `B001 reporting contract definition` と `B002 representative skill adoption` に分ける。
- B002 は B001 に依存する。

## 理由

- 報告契約の定義と、代表 skill および eval の整合確認は、検証対象と完了条件が異なる。
- B001 は R001、R002、R003 を満たすための共通契約定義を扱う。
- B002 は R004 を満たすため、source skill、昇格先 skill、関連 eval の整合確認を扱う。
- 1つの Unit と Bolt にまとめると、内部 skill 化の要否、代表 skill の対象範囲、eval 対象外理由が埋もれる。

## 影響

- Construction では B001 を先に進め、B002 で昇格と eval 整合を確認する。
- 代表 skill 以外を初回対象外にする場合は、Construction の decisions または traceability に理由を残す。
