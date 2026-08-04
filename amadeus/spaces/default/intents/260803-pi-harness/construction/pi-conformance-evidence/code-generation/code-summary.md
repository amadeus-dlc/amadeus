# コード生成サマリー — pi-conformance-evidence

## 変更内容

- M1〜M10の正準trace、formal evidence JSON Schema、validator、candidate conformance E2Eを追加した。
- `scripts/pi-live-rpc.ts`に明示的opt-inのlive RPC journeyを追加した。
- 手動TUI dogfood checklistを追加し、human gateの正式証拠をRPC入力から分離した。
- RPC経路では`HUMAN_TURN=0`、`GATE_APPROVED=0`を要求し、TUI経路だけが各1件以上を要求する。
- Pi driver、guardian、extensionのNSD001 9件を修正し、`dist/pi`を正規生成した。
- doctor変更を含む全ハーネス配布物を正規generatorで同期した。

## 実装判断

- Live providerの`opt-in-disabled`はtyped skipとして保持し、formal greenへ昇格させない。
- 正式greenはPi 0.83.0以上、full commit、credentialを含まないprovider ID、macOS/Linux証跡、native Windows negative、M1〜M10と全assertionの完備を同時に要求する。
- 実credential、live evidence、workerへ複製されたintent runtimeはcommit対象外とする。

## テスト結果

- referee: converged、tamperなし。
- Unit worktree: 正準17ファイル205件成功、0件失敗。
- source main統合回帰: 23ファイル154件成功、0件失敗。
- `bun run typecheck`: 成功。
- 全8 harnessの`package.ts --check`: 成功。
- no-silent-drop: `NO_SILENT_DROP_OK`、finding 0。
- Live provider: `opt-in-disabled`によるtyped skip。formal greenへの昇格なし。

## 統合結果

- Unit commit: `76615819e709a1a73dee2e44d6d5ca585ecf0f45`
- Merge commit: `66fcb29cf6776d547f7c40efb5c93c3a6fb70b13`
- 全ハーネス再生成commit: `6043c3429`
- Bolt専用worktreeとbranchは統合後に削除した。元のintent記録は保持している。

## 計画との差分

- 実providerを使うlive RPCとmacOS/Linuxの手動TUI証跡は、この実行ではopt-inされていないため生成していない。skipを正式greenとして扱わない契約と検査は実装済みである。
