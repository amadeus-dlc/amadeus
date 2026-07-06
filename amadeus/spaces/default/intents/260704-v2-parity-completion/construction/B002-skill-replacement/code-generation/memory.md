# Memory: code-generation（B002）

## Interpretations

- 「置換」を、旧 stage skill の即時削除ではなく「新 skill 系列の追加 + 入口の切替 + 旧系列の B004 までの残置」と解釈した。examples/skill-provenance.json が旧 skill 19 ファイルを参照しており、削除すると test:examples が missing file で fail するためである。
- 検証コード（eval、カタログ）の追随は B002 の削除作業の一部と解釈した（削除された skill の fixture を残すと green にならない）。

## Deviations

- 計画書の「旧 stage skill 19 個」は誤記で、実数は 22 個（ideation 7、inception 8、construction 7）である。B004 の削除対象は 22 個 + amadeus-steering。
- question-rendering.md を references/ へ移設した（promote-skill.ts の許可リストが SKILL.md 以外の直下ファイルを昇格しないため）。SKILL.md 内の参照 1 行も追随。
- エンジンの Stop hook が本セッションで発火し、指示に従い workflow を park した（WORKFLOW_PARKED はエンジンが per-clone shard に記録）。resume は B004 の dogfooding で行う。

## Tradeoffs

- 新旧 skill の併存（Claude Code の skill 一覧に両系列が見える）は、provenance 保全と引き換えの一時状態である。期間は B004 の examples 再生成まで。
- .gitattributes による audit shard の whitespace 検査除外は、エンジン出力（`**Agent Type**: ` の空値末尾空白）の無改変と引き換えに、shard の空白品質検査を放棄する。

## Open questions

- 旧 amadeus references/（stage-catalog.md、aidlc-v2/ テンプレート）は契約文書からまだ参照されている。B004 の文書改定で退役させる。
- amadeus-contracts カタログの consumer 分類ラベル（decision-review、learning-review）は概念参照として残存。B004 の文書改定で v2 の Learnings Ritual 語彙へ寄せるか判断する。
