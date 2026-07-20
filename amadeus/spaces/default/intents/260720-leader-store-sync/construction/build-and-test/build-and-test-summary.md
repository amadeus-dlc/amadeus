# Build and Test Summary — leader-sync-tool(U1)

上流入力: `code-generation-plan.md`、`code-summary.md`

## 検証インベントリ

- Build: TypeScript 2構成、Biome、coverage registry、6 harness dist parity。
- Unit: 12ケース。Integration: 23ケース。合算 35ケース / 124 assertions。
- Performance: 専用 SLO なし。corpus sweep と wall-clock 観測。
- Security: no-shell、credential 非参照、owned-only、fail-closed、auto-merge 不在。

## 現在の判定

- 実装焦点面は build-ready / test-ready。coverage は 593/593。
- 全 CI 初回は 393 files / 5561 assertions のうち 2 files / 5 assertions が失敗した。`t-team-up-codex-resume.test.ts` の 5秒 timeout は verbose 再走で 46/46 green となり、ambient 時間変動へ帰属した。
- 残る `t199-generated-prefix-contract.test.ts` 1件は、最新 main の upstream-sync 成果物9件が正当に引用する `aidlc-` を allowlist が拒む交差赤であり、scope 外の Issue #1313 に記録した。t245 は独立再実行で全 green。
- scope 外の交差赤に対する leader 境界判断、最終 sensor、独立 reviewer、§13、GitHub CI が未完のため deployment-ready / Completed とは判定しない。

## 制約

- `.codex/pr-review-1303.html` と `.codex/pr-review-1305.html` は既存ユーザー所有の未追跡ファイルで、実装 scope 外。削除・変更していない。
- AWS credential 不正による live SDK skip は runner が明示する既存契約であり、本 CLI の検証対象ではない。
