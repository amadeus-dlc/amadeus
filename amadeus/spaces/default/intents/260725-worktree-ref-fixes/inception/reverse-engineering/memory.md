<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-25T23:05:21Z — #1482 の機序は Issue 推定(env 未設定→rung2 本線解決)と実測が乖離: 実際は CLAUDE_PROJECT_DIR が本線値で設定済みのまま rung1 が marker rung を追い越す。t202 test 2(:105-117)がこの優先順位を固定しており、#641 設計意図との整合が RA/設計段の裁定点
- 2026-07-25T23:05:21Z — 差分リフレッシュの base は re-scans の observed のうち HEAD 祖先で距離最小の ec624022f(dist=10)を採用。4a0f91ad0/703369375 は squash 運用により非祖先で除外(cid:reverse-engineering:rescan-base-ancestry の機械判定)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-25T23:30:38Z — 本セッションは CLAUDE_PROJECT_DIR 空により全 hook が無音不発(HUMAN_TURN/SESSION_STARTED/ARTIFACT_UPDATED 全所在ゼロを実測)。ユーザー裁定(AskUserQuestion)により、実タイプ2件(「バグ？？？」「最新のorigin/mainから…」)に1:1対応する mint-presence 手動代行+solo standing grant f9ef0312(#1483、expires 2026-07-26T03:30Z)で以後の stage-gate を接地。#1482 と同族の環境事象として RA の一次材料に含める
- 2026-07-25T23:05:21Z — RE 宣言センサー3種は codekb 出力パスが sensor filter に構造不適合で発火不能(cid:reverse-engineering:re-sensors-codekb-filter-mismatch)。センサー成功として扱わず H2≥2 grep 機械確認+上流参照直接検証で代替

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-25T23:05:21Z — #1481/#1455 の原因所在: 導入 2e157d7fe(#1424 intent)の requirements/design に FS 直読の指定があるか未照合 — 実装判断由来の見立てを RA 段で確定する
