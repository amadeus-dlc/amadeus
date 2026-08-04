# Intent Statement — ハーネス横断 live E2E

Intent: `260803-harness-live-e2e`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)  
共有面: [Mirror Issue #2132](https://github.com/amadeus-dlc/amadeus/issues/2132)

## Problem Statement

Amadeus の live E2E は、実ハーネス CLI と実モデルを使って配布面を検証する重要な安全網である。しかし、明示 opt-in、GitHub Actions での hard deny、実行前検査、認証情報と設定の隔離、scratch project の生成・破棄、skip reason といった保証は `tests/harness/codex-exec-live.ts` に集中している。他ハーネスでは同種の責務が分散または欠落し、同じ安全契約を再利用できない。

この非対称により、ハーネス配布面を変更した際に「実際の CLI とモデルで動くこと」「CI や子プロセスへ認証情報を漏らさないこと」「未実行・timeout・実失敗を区別できること」を一貫して確認しづらい。特に、GitHub Actions hard deny が Codex 以外の既存 live path に揃っていない点は、ローカル専用という不変量をハーネス横断で保証できていない。

## Target Customer

主な対象は、Amadeus のハーネス配布面を保守・変更する開発者である。対象者は、変更したハーネスについて短い opt-in live journey を安全に実行し、成功・skip・timeout・実失敗を区別できる証拠を必要としている。

直接の受益者には、Claude Code、Codex CLI、Kimi Code、Kiro CLI、Kiro IDE、Cursor、OpenCode の各利用者も含まれる。彼らにとっての価値は、日常 CI では再現できない実CLI・実モデル・実認証の境界が、ハーネス固有の能力差を隠さず検証されることである。

## Success Metrics

成功は Issue #1717 の受け入れ条件で測定する。

1. 明示 opt-in、GitHub Actions hard deny、機械可読な skip reason、認証・設定隔離、scratch lifecycle、timeout と失敗分類を共通 contract として固定する。
2. 共通 policy の unit test と、偽 executable・偽配布物を使う adapter integration test を追加し、違反注入による「落ちる実証」を含める。
3. Codex の既存 live E2E と認証隔離を維持し、Claude Code の `claude -p` による最小 live status journey を追加する。
4. Claude Code の既存 SDK/TUI、Kimi Code、Kiro CLI/IDE の live path を共通 policy へ接続する。接続不能な面は、阻害要因・推奨 seam・受け入れ条件を持つ後続 Issue へ接続する。
5. Cursor と OpenCode を実機確認し、実現可能なら adapter と最小 live journey を追加する。不能なら実測結果と成立条件を後続 Issue に残す。
6. 全ハーネスと transport の capability matrix に最終 live green の SHA を記録し、該当配布面を変更した Intent の完了前に live journey を実行する運用契約を文書化する。
7. live journey はローカル opt-in・直列・短時間・短いプロンプトに限定し、通常の GitHub Actions では起動しない。

## Initiative Trigger

完了 Intent `260728-slop-cleanup` の成果として `tests/harness/codex-exec-live.ts` に live E2E の安全責務が集約されたことで、他ハーネスとの保証差が明確になった。Issue #1717 はその差をクロスレビュー2名の実測で確認し、Codex を起点に共通 policy/lifecycle seam とハーネス別 adapter を段階展開するために起票された。

今取り組む理由は、ハーネス配布面が増えるほど個別 gate、認証隔離、skip reason、cleanup の分散実装が腐敗しやすくなり、live test が「存在するが実行されない」「環境依存の偽赤になる」「安全境界がハーネスごとに異なる」状態を拡大するためである。

## Initial Scope Signal

本 Intent は Amadeus 自体へ新しいハーネス横断検証契約と adapter 群を追加するため、`self-feature` を適用する。Depth は Standard、Test Strategy は Comprehensive とする。

範囲は Issue #1717 の Phase 1〜3 全体である。実装と PR は Phase または独立した縦スライスごとに分割できるが、Intent の完了境界は次のすべてを含む。

- Phase 1: Codex と Claude Code で共通 seam を確立する。
- Phase 2: Kimi Code と Kiro 系を接続または根拠付き後続 Issue へ接続する。
- Phase 3: Cursor と OpenCode を実測し、adapter 実装または根拠付き後続 Issue へ接続する。

非目標は、全 transport の統一、全ハーネスの一括移行、共通 contract の弱体化、通常 GitHub Actions での live 実行、モデル出力の完全一致、完了済み `swarm-driver-migration` Intent の再開である。
