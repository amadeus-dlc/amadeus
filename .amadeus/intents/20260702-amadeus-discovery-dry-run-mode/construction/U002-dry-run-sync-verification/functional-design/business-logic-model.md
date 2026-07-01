# Business Logic Model

## 目的

`dry-run` 契約を source skill、昇格先成果物、text contract、validator で検証できるようにする。

## 対象 Unit

U002 dry-run-sync-verification。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | source skill の `dry-run` 契約を検出対象として整理する。 | `skills/amadeus-discovery/SKILL.md` | text contract expectation | R005, UC003 |
| BL002 | text contract を先に更新し、未実装の期待が失敗することを確認する。 | text contract expectation | failing check | R005, UC003 |
| BL003 | source skill を昇格先成果物へ反映する。 | source skill、promote-skill | promoted skill | R005, UC003 |
| BL004 | text contract、validator、必要な標準検証を実行する。 | source skill、promoted skill、Intent 成果物 | verification evidence | R005, UC003 |
| BL005 | 検証結果を test-results と追跡へ渡す。 | verification evidence | acceptance evidence | R005, UC003 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| source skill | `skills/amadeus-discovery/SKILL.md`。 | R005 |
| promoted skill | `.agents/skills/amadeus-discovery/SKILL.md`。 | R005 |
| text contract | `dev-scripts/evals/amadeus-templates/check.ts`。 | R005 |
| validator | 対象 Intent の成果物構造を確認する。 | R005 |
| 標準検証 | 型、lint、contract、eval、diff を確認する。 | R005 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| failing check | text contract 更新後に期待が未充足であること。 | 実装実行 |
| promoted skill | source skill から同期された昇格先成果物。 | host environment |
| verification evidence | 実行した検証コマンドと結果。 | test-results、traceability |
| acceptance evidence | 要求状態の証拠。 | acceptance.md |

## 未確認事項

- text contract だけで読み取り専用性を十分に検出できない場合、追加検証を後続 Issue 候補にするかは検証時に判断する。
