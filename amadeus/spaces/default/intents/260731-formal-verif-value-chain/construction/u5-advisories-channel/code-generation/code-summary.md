# Code Summary — u5-advisories-channel

上流入力(consumes 全数): unit-of-work, functional-design, nfr-design, bolt-plan

## 実装結果(bolt-u5-advisories-channel ブランチ、conductor へ --no-ff マージ済み)

- **消費側棚卸し(BR-U5-1)**: strict parser は共有契約モジュール `amadeus-directive.ts` `validateDirective`(RUN_STAGE_FIELDS :447-452)のみ = 生産者自身の契約 → allowlist 拡張が変更そのもの。reviewer-runtime は同一 validateDirective 経由で自動追従(t245/t365 green)。stop hook は kind のみ読取で無影響。tests に key-set 等値 assert 0 件(Object.keys 全域スイープ)。**停止条件非該当**。
- **実装**: Advisory 型+`activationAdvisoriesForHost(hostRoot, stage, fs?)`(E1 の stage フィールド要求に忠実な signature)、ACTIVATION_ADVISORY_STAGES 3 点集合、2 経路配線(emitForSlug+emitSingleRunStage)、session-scoped ラッチ(`<record>/.amadeus-advisory-latch/<session>/<plugin>.<code>`、gitignored、fail-open)、stdout `advisories` 非空時のみ+stderr 併用、stage-protocol.md §11a 提示規範、stale コメント改訂(BR-U5-7)。
- **TDD 実測**: slice 1/2/3/7 は真正 Red→Green(Red 実文記録あり)。**申告プロセス逸脱**: slice 4-6(発火点集合・ラッチ・--single 配線)は slice 3 の編集内で先行実装され Red-first を欠く — 事後の注入 4 種で テスト実効を実証(下記)。
- **落ちる実証(BR-U5-5)**: (i) `return []` 注入 → t378 赤 (ii) 発火点集合を単点化 → t381 赤 ×4 (iii) emitSingleRunStage 呼出しのみ削除 → t381 赤 ×1(--single テストが正確に検出) (iv) ラッチ無効化 → t381 赤 ×2。復元は fix SHA からの checkout(stash 不使用)→ 58/58 green。
- **t322 のピン留め不変条件の明示改訂**: 旧「stdout に advisory 文言を含まない」(U6 stderr-only 規則)は FR-B2(承認済み要件)が意図的に置換 — 生存する性質「stdout は単一 valid JSON+advisory 文言は advisories フィールド内のみ」へ書換(c1-pinned-behavior-ruling: 要件裁定に接地)。

## 検証(builder 実測+conductor 側でマージ後再実測)

| コマンド | exit |
|---|---|
| typecheck / lint / dist:check / promote:self:check | 0 / 0 / 0 / 0 |
| gen-coverage-registry --check | 0 |
| coverage-patch-gate --check | 0(**111 追加行 / 111 covered / 0 allowlisted / 0 uncovered**) |
| run-tests.sh --ci(マージ前 worktree) | 1(fail=1: t356 既存・base 版差 — 無改変 base で再現確定) |
| run-tests.sh --ci(origin/main 再接地後) | **0(fail 0)** |

swarm check: converged ✓ tampered=false。新規テスト: t378-advisories-directive-field.integration(+検証器の per-field 報告テスト)、t381-advisory-checkpoints-latch.integration。
