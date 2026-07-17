# Code Summary — fix-1015-scope-change-checkbox

- PR: https://github.com/amadeus-dlc/amadeus/pull/1035(bolt/fix-1015-scope-change-checkbox、コミット 69f4e4cfa、Refs #1015)
- 逸脱: なし(FR-3/4/5/6 準拠。FR-4b の「最小 or 共有定数化」は pre-approved 分岐で共有定数化を選択)

## 変更

- 正本 `amadeus-lib.ts`: 共有定数 `STAGE_PROGRESS_HEADER_COMMENT` 新設(CHECKBOX 定義群直下 — 6状態表記の canonical 1定義)
- 正本 `amadeus-utility.ts`: marker 三項 → `CHECKBOX_MAP[existing.state]` / default `CHECKBOX_MAP.pending`、:3238 書き戻しと :2748 intent-birth テンプレの両方を共有定数消費へ、`handleScopeChange` export(テストシーム)
- 生成物: dist 4ツリー×2ファイル+self-install ×4 同期
- テスト: t-scope-change-checkbox-preserve(integration、dist 経由 in-process 駆動)。coverage registry 追記(export 定数1件は兄弟データ定数と同扱いの UNCOVERED 登録)

## 落ちる実証(実測記録)

export のみ適用・旧ロジック dist に対し先行実行 → `[?]`/`[R]` が `[ ]` へ崩落+ヘッダ4状態で **2 pass 2 fail(RED)**。修正+再生成後 **4/4 GREEN**。
副次検知: 初回 RED 実行で fixture が rebuild 正規表現に不一致(rebuild 自体 no-op)の**偽テスト**であることを発見し、実 born state と同形へ是正(検証の検証 — 落ちる実証プロセスが偽テストを捕捉した好例)。

## 検証(全 exit 0)

package.ts / promote:self / dist:check / promote:self:check / typecheck / lint / coverage-registry --check、関連テスト 116 pass / 0 fail。push 前 lcov: marker DA=59・header DA=82・lib 定数 DA=44/185、変更領域 DA:0 なし。

## 非自変更の CI 赤(切り分け済み)

t-team-up-codex-resume(herdr session 環境残留 — diff 非交差・lifecycle 不介入)/ t224(並列負荷の wall-clock drift、単独 58 pass — fanout-load-settle)。coverage-project-gate 等のログ行は fixture 出力で当該テストは PASS。

## E-CS2 L1/L2 失効棚卸しへの含意

本 PR(#1015 修正)着地で cid:scope-definition:scope-change-checkbox-recovery(L1)が、PR #1037(#1013 修正)着地で cid:practices-discovery:promote-no-prose-in-rule-sections(L2)が、それぞれ失効棚卸し対象になる(AC-6e — leader へ報告済み)。
