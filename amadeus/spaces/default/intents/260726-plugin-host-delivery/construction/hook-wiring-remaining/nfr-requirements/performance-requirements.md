# 性能要件 — U4 hook-wiring-remaining

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 性能モデルと NFR-2 の直接対象

U4 のフック配線は、セッションライフサイクル(SessionStart 相当)から compose 入口を自動起動する経路である(`requirements.md` FR-3b)。これは `technology-stack.md` 実測の各ハーネスフック環境(Claude Code の hook 起動、Codex `.codex/hooks.json`、Kimi `~/.kimi-code/config.toml` の managed block 等)に乗るため、`requirements.md` NFR-2「起動レイテンシ非退行」の**直接対象**となる。`business-rules.md` BR-U4-6(起動レイテンシ)が定めるとおり、各面の配線は no-op 高速路(`--if-stale`)を必ず通す。

## PERF-U4-1: no-op 高速路の非退行(BR-U4-6)

`business-logic-model.md` フロー 1 の HookInvocation は、composition record が最新のとき合成適用処理へ到達せず早期 return する(`requirements.md` FR-3c-no-op)。これによりセッション起動レイテンシへ体感退行を加えない。

- 合否: composition record が最新の状態での自動 compose 経路が合成適用処理へ到達せず早期 return する(到達カウンタまたは書込不発生の assert — `requirements.md` FR-3c-no-op 合否)
- 合否: 全対応面が build-and-test の起動時間実測に含まれる(`business-rules.md` BR-U4-6「全面で NFR-2 の実測対象」)。予算数値は build-and-test で実測固定(未実測の推定を受け入れ基準にしない — `requirements.md` NFR-2 明記)

## PERF-U4-2: 冪等再 compose のコスト

`requirements.md` FR-3c-冪等のとおり、再 compose は冪等で fragment を重複挿入しない。stale でない限り自動 compose は no-op 高速路を通るため、通常のセッション起動では合成の実処理コストが発生しない。

- 合否: 同一プラグイン集合での 2 回目の自動 compose が 1 回目と byte-identical で、追加の合成処理時間が測定ノイズ内(no-op 経路を通ることの帰結 — PERF-U4-1 と共有)

## 非該当カテゴリ(N/A + 根拠)

- スループット / 同時リクエスト: N/A。フックはセッション起動ごとに 1 回起動されるビルド/起動時トリガーで、常駐 service ではない(technology-stack.md「HTTP・DB はない」実測)。決定的な `--if-stale` 判定と単発起動へ置換される
- キャッシュ層: N/A。composition record の鮮度判定自体が no-op 高速路の役割を果たし、別途のキャッシュ機構を要しない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:53:20Z
- **Iteration:** 1
- **Scope decision:** none

BR-U4-4 の 2 軸閉包を含む全引用が逐語一致。未実測数値の基準混入なし。findings 0。

### Findings

- None
