# Intent Statement — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness` / 出典: [Issue #626](https://github.com/amadeus-dlc/amadeus/issues/626)(enhancement / P2)

## Problem Statement

Amadeus は harness-neutral な core(`packages/framework/core/`)を Claude Code / Kiro CLI / Kiro IDE / Codex CLI の4ハーネスへ投影する構造を持つが、opencode と Cursor には対応していない。roadmap の North Star の一部である cross-harness reusability が、この2ハーネスの利用チームには届いていない。opencode / Cursor を主ハーネスとする開発チームは AI-DLC workflow を自分たちの環境で実行できない。

## Target Customer

opencode または Cursor を主ハーネスとして使う開発チーム(組織内・外部を問わない)。彼らのペインは「Amadeus の AI-DLC methodology(phase / stage / scope / agent / sensor / protocol / tools)を自分のハーネスから起動・実行できない」こと。副次的受益者として、ハーネス追加が「manifest 1行+薄い surface」で済むことを実証したい Amadeus フレームワーク保守チーム。

## Success Metrics

Issue #626 の受け入れ条件を成功指標として採用する:

1. opencode / Cursor それぞれについて、実行モデルと制約が文書化されている
2. `harness/opencode/` と `harness/cursor/` の追加方針が既存 harness 構造に沿っている
3. `scripts/package.ts` で `dist/opencode/` / `dist/cursor/` を生成できる、または生成に必要な未解決事項が明確になっている
4. 既存 harness(Claude / Kiro / Codex)に回帰がない
5. `core/` の harness-neutrality を壊していない
6. 最小 smoke test または packaging drift check が追加されている
7. README / harness guide に opencode / Cursor の対応状況と制限が記載されている

初期到達ライン(walking skeleton 相当): 両ハーネスで `--doctor` / `--version` / basic workflow start が動くこと。

## Initiative Trigger

戦略的機会。roadmap の North Star(cross-harness reusability)を前進させる追加 harness port としてユーザーが起票(enhancement / P2、Issue #626)。市場圧力・技術的負債・規制対応ではない。関連 Issue: #625。

## Initial Scope Signal

スコープは `amadeus`(Self-hosted Amadeus framework development without infrastructure operations、18/32 stages、Standard depth、Comprehensive test strategy)。project.md の既定スコープノルム(cid:scope-definition:default-scope-amadeus)および leader 割当指示(2026-07-15 15:54Z)による。

明示的な非目標(Issue #626「非目標」verbatim):

- 初期対応で全 stage / swarm / reviewer loop の完全互換を求めない
- `core/` に opencode / Cursor 固有の分岐を直書きしない
- opencode / Cursor の機能差を隠して、既存 harness と完全同一 UX に見せかけない
- TAKT executor 互換をこの issue で実装しない
