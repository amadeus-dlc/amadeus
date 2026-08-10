# Code Summary — attribution-domain-contracts

## 変更ファイル

- `packages/framework/core/tools/amadeus-stage-attribution-domain.ts` — 682行追加。closed vocabulary、brand、readonly public shape、smart constructor、typed error/result、rejection precedenceを実装。
- `tests/unit/t486-stage-attribution-domain.test.ts` — 442行追加。U-01専用のfocused contract testを実装。

Commit: `4fa2664784bd5a7b95826a74849dd7cd2f6e7a80` (`feat(stage-stats): add attribution domain contracts`)

## 主要な実装判断

- runtime vocabulary は canonical readonly tuple から union を導出し、family/category を同じ順序の1対1 mappingに固定した。
- expected failure は `AttributionResult` の `err` とし、空 finding だけを programmer fault の built-in `TypeError` とした。
- identity は用途別 brand とし、constructor で空文字・edge whitespace・ASCII control を拒否した。
- accepted lifecycle、attribution window、candidate contribution/disposition、population accounting は readonly constructor を通し、存在しない window reference、空 fragment、identity collision、caller-owned array aliasを拒否した。
- U-01 は filesystem、process、journal、renderer、U-02〜U-04を import しない leaf module とした。

## 検証結果

- `bun test tests/unit/t486-stage-attribution-domain.test.ts`: 14 pass / 0 fail、246 assertions。
- `bun run typecheck`: exit 0。
- `bun run lint`: exit 0。既存 warning 454件、所有2ファイルの診断0件。
- swarm referee check: `converged=true`、`tampered=false`。

## 計画との差分

application code と test の内容差分はない。swarm worker が code-generation record artifact を持たない source-only worktree で実装したため、本 plan/summary は verified commit と実行証跡から conductor が完了時に再構成した。以後の Unit では dispatch 前に同 artifact を作成し、worker prompt と coverage ledger の両方へ渡す。

## 残課題

U-01内の残課題はない。U-02は本moduleのcandidate vocabulary/identity/lifecycle contract、U-03はinterval/window/accounting contract、U-04はCLI constructor/error contractを consumer として統合する。
