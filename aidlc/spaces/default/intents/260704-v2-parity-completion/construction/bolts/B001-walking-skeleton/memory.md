# Memory: build-and-test（B001）

## Interpretations

- sandbox での report 拒否 2 種（produces 不在、presence 不在）を「失敗」ではなく「ガードの実証成功」と解釈した。halt-and-ask の対象は想定外の失敗であり、これは仕様どおりの拒否である。
- scopes 欠落による初回エラーは、code-generation-plan.md が事前承認した「強依存分の最小追加」に該当し、halt-and-ask の対象にしなかった。

## Deviations

- 追加コピー 4 ディレクトリ（scopes、agents、knowledge、rules/aidlc.md）は当初の最小集合の外だが、計画の除外節に記録した条件付き追加の発動である。parity-map の除外リスト（B003）には「rules は名前空間マージ」を反映する必要がある。

## Tradeoffs

- gate 通過を伴う完全な 1 周は human presence が必要なため B004 へ後送した。夜間に presence を偽装する選択肢は、エンジンのガードの意味を壊すため採らなかった。

## Open questions

- 実セッションでの presence hook 発火と gate 通過（B004 の dogfooding で確認）。
- `rules/aidlc.md` の内容と既存 `.agents/rules/` 系規範の整合（B004 の文書改定で点検）。
