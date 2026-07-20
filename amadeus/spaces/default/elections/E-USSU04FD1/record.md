# Election Record — E-USSU04FD1

- question: 260720-upstream-sync-230 / U04 routing-and-autonomy-guards / functional-design Q1: stale compose markerのjanitor ownershipと削除契約をどう固定するか。前提反証: upstream 45035eaのStop hookはstale markerをcarve-out拒否するだけでなくbest-effort unlinkし、doctorはread-only。一方、承認済みFR-1 item5は24h以内のみ有効・staleはcarve-out不使用・doctorがstaleと修復方法表示まで、C2 rejected/failed invariantはmarker不変を規定し、stale markerの削除有無を一意に固定しない。A=upstream同型でStop hookがbest-effort削除しdoctorはread-only、B=stale markerを保持しdoctorが報告・手動修復、X=その他。各自e5 questions、upstream 45035ea一次差分、FR-1/C2をリードオンリー実測し、GoA・非採用時受容度付きで投票する。全票はleader現行CLIで受理する。10:35:47ZのE-OC1承認は前提反証により未執行・無効。

裁定: A. Stop hook best-effort削除 + doctor read-only(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票
- 留保(e2, GoA2): C2のrejected/failed marker不変と衝突させないため、stale削除はcarve-out拒否結果の副作用ではなく、freshness判定後の独立したbest-effort janitor outcomeとして設計・記録すること。unlink失敗でもblock判断は不変、doctorはread-onlyを維持し、fresh保持/stale削除/unlink失敗の3経路を対照testで固定する。
票タイムライン: e1 2026-07-20T10:37:49Z(受理 2026-07-20T10:38:07Z) → e2 2026-07-20T10:37:56Z(受理 2026-07-20T10:38:08Z) → e3 2026-07-20T10:38:24Z(受理 2026-07-20T10:38:41Z) → 開票 2026-07-20T10:40:57Z
GoA[E-USSU04FD1]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
