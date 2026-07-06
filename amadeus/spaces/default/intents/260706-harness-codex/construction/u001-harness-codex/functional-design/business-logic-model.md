# Business Logic Model — u001-harness-codex

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)。

## 処理パイプライン（B001 の実行順、FR 対応）

1. **FR-1 取得と照合**: 一時ディレクトリ（scratchpad）へ awslabs/aidlc-workflows を fresh clone し b67798c3 を checkout。dist/codex/.agents/skills/*/agents/openai.yaml を全列挙し、内容の同一性（A-1 = guard のみ）を全件検査。件数・一致/相違を記録。
2. **FR-2 写像表生成**: 上流 skill 名一覧へ skillNameMapping の prefix 規則（aidlc-<x> → amadeus-<x>、aidlc → amadeus）を機械適用し、当方 skills/ の実在ディレクトリと交差。結果を 3 区分（取り込み対象 = 両側実在 / 上流のみ = amadeus 対応なし / 当方のみ = 独自 skill）で provenance.md の表にする。
3. **FR-3 yaml 追加**: 取り込み対象の各 skill に skills/amadeus-<x>/agents/openai.yaml を作成。内容 = 上流実体 + rename 契約適用（guard 内容に名称が含まれない場合は同一）+ provenance コメント 4 行（questions Q2 = A）。
4. **FR-4 harness/codex 新設**: README.md（ハーネス契約、Phase 1 役割、Phase 2 正準化予定、言語再判定条件）と provenance.md（基準 commit、写像表、適応規則、再取り込み手順、FR-1 照合結果）。
5. **FR-6.5 検出器追従**: dev-scripts/evals/rename-leftovers/allowlist.json の `postRenameScan.scanRoots`（ネストキー。トップレベルではない）へ "harness" を 1 行追加。
6. **FR-5 promote 昇格**: 取り込み対象 skill を dev-scripts/promote-skill.ts --replace で昇格（引数は 1 skill ずつ = positional 1 件制約のため対象件数分ループ実行）。昇格前後の skill dir diff を確認。
7. **FR-6 検証**: 新設・追加ファイルを git add して追跡済みにしてから実行する（rename-leftovers の検査は git ls-files 走査のため、未追跡のままだと偽陽性 pass になる）。npm run test:all / validator / parity:check / test:it:promote-skill。FR-6.2（parity 非照合）と FR-6.3（言語方針の同期義務が発火しない）の確認を記録。

## データ変換

- skill 名: 上流 aidlc-<x> → amadeus-<x>（prefix 置換のみ。それ以外の変換をしない）。
- yaml 内容: 上流実体を正とし、rename 契約に該当する文字列（aidlc / /aidlc）が含まれる場合のみ置換。A-1 どおり guard のみなら無変換。
- 変換の全記録は provenance.md（NFR-1 の再取り込み手順を兼ねる）。

## エラーハンドリング

- clone 失敗 / commit 不在: 中断して再試行（成果物は生成しない）。
- 照合相違（A-1 反証）: 上流実体を正として取り込み、相違を provenance.md に記録（NFR-2）。
- 交差の空集合や予期しない skill 名形式: 実装を止めて記録し、gate 報告で人間判断を仰ぐ（推測で写像を作らない）。
