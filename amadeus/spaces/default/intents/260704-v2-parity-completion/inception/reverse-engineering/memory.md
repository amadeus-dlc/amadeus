# Memory: reverse-engineering

## Interpretations

- CD004（codekb は前 Intent の変更前解析のまま）を受け、今回の解析は鮮度更新として実施した。既存の見出し構造と表の列構成は維持し、古くなった記述だけを更新した。
- 解析はサブエージェントへ委譲した（skill 手順の「大規模な場合は subagent へ委譲できる」に該当。skill 32 個、docs、examples、CI を横断するため）。

## Deviations

- なし。9 ファイルすべてを read-only 調査に基づいて更新し、対象コード自体は変更していない。

## Tradeoffs

- 鮮度更新のため差分中心の更新にした。全面再解析より速いが、f52f0af8 以前から変わっていない記述の再検証は薄い。誤りが見つかった場合は後続 Intent の 2.1 で扱う。

## Open questions

- examples 4 snapshot の staleReason 解消（real provider 再生成）は本 Intent の A 柱後半で扱う。
- 本解析は移行前の現行構成の記録である。本 Intent の C 柱と B 柱が完了すると codekb の大部分（skill 構成、エンジン、検査）が再び古くなるため、Intent 完了時に再度 2.1 相当の更新が必要になる。

## 主な確認事実

- 32 skill（公開入口 1 + 補助と内部 31）の SKILL.md 本体は英語化済みで、source と昇格先は evals/ を除き完全一致。
- examples の 4 snapshot はすべて staleReason 付きで real provider 再生成待ち。
- Issue #391〜#395、#399〜#402 はすべて CLOSED。Issue #396（本 Intent の親）は open。
- 解析対象 commit: 42f3caee10a45267ad60b90021dc90883b2e95d2。
