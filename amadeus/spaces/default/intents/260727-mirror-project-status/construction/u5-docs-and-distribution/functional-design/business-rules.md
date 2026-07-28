# Business Rules — u5-docs-and-distribution

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

BR は requirements の U5 担当 FR(unit-of-work の割付: FR-10b, FR-12 — 受入条件 15, 16, 17)から導出。docs の記述内容は services(認証・プロセス境界)と components の UI/UX 4接点、契約台帳は component-methods の C8 を正とする。story-map ジャーニー5(自走可能な配布)の成立条件。

## ルール一覧

| ID | ルール | 導出元 |
|----|--------|--------|
| BR-U5-1 | docs 追記は既存 mirror docs 4文書体系(guide/22 + reference/20 の en/ja 対訳ペア)へ行い、en/ja を同一変更で対訳同期する。新文書を増やさない | FR-10b(受入条件15)+docs-language-ownership |
| BR-U5-2 | 閉じた台帳(MIRROR_TOOL_FILES / t285 件数 / docs TOPICS / MIRROR_USER_CONTRACT)は文書・モジュール変更と**同一変更**で同期する — 別コミットへ分離しない | FR-12b |
| BR-U5-3 | dist 再生成は7ハーネス全面(claude, codex, cursor, opencode, kimi, kiro, kiro-ide)+セルフインストールツリーを対象とし、dist:check / promote:self:check の green を機械確認する | FR-12b(受入条件17)+cid:build-and-test:bt-dist-regen-seven-harnesses |
| BR-U5-4 | ADR-4(新設モジュールゼロ)により MIRROR_TOOL_FILES(projections.ts:22)と t285 件数は不変が期待値 — 変化を検出したら設計逸脱として停止し conductor 報告(無申告で台帳を増やさない) | components(9モジュール拡張・新設なし)+implementation-deviation-election |
| BR-U5-5 | MIRROR_USER_CONTRACT の scopeExclusions(presentation.ts:127 = pull-request/release/deploy/daemon/polling)は不変を維持し、t291 parity テストを Project 同期追記後も green に保つ | FR-10a(negative assert 面)+component-methods C8 |
| BR-U5-6 | 検収はテストの**完備確認**であり後追い作成ではない — 欠落発見時は当該 Unit の欠落として可視化する(U5 で代作しない) | FR-12a(unit-of-work の分割不変条件) |
| BR-U5-7 | バージョン・バッジ・リリースノートに一切触れない — リリース面は release.yml の workflow_dispatch 境界 | project.md Mandated(リリース一本化) |
| BR-U5-8 | 検収の数値(テスト件数・exit code・coverage)は集計コマンドの実出力からのみ転記する — 見込み・記憶で書かない | FR-12c+numbers-from-command-output-only |

## テスト規約(U5 分)

- 受入条件15: 4文書の認証節実在を docs contract(t291 parity)で機械固定。
- 受入条件16: `bash tests/run-tests.sh --ci` 全体 green+coverage ゲート(push 前 local lcov で diff 未カバー 0 の実測 — local-lcov-pre-push)。
- 受入条件17: dist:check / promote:self:check の exit code 0。
- FR-12c: 新設ガードの「落ちる実証」は注入 → 赤実測 → revert を不可分1セットで実施(falling-proof-injection-one-set)。
