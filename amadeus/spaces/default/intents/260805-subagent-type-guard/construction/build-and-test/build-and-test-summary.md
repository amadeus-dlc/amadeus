# Build and Test Summary — Issue #2279

**上流入力(consumes 全数)**: U1 detection-skeleton / U2 model-attribution /
U3 subagent-stats の `code-generation-plan.md` と `code-summary.md`
**テスト戦略**: Comprehensive(`amadeus-state.md`)

## 全体のビルド状態と前提

ビルドは成功している(`bun run build` exit 0)。前提は Bun 1.3.13 と
`bun install --frozen-lockfile` のみで、本 Intent の変更は追加ランタイム依存を
持ち込まない(node builtins + リポジトリ内モジュールのみ)。

最重要の運用前提は **`packages/framework/core/` を編集したら必ず `bun run build`**
であること。テストは投影後の `dist/claude/.claude/tools/...` を import するため、
再生成を忘れると変更が反映されず赤になる(U1 の記録に同じ落とし穴が逸脱として残る)。

## 生成した指示書の一覧

| ファイル | 対象 |
|---|---|
| `build-instructions.md` | 依存導入・環境変数・ビルド・検証・トラブルシュート |
| `unit-test-instructions.md` | 純関数層(分類・model 解決・集計/描画)の契約固定 |
| `integration-test-instructions.md` | 実 FS・hook 配線・CLI spawn・corpus sweep |
| `security-test-instructions.md` | 出力サニタイズ・値空間の閉鎖・traversal・CON-1・fail-open |
| `performance-test-instructions.md` | 観測のとり方と退行時の追加手順(受入基準は設けない) |

E2E・アクセシビリティ・契約テストは該当しない(UI 面・外部 API 面・常駐サービスを
持たないため)。性能は明示 NFR 不在のため受入基準に昇格させていない。

## Unit ごとのカバレッジ期待

| Unit | 完了条件 | 実測 |
|---|---|---|
| U1 detection-skeleton | AC-1(純関数 in-process)/ AC-2(落ちる実証) | t451 13 + t452 10 = 23 pass |
| U2 model-attribution | AC-4(4 解決ケース + Codex fixture)/ AC-5(欠落明示 + emit 継続) | t453 10 + t454 13 = 23 pass |
| U3 subagent-stats | AC-3(corpus sweep 両側実証)/ AC-6(測定 ref + unresolved 区分) | t460 18 + t461 9 = 27 pass |
| **合計** | | **73 pass / 0 fail** |

Comprehensive の基準は行カバレッジの数値目標ではなく**契約の網羅**とした:
各 BR / AC に対してそれを落とせるテストが 1 つ以上あること、fail-open 経路が
明示的に測られていること、`tests/.coverage-registry.json` が fresh であること。

## 準備状況の評価

| 観点 | 判定 | 根拠 |
|---|---|---|
| build-ready | **可** | build / typecheck / lint すべて exit 0 |
| test-ready | **可** | 本 Intent の対象 73 テストが全数 green |
| deployment-ready | **条件付き** | 下記「未解決事項」の CI ゲート 5 ファイルが赤のまま |

## 未解決事項・既知の制約

1. **CI スイートの 5 ファイルが赤**(assertions 10 件)。no-silent-drop センサス /
   mechanism ratchet / unchecked-cast allowlist 系。**変更前コミット
   `413e67523` の分離 worktree と失敗集合が完全一致**することを実測で確認済みで、
   本 Intent の回帰ではない。原因はベース revision 解決
   (`BASELINE_INVALID: check mode requires a non-zero trusted base revision`)で、
   本ブランチが origin/main と 13 / 51 コミット分岐していることに起因する。
   → リポジトリ側の課題。マージ前に origin/main との関係を整えるか、ガードの
   ベース解決を見直す必要がある。

2. **formal-model-check の macOS 既定経路が不通**。`auto` は macOS で sandbox-exec を
   選ぶが `ENVIRONMENT_UNAVAILABLE` になる。`--provider docker` で完走し、
   `FormalElection` は **NOT_DETECTED(反例なし)**。加えて
   `FIXED_JDK_RUN_PROFILE` が JDK のパッチ版完全一致(26.0.1)を要求しており、
   26.0.2 では通らない。→ 別 Issue 候補(本 Intent スコープ外)。

3. **hook 発火ごとの agents dir 再読にキャッシュが無い**(BR-U1-6 の据え置き判断)。
   現規模では実測 0.163s で問題ないが、設計裁定を経ずに変更しないこと。

4. **started 面は Claude Code では休眠**(#2303 / #2297 未修正のため発火しない)。
   kimi role-start 経路では live。テストは両 payload 形状で駆動している。

## 本ステージで是正した事項

§12a レビューの follow-up 2 件のうち 1 件は**実装欠落**だった。集計 CLI の
`renderStatsText` が audit 由来の値を無サニタイズで端末へ出力しており、
security-design が要求する制御文字除去が実装に落ちていなかった。
commit `131600b11` で是正し、改行による行偽造と ANSI エスケープの両方を
落とせるテストで固定した。回帰させないこと。
