上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

# Code Summary — kimi-harness-docs

unit-of-work.md の U7 と requirements.md の FR-8 の実装記録(code-generation-plan.md の全5ステップ完了)。B1-B6 の code-summary を唯一の実測源として執筆し、snippet 正本は参照どまり(BR-2/ADR-4)とした。

## 作成・変更ファイル

| ファイル | 内容 |
|---|---|
| `docs/guide/harnesses/kimi-code.md` | 新設(en)。codex-cli.md / cursor.md と同構成: prerequisites(kimi ≥ 0.28.1 実測フロア・bun・CLI セットアップ) / install(setup CLI `--harness kimi`) / hook wiring(ユーザーレベル config・managed block マージ・BR-I11 非対話 abort・手動フォールバック・再シリアライズ対応の二重識別・cwd・advisory 性) / doctor(4チェック + 残留/重複の扱い・未インストール時の `kimi CLI on PATH` fail) / use / what's different(Claude 最近傍・SessionEnd ネイティブ・SessionStart 注入不存在・Stop=exit2+stderr・`.kimi-code/{skills,agents,scopes}/` ディスカバリ・PostCompact 非配線・swarm subagent floor のみ) / regenerating + live journeys(`AMADEUS_KIMI_PRINT_LIVE`/`AMADEUS_KIMI_BIN`/`AMADEUS_KIMI_MODEL`・実機 `kimi login`・symlink 供給と write-through 受容・最小 tmp-config 形状) |
| `docs/guide/harnesses/kimi-code.ja.md` | 新設(ja 対訳・同内容)。コマンド・パス・識別子は原文のまま(BR-4) |
| `docs/guide/harnesses/README.md` | 表に Kimi Code 行を追加(invoke `/skill:amadeus`、≥ 0.28.1) |
| `docs/guide/harnesses/README.ja.md` | 同上(ja) |

B1 のオープン事項「AGENTS.md から `docs/guide/harnesses/kimi-code.md` への参照は U7 で解決する意図的ポインタ」は本ファイル新設で解消。

## 検証

- 相対リンク実在確認: 新設 2 ファイルの全 14 リンク(en 7・ja 7)+ README 2 ファイルのリンクをシェルで展開し存在確認 → BROKEN 0 件
- パス主張の実在確認: `dist/kimi/.kimi-code/hooks/amadeus-hooks.snippet.toml`・同 adapter・`tests/e2e/t-print-kimi-{status,doctor}.serial.test.ts`・`tests/harness/kimi-print-drive.ts`・`packages/framework/{core,harness/kimi}` → 全て OK
- 記述の実測突合(BR-5): フロア値 0.28.1 は `amadeus-utility.ts` の `MIN_KIMI = [0,28,1]` と一致。doctor の行ラベル・fix 文・probe の advisory 文言・managed block 検出分岐は同ファイル実装と目視突合。マージ手順(report → confirm → バックアップ copy → atomic 書込み・非対話 exit 1・`--yes` 非同意)は `packages/setup/src/cli.ts` / `modules/kimi-hooks.ts` の実装と突合。手動手順のマーカー文言は `manualProcedure()` の出力と一致
- snippet 転記なし: ヘッダコメントとテーブル種別(`[[hooks]]`/`[[permission.rules]]`)の構造言及のみで、エントリ本文は docs に転記していない(BR-2)

## 実測源にあったが記載を見送った事実(未検証/未解決のため。BR-5)

- 2 バイナリ観察(PATH の `kimi --version` が 0.28.1・doctor 検出が 0.29.0。B5/B6 申し送り「記載候補」): 解決経路が未解明の観察記録であり、ユーザー向け手順に混ぜると誤導になりうるため除外
- 新規 `.kimi-code` ツリーの scope-grid が合成スコープ(amadeus-feature 等)を持たない件(B5 申し送り): self repo dogfood 文脈の運用メモで、一般ユーザー向けの検証済み手順としては未確認のため除外
- state の Scope 表示が `feature` と正規化される観察(B5): 表示正規化との判断だが未確定のため除外

## 逸脱

なし(計画の全5ステップどおり。README.ja.md への行追加は en/ja 対構造の自明な対応として Step 4 に含む)

## オープン事項

- 上記の見送り 3 件は、実測が固まり次第 docs へ反映する候補(次 intent または build-and-test 以降の dogfood で再観測されたら追記)
