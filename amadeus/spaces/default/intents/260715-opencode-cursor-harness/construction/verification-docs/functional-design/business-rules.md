# Business Rules — U4 verification-docs

intent: `260715-opencode-cursor-harness` / Unit: U4
上流入力: requirements.md(FR-5/FR-6/FR-7)、application-design の components.md / component-methods.md(C4)/ services.md、unit-of-work.md / unit-of-work-story-map.md。

## ルール一覧(検証可能形)

| ID | ルール | 検証 |
| --- | --- | --- |
| R-U4-1 | smoke test は「落ちる実証」を経てから完成扱い(生成物1ファイル欠落で赤) | 実測記録(赤→緑の exit code 列)が code-summary に実在 |
| R-U4-2 | 機能単位表は U2/U3 の実測結果のみを転記(推測記載禁止 — ⚠ 行は実測で ✅ か「未対応」に確定) | 表の各行に実測出典(Unit の code-summary 参照)が紐づく(レビュー実測) |
| R-U4-3 | installer Issue は AC-6a 留保 i/ii を充足(台帳 verbatim+再現実測) | Issue 本文の grep 照合 |
| R-U4-4 | docs は英語・Issue は日本語(言語規約) | docs-language-ownership(レビュー観点) |
| R-U4-5 | 新テスト追加に伴う `tests/gen-coverage-registry.ts` の再生成と EXPECTED_NONE_TO_CLI の要否確認を必須ステップに含める(integration-registry-regen)。registry 等の共有台帳へ追記する場合は挿入位置分散 or union→regen 定型(shared-ledger-insert-collision) | registry 再生成後の `bash tests/run-tests.sh --ci` exit 0(FRESHNESS DIFF が赤くならないこと) |
| R-U4-6 | core・scripts・installer 変更ゼロ | AC-4d grep ヒット0 |

## 完了条件(Bolt 4)

全 CI 基準 exit 0 + smoke の落ちる実証記録 + README/docs 更新(参照実在)+ Issue 2本起票(クロスレビュー依頼済み)+ push 前 lcov + deslop。
