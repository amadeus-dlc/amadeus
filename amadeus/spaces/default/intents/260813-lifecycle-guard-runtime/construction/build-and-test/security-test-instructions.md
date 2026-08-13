# Security Test Instructions — 260813-lifecycle-guard-runtime

## 判定: 専用の security NFR は不存在、認可面は既存 Mandated 検査で被覆

requirements.md に SAST/DAST・認証・injection 等の合否数値目標を宣言する security NFR は存在しない(devsecops 観点の実測)。専用の security テスト新設は行わない — 根拠なき体裁テストは検証劇場(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

ただし本変更は**認可に関わる**(ライフサイクル遷移の可否判定)ため、project.md Mandated「認可に関わる変更を directive contract、state transition、audit invariant、race、harness drift のテストで検証」が適用され、以下で充足する(`code-generation-plan.md` Steps 7-9、`code-summary.md` テスト一覧):

- state transition / 認可: 対照マトリクス 30 tests(deny が状態を書かないこと、off-switch の NOT_APPLICABLE 化)
- 迂回不能(認可バイパス防止): census 8 tests + 落ちる実証(バックドア注入 → 赤 → revert 残渣 0)
- 文言・復旧可能性の回帰: regression 6 tests(secrets/credential のハードコードなし — 変更 diff に環境変数・鍵の追加なし)
- audit invariant: audit disposition(error-logged / none)の分岐テスト、GUARD_EXEMPTED の監査行

## この判定を覆す条件

- security NFR(数値目標付き)が requirements に追加された場合、または外部入力面(ネットワーク・untrusted 入力のパース)が Runtime に追加された場合。
