# Build and Test Memory

## Interpretations

- 2026-07-12T12:33:02Z — Standard戦略の中核はunitとintegrationとし、performance/security文書は承認済みNFR境界の検証手順として生成した; directiveのproducesに両文書が明記され、quality/devsecops観点も要求されたため。

## Deviations

- 2026-07-12T12:33:02Z — AWS資格情報が無効なため既存live SDK/substrate testsはrunner規定どおりskipした; 本featureはAWS SDK境界を追加しないためローカル対象検証を継続した。

## Tradeoffs

- 2026-07-12T12:33:02Z — 新規load/DAST/dependency scanを追加せず、CLI timeout・workflow静的契約・既存lint/typecheckを採用した; featureの攻撃面と承認済みNFRに比例した検証に限定するため。

## Open questions

- 2026-07-12T12:33:02Z — landing後のmain workflow実行、bot author、実queue挙動はローカルで確定できない; CI Pipeline/運用段階で確認する。
