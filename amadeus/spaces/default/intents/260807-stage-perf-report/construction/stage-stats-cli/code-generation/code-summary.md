# Code Summary — stage-stats-cli(Bolt 1)

上流入力(consumes 全数): requirements(FR-1〜FR-7 / NFR-1〜5 の AC を検証対象として消費)、business-logic-model / business-rules / domain-entities(実装仕様として消費)、nfr-design 5 点(配置・検証機構として消費)、decisions(ADR-1〜6 の裁定として消費)、code-generation-plan(実装ステップ 1〜12 の計画として消費)

## 実装成果(builder: amadeus-developer-agent、Agent worktree isolation)

| ファイル | 規模 |
|----------|------|
| packages/framework/core/tools/amadeus-stage-stats.ts | 944 行(新規) |
| tests/unit/t484-stage-stats.test.ts | 523 行 / 55 tests / 126 assertions |
| tests/integration/t485-stage-stats.integration.test.ts | 406 行 / 15 tests / 70 assertions |
| tests/.coverage-registry.json | 再生成(conductor ツリーで再々生成し ratchet held) |

- builder コミット `87910ac378b0c7ac7b331f06baec4656b7352200` → conductor ツリーへ cherry-pick(`80480eec0` 系、amend 後)。fidelity diff(コード 3 ファイル)は空 = byte 一致を機械確認

## 検証(conductor ツリーで再実行、実測 exit code)

- `bun run typecheck` = 0 / `bun run lint` = 0
- t484 = 0(55 pass)/ t485 = 0(15 pass)/ t460+t461 = 0(39 pass — C-2 green 維持)
- `bun tests/gen-coverage-registry.ts --check` = 0(fresh, ratchet held)
- builder ツリーでの追加実測: complexity-gate 0 / unchecked-cast 0 new / source-only:check 0 / no-silent-drop(祖先 SHA 明示)0

## NFR-1 実測 / 恒等(builder 実測、実ワークスペース 1 回実行)

- 実行時間 **0.653 秒**(上限 60 秒 — 約 92 倍の余裕)。走査 225 シャード / 133,663 行
- 恒等 W: 構成窓 1563 = net 母集団 1126 + unclosedIdle 34 + zeroSecond 403 — 成立
- 恒等 M: 7404 = attributable 10 + unresolved 7394 — 成立
- observed 参照値との照合: unpaired 35+5 一致、Model 帰属可能 10 一致、0 秒窓 394→403(コーパス増分)

## 落ちる実証(NFR-5 — 注入→赤→revert の 1 セット×3)

1. 除外バケット報告行の削除 → 3 fail(ヘッダ検査)
2. fail-loud を return 0 化 → 1 fail(spawn exit 1 検査)
3. 未クローズ idle の黙示救済化 → 3 fail(unclosedIdle 計上・排他性・恒等 W)

いずれも赤を実測後 fix SHA へ復元、残渣ゼロを diff --stat 空+status クリーンで機械確認。

## 申告付き逸脱(builder 申告、conductor 受理)

1. **テスト番号 t481/t482 → t484/t485**: base 前進で t481〜t483 が使用済み(実測)。NFR-2「t481 以降」は充足(cid:c1-tnnn-collision-on-regrounding の同型)
2. **FR-7a 検査の配置**: 対象ソース実読を要するため tests/integration(t485)へ配置 — 承認済み NFR-2(実 FS は integration)を dispatch 文言より優先。FR-7a AC は配置を規定しない
3. **設計成果物の入手**: fork 元に record 不在のため checkpoint コミットから git show で read-only 読出(既知事象)
4. **unparseableReviewHeading 実測 117 vs observed 参照値 3**: 2 段マッチの寛容側が裸の `## Review`(73)や `## Review Iteration N Remediation`(26)等を拾う仕様どおりの挙動。OQ-2「実装の機械集計値を最終確定とする」に従い実装は不変 — **本乖離は build-and-test 成果物へ記録する(OQ-2 の閉包手順)**

## 検証水準の開示

swarm referee(check/finalize)は本セッションの worktree 隔離ガード下で使用不能(cid:code-generation:c1-pcp-isolated-session-swarm-incompat)のため converged 表記を用いない。代替水準 = fidelity diff 空の機械確認+conductor ツリーでの検証コマンド再実行(上記 exit code)。
