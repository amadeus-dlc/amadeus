# Memory — u7-mirror-model functional-design

## Interpretations

## Deviations
- 2026-07-31T13:27:34Z — reviewer iteration 1 の4指摘を是正: AsImplemented は CI 恒常ジョブ外の一度限り実証(model-map 非登録)と契約化、abandon-attempt+status 変更2遷移を列挙へ追加(計11遷移)、遷移縮約 21→11 の論拠を BR-U7-2 申告対象へ、ADR-2 複製を棚卸しへ明示
- 2026-07-31T13:27:34Z — reviewer がスコープ外 grep 探索(scripts/tests/.claude/tools)を自己申告 — findings は許可範囲内証跡のみを根拠と明記。プロトコル違反として記録(u5 iteration 1 に続き2件目 — reviewer プロンプトのスコープ文言強化を §13 候補へ)
- 2026-07-31T13:33:06Z — iteration 2 Critical(ProjectSyncTransition 3遷移の status 変更が列挙・ピン集合から漏れ)を (a) 案で是正: 14 遷移へ拡張+reconciliation reducer を ADR-4 ピン集合へ追加(執行クラス改訂・decisions.md へ申告付き伝播)。予算消化後の列挙 omission クラスにつき E-LSSADS13 準拠で閉包確認限定の iteration 3 を実施
- 2026-07-31T13:33:06Z — reviewer の scope 逸脱2件目(reconciliation reducer の直読 — 検証課題の遂行に構造的に必要だった)を記録。以後の u7 系レビューでは当該ファイルを許可集合へ最初から含める
- 2026-07-31T13:37:22Z — iteration 3(閉包確認)が同根未伝播2箇所(T6・テスト設計の旧3ファイル表現)を検出 — cite-fix-sweeps-whole-record の実例。是正後、u7 全域+ADR-4 の grep で旧表現残存 0 を機械確認。残余は機械クラスにつき E-LSSADS13 の conductor 検証で受理(iteration 3 の他の全確認事項 — 14遷移の独立再列挙一致・7除外の非 status 変更・数値整合 — は reviewer が閉包済み)

## Tradeoffs

## Open questions
