# Requirements — promote-self の kimi hooks managed block 配線欠陥の修正

上流入力 (consumes 全数): business-overview.md, architecture.md, code-structure.md (codekb)、requirements-analysis-questions.md (Q1-Q4 全て A で裁定済)

## Intent 分析

自己開発リポの昇格経路 `bun scripts/promote-self.ts --apply` が dist→ルートのツリー同期のみで、ユーザー級 `~/.kimi-code/config.toml` への kimi hooks managed block マージを行わない。その結果、dogfooding 昇格では hooks が未配線のままとなり、doctor が FAIL し、さらに doctor の修復アドバイスが配布ユーザ向け (bunx インストーラ再実行 / 手動コピー) で自己開発リポでは誤りという2重の欠陥。hooks 未配線は HUMAN_TURN 不 mint → human-presence ガードによるワークフロー停滞として実害が顕在化した (本 intent の RA ステージで実演)。

ゴール: **promote-self による昇格だけで hooks 配線まで追従完了すること** (「promote-self 的なもので昇格できないと意味ない」というユーザー裁定 2026-07-26)。

## 機能要件

### FR-1: promote-self --apply への managed block マージ追加 (Q1=A, Q2=A, Q4=A)

- FR-1a: `promoteSelfMain` の apply 経路に、kimi harness ペイロード (`dist/kimi/.kimi-code`) が managedDirs に存在する場合のみ発火する managed block マージステップを追加する。実行位置は dist→ルート同期の完了後 (cli.ts の verify 後配線と同型の順序)。
- FR-1b: マージ実装は `packages/setup/src/modules/kimi-hooks.ts` の `runHooksMerge` を再利用し、`KimiHooksPorts` に auto-confirm の TtyIO (`confirm: async () => true`) を注入する。バックアップ作成・pre-write TOML guard・冪等 noop は module の既存実装に委譲し、promote-self 側に重複実装を作らない。
- FR-1c: 承認ポリシーは暗黙承認 (promote-self の実行自体がリポ所有者の明示的昇格操作)。ただし module 既存の振る舞いどおり、変更内容 (diff) の表示とバックアップ作成は必須とする。
- FR-1d: マージ失敗 (content-validation / IoError) 時は promote-self 全体を非ゼロ終了とし、エラーメッセージは `renderHooksError` の文言を使う。
- FR-1e: snippet は promoted 後の `.kimi-code/hooks/amadeus-hooks.snippet.toml` ではなく正本 `packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml` から読む (repo ローカル実行のため正本が常に利用可能)。
- FR-1f: `--check` モードはユーザー級 config を一切検査しない (hermetic 維持。CI/他マシンで config 不在時に FAIL する非決定性を持ち込まない)。

### FR-2: doctor 修復アドバイスの分岐 (Q3=A)

- FR-2a: `packages/framework/core/tools/amadeus-utility.ts` の `KIMI_MANAGED_BLOCK_FIX` (現 :855-856) を、ワークスペースが自己開発リポ (`scripts/promote-self.ts` が存在する) かどうかで分岐させる。自己開発リポでは `bun scripts/promote-self.ts --apply` への誘導を提示し、配布ユーザには現行の bunx install / 手動配線の文言を維持する。
- FR-2b: 分岐の判定は doctor 実行コンテキストのワークスペースルート基準とし、KimiHome 解決規則 (resolveDoctorContext) と同じく env 差し替え可能な純粋な判定関数として実装する。

### FR-3: テスト

- FR-3a: promote-self のマージステップを検証するテストを追加する。t209 の様式 (fixture 最小 dist ツリー + `promoteSelfMain(["--apply","--no-build"], fixtureRoot)` in-process 駆動) に倣い、`KIMI_CODE_HOME` を mkdtemp home に向けて、(i) config 不在 → ブロック追加、(ii) 既存ブロック同一 → noop、(iii) 既存ブロック旧版 → replace の3経路を検証する。
- FR-3b: doctor 文言分岐を検証するテストを追加/更新する。t-kimi-doctor-arm の様式 (mkdtemp KimiHome + `KIMI_CODE_HOME` save/restore) に倣い、自己開発リポ疑似 fixture (scripts/promote-self.ts 有り) と配布疑似 fixture (無し) で FAIL メッセージが分岐することを検証する。文言をピンしている既存テスト (t-kimi-doctor-arm, t-print-kimi-doctor) の更新も本要件に含む。
- FR-3c: テストファイルは冒頭に `// covers:` / `// size:` ヘッダ規約に従う。

## 非機能要件

- NFR-1: promote-self --apply の既存振る舞い (dist 同期・orphan 削除・composed scope 保護・active-space cursor 自己修復) を一切変更しない。マージステップは純粋な追加とする。
- NFR-2: ADR-6 (マーカー定数の意図的複製) を侵さない。promote-self は module 経由で定数を参照し、新たな複製を作らない。
- NFR-3: ユーザー級 config への書込は module 既存の原子書込 + バックアップ規約 (`config.toml.amadeus-backup-<ISO>`) に従う。
- NFR-4: 言語規約 — コードコメント・テストは英語、`amadeus/**/*.md` は日本語、ドキュメントは英語が既定 (日英ペアが既習の箇所はそれに倣う)。

## 制約

- C-1: NEVER ルール (project.md) — dist/ や self-install コピー (.kimi-code/tools/ 等) を独立した正本として編集しない。doctor 修正の正本は `packages/framework/core/tools/amadeus-utility.ts`、編集後は promote-self --apply で self-install ツリーへ反映する。
- C-2: scripts→packages 方向の import は `scripts/promote-self.ts:23` の先例どおり許容。逆方向 (packages→scripts) は作らない。
- C-3: `.kimi-code/scopes/amadeus-amadeus-bugfix.md:18` の scope ゲートどおり、build-and-test 境界で `promote:self:check` が green であること。

## 前提

- A-1: Kimi Code CLI はフックをセッション開始時にのみロードし、config.toml の変更は hot-reload されない (本セッションで実測)。マージ後の hooks 有効化は次セッションから、という挙動は製品仕様として受け入れる。
- A-2: マージは冪等であり、既に同一ブロックが存在する環境では noop で終わる (module 既存保証)。

## Out of scope

- promote-self --check へのユーザー級 config 検査の追加 (Q2=A により明示的に除外)。
- managed block 消失シナリオの犯人追跡と再現防止機構 (下記 Open questions OQ-1。別 intent 候補)。
- kimi harness への composed scope レジストリ同期の自動化 (下記 OQ-2。本 intent で手動修復済みだが、恒久機構は別途)。

## Open questions

- OQ-1: `~/.kimi-code/config.toml` は 2026-07-26 00:15Z に一度 managed block がマージされた後、同日中に block が消失していた (backup ファイルの存在と現行 config の内容から実測)。消失させた書き換え主体 (kimi CLI の再シリアライズ、アップデート、別ツール) は未特定。再現すれば本修正の効果を定期的に消しうるため、観察継続と別 intent での調査を提案する。
- OQ-2: PR #1522 で新設された `.kimi-code/` ツリーには composed scope 5件 (amadeus-feature / amadeus-bugfix / amadeus-refactor / amadeus / installer-distribution) の grid エントリと scopes/*.md が欠落しており、本 intent 起票時に手動修復した (未コミット)。新ハーネス追加時に既存ハーネスの composed scope を引き継ぐ機構 (または doctor の検査項目化) は別途検討課題。手動修復分のコミットを本 intent に含めるかはゲートで確認する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-26T13:15:20Z
- **Iteration:** 1
- **Scope decision:** none

必須7節の存在、Q1-Q4 裁定との整合、上流 codekb 3件参照、検証可能性、範囲逸脱なしの5観点すべて合格。非ブロッキング申し送り: FR-1b は interactive:true 相当も必要 (OC-1) — functional-design で吸収可能。

### Findings

- None
