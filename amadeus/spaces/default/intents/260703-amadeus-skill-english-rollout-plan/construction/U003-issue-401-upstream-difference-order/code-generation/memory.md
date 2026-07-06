# Memory: code-generation

## Interpretations

- B003 は #401 の順序整理であり、#391、#392、#393、#394 の個別実装は含めない。
- #391 と #393 は stage skill の確認、検証、知見記録の境界に影響するため、#392 と #394 より先に扱う。
- #392 は Build and Test の失敗時処理の契約判断であり、#391 と #393 の判断を受けて扱う。
- #394 は Operation phase を現在の Amadeus DLC 対象外とする境界の明文化であり、Operation skill の追加は含めない。
- `Construction Autonomy Mode: autonomous` のため、会話内 gate は提示せず、approval evidence は B003 PR merge 後に記録する。

## Deviations

- Functional Design、NFR Requirements、NFR Design、Infrastructure Design は skip した。#401 は順序と PR 境界の整理であり、新しい業務ロジック、非機能要求、インフラ設計を追加しないためである。
- skill 本文は変更していないため、昇格フローは実行しない。

## Tradeoffs

- #391 から #394 の issue body を直接編集せず、リポジトリ内の docs で順序と PR 境界を定義する。PR review で変更履歴を追えるようにするためである。
- Issue 側には、PR 作成後に必要に応じてコメントで計画文書を参照させる。

## Open questions

- #391 以降で実際に reviewer、sensor、Learn を取り込むかどうかは、それぞれの Issue の PR で判断する。
