# Build and Test Summary

**Intent**: 260810-grilling-frontier-resync / **Stage**: build-and-test (3.6) / **Test Strategy**: Comprehensive

上流入力(consumes 全数): `code-generation-plan.md` / `code-summary.md` / `pr-convergence-report.md`(3 Unit の実装実績)、`unit-of-work.md`(U1/U2/U3 完了条件)、`requirements.md`(FR/NFR)、`bolt-plan.md`(Bolt ごとの検証列)。詳細な実測は `build-test-results.md`、各指示書は `build-instructions.md` / `unit-test-instructions.md` / `integration-test-instructions.md` / `performance-test-instructions.md` / `security-test-instructions.md`。

## 結論

**条件付き READY**。宣言済みゲートは全数 exit 0(フルスイート 943 ファイル PASS / 0 FAIL、13,030 assertions / 失敗 0)。条件は **FR-DOG-1(dogfood 実走)未実施**の1点で、これは受け入れ基準の内側にあるが実走という運用行為であり本ステージのコマンド実行では代替できないため、実施時期をゲートでユーザーへ諮る。

## 3 Unit の着地

| Unit | Bolt | PR | §12a |
|---|---|---|---|
| U1 `protocol-core` | Bolt 1 | [#2828](https://github.com/amadeus-dlc/amadeus/pull/2828) MERGED | READY |
| U2 `budget-sensor` | Bolt 2 | [#2843](https://github.com/amadeus-dlc/amadeus/pull/2843) MERGED | i1 NOT-READY → 上流 FD 3成果物を申告付き改訂 → **i2 READY (GoA 2)** |
| U3 `projection-sweep` | Bolt 3 | [#2844](https://github.com/amadeus-dlc/amadeus/pull/2844) MERGED | i1/i2 とも NOT-READY(予算消尽)— BLOCKER 7件は**全件レビュー環境起因**(i1 = Bolt 未取込 / i2 = 自己インストール投影の未再生成)で実装欠陥ゼロ。conductor が `bun run build` 後に配送先ツリーの述語で 0 hit を再実測して閉包し record へ固定 |

## この Construction で確定した裁定

- **E-GFR-CG1**(Bolt 1、2-0 / GoA 2x2): 遮断器境界のラウンド原子性 — 外部レビュー起点の契約変更を選挙で裁定し、overlay と BR へ申告付き追補で両面同期。
- **E-GFR-CG2**(Bolt 2、2-0 / GoA 2x2 + **ユーザー承認 2026-08-10**): 刈りノード列挙節の write⇔check 非対称を、言語中立マーカー `<!-- amadeus-grilling:deferred -->` への統一と U1 正本への追補で解消。builder の**実装前停止**が起点。着地済み出荷 protocol の改訂はエスカレーション正準リスト(4)該当としてユーザー裁定を経た。
- **onboarding.md の旧語彙残存**(ユーザー裁定 2026-08-10): Bolt 3 へ同梱是正(cid:code-generation:c6 の対称適用・申告付きスコープ拡張)。
- **E-GFR-CGS13**(§13、2-0 / GoA 2x2): 学習2件を persist(review 前の取込+再生成 / swarm pool のセッション断復旧)。

## 申し送り

1. **FR-DOG-1(dogfood 実走)未実施** — 上記条件。実施時期はゲートで諮る。
2. **t530 / t531 の tNNN 共有** — 既存の別テストファイルと番号が重複している(§12a FOLLOW-UP)。機能欠陥ではないが、改番または意図的併存の明記が要る。
3. **wall-clock drift 7 ファイル** — いずれも本 intent の変更対象外。並行負荷下の実時間逸脱表示であり size purity の静的違反ではない。
4. **`git status --porcelain` 空は自己インストール投影の更新を証明しない** — source-only 境界下の受け入れ確認は配送先ツリーの述語で行う(本 intent で E-GFR-CGS13 として persist 済み)。
