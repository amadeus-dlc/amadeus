# Stakeholder Map — 全ハーネスの長時間実行改善（Codex 一次評価）

## Stakeholders and Interests

| Stakeholder | Role | Primary interest | Evidence or concern |
|---|---|---|---|
| ユーザー／Initiative owner | 最終意思決定者 | Amadeus の長時間実行を測定可能・予測可能・安全に停止可能にし、Codex で一次効果測定する | Codex での長時間化の継続観測、4 Issue を1 Intentで直列改善する方針、各 Issue の `in-progress` 運用 |
| 全 supported harness 上の Amadeus 利用者 | 正しさ・安全性の一次利用者 | 待機すべきか停止すべきかを同じ予算・終了理由で判断でき、異常反復が有界に終わる | 共有 conformance predicate、明示的な終了理由、上限遵守 |
| Codex 上の Amadeus 利用者 | 性能評価の一次利用者 | Codex で観測された長時間化の支配要因と改善前後差を確認できる | stage・agent・tool の時間、同一 workload の対照／処置比較 |
| Amadeus core／各 harness adapter コントリビューター | 実装・保守担当 | 共通不変条件を各 harness 投影で実証し、回帰をテストで防ぐ | #1602、#1998、#1999、#1919 の依存順、core conformance と adapter capability |
| 独立レビュアー | 検証担当 | 起票主張、実装、検証結果が実測証拠に接地していること | #1998 の `ESTABLISHED_WITH_REFINEMENTS`、起票時再現の再適用、無申告逸脱の検査 |
| 各 harness の保守者 | adapter 証拠の所有者 | native hook／lifecycle の差を共有 predicate へ写像し、取得不能 capability を明示する | harness-neutral な共有契約、配布物と self-install の同期、adapter conformance |
| CI・release 管理者 | 品質境界の所有者 | typecheck、lint、test、coverage、dist／promote drift が green であること | Bolt ごとの検証と package/promote 後の fresh-session dogfood |

## Decision Makers and Influencers

- ユーザー／Initiative owner は、ユーザー可視の仕様変更、stage ゲート、セッションの park／resume、各変更のマージを最終判断する。
- Amadeus conductor は engine directive に従って成果物・監査・Issue 状態を同期するが、仕様やマージを単独決定しない。
- Product 観点は問題、対象者、成功指標、優先順を所有する。
- Architecture 観点は共有不変条件、harness adapter の capability 境界、Codex を一次性能評価へ限定する妥当性、依存順の成立性を検証する。
- 独立レビュアーは起票時再現、対照／処置、要件・設計からの逸脱を検証し、合格可否へ影響する。

## Communication Requirements

| Event | Audience | Required communication |
|---|---|---|
| Bolt 着手 | ユーザー、コントリビューター | 対象 Issue だけへ `in-progress` と担当者を設定し、他 Issue は未着手のままにする |
| ベースライン確定 | ユーザー、後続 Bolt 実装者、各 harness 保守者 | #1602 の共有 schema／取得不能表現と、Codex 一次 workload の時間分布・由来情報・証拠パスを共有する |
| Bolt 完了 | ユーザー、後続 Bolt 実装者 | 合格条件、対照／処置、検証結果、残余リスクを共有し、対象 Issue の `in-progress` を除去する |
| 後続 worktree 再接地 | 後続 Bolt 実装者、レビュアー | 最新 base、rebase 結果、前段改善の利用可能性、再検証結果を共有する |
| package/promote 完了 | ユーザー | Intent を park する準備と、新しい Codex セッションで resume する理由を明示する |
| 異常・上限到達 | ユーザー、保守者 | 終了理由、到達した予算、最後の有効進捗、再開可否を明示する |

## Working Sequence and Handoffs

`#1602 baseline → #1998 stopping → #1999 interaction budgets → #1919 bounded swarm`

各 handoff は、先行 Bolt の計測・契約・配布結果を後続 Bolt が利用できる状態を確認してから行う。rebase は単なる競合解消ではなく、前段で改善された観測・停止・質問契約を後段の作業そのものへ適用するための境界である。

## Known Communication Risks

- 現行セッションは package/promote 後の hook・prompt 更新を自動再読込しない可能性があるため、同一セッション継続だけでは改善効果を後段作業へ反映できない。
- 時間短縮だけを報告すると停止性の改善を見失うため、時間、反復回数、終端理由を組み合わせて報告する。
- 全ハーネスへの正しさ・安全性契約の適用と、全ハーネスでの同率性能改善を混同しない。前者は完了条件、後者は本 Intent の完了条件外である。
- harness 固有の adapter test／live probe と harness 固有の安全ポリシーゲートを混同しない。後者は共有 predicate で欠陥を検出不能とする再現可能な例外証拠がある場合だけ許容する。
