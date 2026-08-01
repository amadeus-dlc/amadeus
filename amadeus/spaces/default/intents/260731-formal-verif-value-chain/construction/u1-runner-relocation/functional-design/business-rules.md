# Business Rules — u1-runner-relocation

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

business-logic-model.md の変換規則 T1〜T7 を拘束する規則。requirements(FR-A1/A2/A4)と decisions.md の ADR-2 から導出。

## BR-U1-1: 移設は git mv 相当のリネームとして行う

履歴追跡(blame・bug-intent-linkage)を保つため、内容変更を伴わないファイルは rename として diff に現れること。import 書き換え(T2)を伴う `canonical.ts` のみ rename+edit。

## BR-U1-2: 複製は生成物として扱う

`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` は core 正本からの機械コピーであり、手編集禁止(dist/ と同じ扱い)。同期コマンドは既存の再生成経路(scripts/package.ts 系)に統合するか専用の複製ステップを設け、drift 検査(T3)が正本との byte 不一致で赤になること。**落ちる実証**: 複製へ1バイト注入 → drift 検査赤 → revert の1セット(falling-proof-injection-one-set)。

## BR-U1-3: CI 変更は意味論保存

ci.yml の変更はパス文字列2箇所のみ。EVIDENCE_ROOT・artifact 名・exit 分岐(:629/:631)・workflow_dispatch 条件は変更しない。検証は workflow_dispatch 実行または等価のローカル再現(run→verify exit 0)。

## BR-U1-4: stage 本文の書き換えは全複製面へ同一変更

正本(plugins/.../stages/formal-model-check.md)を書き換えたら、compose 済み(.claude/plugins/)・staging(.claude/.amadeus-plugin-src/)・コンパイル済み(stage-graph.json)・dist 8 変種を同一 PR 内で再生成・同期する(NFR-3、cid:一括反映の束ね禁止は「無関係変更の束ね」であり生成物同期は同一変更が正)。

## BR-U1-5: 分類 D に触れない

u1 の diff に分類 D 30 ファイルへの変更・削除を含めない(u2 のスコープ — 無申告のスコープ拡大禁止)。**台帳2面でも同様**: u1 が remap するのは移設対象(分類 A/B/C)のエントリのみで、分類 D のエントリには触れない(T7 の intersect 規則)。逆方向の保護: u1 の台帳 remap は FR-A1 帰属改訂(2026-07-31 ユーザー裁定)による正規スコープであり、u2 の肩代わりではない。分類 D が参照するテストの赤が u1 で新規発生しないこと(移設は A/B/C のみで D は自己完結のため構造的に無影響のはず — 実測で確認)。

> **前提の反証と裁定(2026-07-31)**: 実装時実測により「D は自己完結」が反証された — 分類 D 30 ファイル中 26 が移設対象 7 モジュール(canonical/contract/run-model-check-domain/run-model-check/tla-arm/tlc-spawn-planner/tlc-toolchain)を import しており、u1 単独では typecheck green 不能(RE 閉包が出方向のみで入方向未計測)。ユーザー裁定: **B1 = {u1+u2} 統合 Bolt/1 PR**(正準「A Bolt wraps one or more Units」の適用)。本規則の「D に触れない」は Unit 帰属の規律として維持し、D の削除は同一 Bolt 内の u2 実装として実行する — 統合着地では D の import 破れは存在しない。green 検証(BR-U1-6)は統合着地(u1+u2 完了時点)で判定する。

## BR-U1-6: 検証コマンド集合

PR ごとに `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` 全 green+push 前ローカル lcov で patch 未カバー 0(local-lcov-pre-push)。
