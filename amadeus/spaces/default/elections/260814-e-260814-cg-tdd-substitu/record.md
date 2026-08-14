# Election Record — E-260814-CG-TDD-SUBSTITUTE

- question: code-generation(intent 260814-fmc-macos-provider、Issue #2361、PR #3007)の TDD 実施逸脱の裁定。承認済み plan は全 slice の Red 実測を前提としたが、実装後に3面で先行 Red が取れなかった: (1) FR-2(auto の両系統失敗で ENVIRONMENT_UNAVAILABLE + 両理由連結)— FR-1 の最小実装(AutoTlcSpawnPlanner の snapshot フォールバック)が両系統失敗分岐を必然的に含んだため、テスト追加時に即緑。(2) FR-3(明示 provider は非フォールバック)— 挙動不変の保存要件で、新規挙動が存在しない。(3) FR-7 の planner 種別 assert の一部(auto+非darwin→Docker 等の既存挙動面)。builder は3面すべてで代替の落ちる実証を実施済み: 対象分岐へ故障注入 → テスト赤を実測 → 復元 → 残渣ゼロを grep で機械確認(FR-2: describeFailure 合成式の除去注入で 1 fail、FR-3: 明示経路へ Auto planner を噛ませる注入で 1 fail、FR-7: platform 分岐反転注入で 1 fail)。team.md Testing Posture は「実装後の落ちる実証は TDD 実施とみなさない」「エラーパスも TDD 適用対象」と定める一方、「振る舞い不変のリファクタリング」は適用外とし characterization test を認める。検証結果自体は全緑(統合ツリーでフルスイート 992 files / 0 fail)。この3面の代替検証を受理して成果物を確定させるか、厳密再実施(該当実装の revert → テスト追加 → Red 実測 → 再実装)を要求するか。

裁定: FR-2 のみ厳密再実施を要求(FR-3/FR-7 は受理)(choice 2: 2票)
内訳: choice1=0票 choice2=2票 choice3=0票
- 留保(subagent-1, GoA2): FR-2 の厳密再実施が生む赤は、実施済みの describeFailure 除去注入が示した赤とほぼ同一であり、検出力の証拠はほとんど増えない。それでも再実施を課すのは、team.md が「実装後の落ちる実証は TDD 実施とみなさない」「エラーパスも適用対象」と名指しで定めており、これを受理すると「happy path の最小実装が必然的に含んだ」という理由付けが任意のエラーパスに転用可能な一般的抜け道になるため。再実施は composed error を最小形へ戻す1箇所の revert で足り、コストは小さい。
- 留保(subagent-2, GoA2): FR-2 の再実施は、既存テストを残したまま tlc-spawn-planner.ts:552-559 の合成式を最小形(fallback.error をそのまま返す)へ戻して Red を実測し、合成を再導入して Green にする範囲で足りる。AutoTlcSpawnPlanner 全体の revert は求めない。
票タイムライン: subagent-1 2026-08-14T02:51:07Z → subagent-2 2026-08-14T02:51:15Z → 配信 2026-08-14T02:59:51Z → 配信 2026-08-14T02:59:51Z → 開票 2026-08-14T02:59:58Z
GoA[E-260814-CG-TDD-SUBSTITUTE]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
