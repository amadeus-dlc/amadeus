# Decisions(ADR)— opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`。上流: `../requirements-analysis/requirements.md`、codekb の architecture.md / component-inventory.md、`../practices-discovery/team-practices.md`。各 ADR は Context / Decision / Consequences / Alternatives Rejected を持つ(inception phase rules)。

## ADR-1: opencode の surface 写像は native ディレクトリ(agents/commands/skills)+AGENTS.md とする

- **Context**: opencode は `.opencode/{agents,commands,skills,plugins}` + `opencode.json`(JSON/JSONC)+ AGENTS.md を受け取る(feasibility 外部実測 2026-07-16)。Amadeus core は skills/commands 相当の資産を持つ
- **Decision**: core 資産は coreDirs で `.opencode/` へ写像し、skills は emit で `.opencode/skills/`(native)へ、起動導線は `.opencode/commands/amadeus.md`、指針は AGENTS.md とする
- **Consequences**: opencode ユーザーは native な発見経路(commands/skills 一覧)で Amadeus に到達できる。emit の合成量は codex 前例(368行)と同規模
- **Alternatives Rejected**: (a) plugins のみで統合 — 起動導線が JS プラグイン実装に依存し初期到達ラインに過大、外部 API 変動リスクも高い。(b) opencode.json の command 定義のみ — skills(手順書)を捨てることになり既存 harness との情報等価性を失う
- **Reversibility**: 高(写像先の変更は emit の再構成のみ — dist は再生成可能な派生物)
- **セキュリティ/コンプライアンス影響**: opencode の権限既定は全許可(実測)— `opencode.json.example` に permission 絞り込み例を同梱し、README に権限モデル差を明記(R-4 緩和)。認証情報の取り扱い変更なし

## ADR-2: Cursor のルール層は「.mdc エントリ1枚 + amadeus-rules/ 実体」の2段構成とする

- **Context**: Cursor の native rules は `.cursor/rules/*.mdc`(frontmatter 付き)で、plain .md は無視されうる(外部実測)。Amadeus のルール層は5層チェーンの plain markdown(@import 解決は engine 側)
- **Decision**: 実体は `.cursor/amadeus-rules/`(rulesRename、codex D-10 と同判断)に置き、`.cursor/rules/amadeus.mdc`(alwaysApply: true)1枚をエントリとして emit する
- **Consequences**: ルール本文の二重管理ゼロ(正本は memory 層、dist へは既存コピー経路)。Cursor の rules UI にはエントリ1枚のみが見える(native 体験は薄いが正確)
- **Alternatives Rejected**: (a) 全ルールを .mdc へ形式変換 — 変換層の維持負債と drift リスク(dist:check の byte 照合と相性が悪い)。(b) AGENTS.md のみ — alwaysApply の常時適用保証がなくルール層の適用が不確実
- **Reversibility**: 高(.mdc エントリの差し替え/全変換への移行は emit 局所変更で可逆)
- **セキュリティ/コンプライアンス影響**: なし(配布物の再配置のみ)

## ADR-3: hooks は Cursor のみ初期対応(hooks.json + stdin アダプタ)、opencode は将来 Issue

- **Context**: AC-3d の外部実測(2026-07-16、components.md 冒頭に記録)で Cursor hooks の実在を確認 — R-1 の前提(不在)は反証された。イベント集合は Claude とほぼ1:1。opencode の hook 相当は plugins(JS)で、写像には実装・検証コストが別途かかる
- **Decision**: Cursor は `hooks.json.example` + `hooks/amadeus-cursor-adapter.ts`(stdin スキーマ差の薄いアダプタ、codex shim の既習様式)で sessionStart/beforeSubmitPrompt/postToolUse/stop/sessionEnd を写像する。opencode の hooks(plugins)統合は本 intent の初期到達ラインに不要のため**将来 Issue として起票**し、機能表に「未対応」を明記する
- **Consequences**: Cursor(IDE)は Claude に近い運用品質。cloud/CLI の非対応イベント(sessionStart/sessionEnd)と opencode の hook 不在は services.md の機能単位表で明示(AC-3c 留保 ii 充足)
- **Alternatives Rejected**: (a) 両ハーネスとも hooks 統合を初期対応 — opencode plugins の実装コストが walking-skeleton 規律(最小スライス)に反する。(b) 両ハーネスとも hooks なし — Cursor には実在する seam を使わない理由がなく、実測(hook 実在)と矛盾する消極設計
- **Reversibility**: 中(hooks.json.example とアダプタの追加/撤去は独立ファイルで可逆。ただし機能表の公開後に降格する場合は docs 更新を伴う)
- **セキュリティ/コンプライアンス影響**: hook は fail-open(Cursor 契約: その他 exit = 続行)— ゲート強制・監査整合はツール所有 emit(hook 非依存)が正であり、hook はあくまで補助。fail-open が安全性を毀損しない構造(検証劇場にならない)を component-methods.md で明文化済み

## ADR-4: emit のエラー方針は既習の fail-fast(throw 伝播)を踏襲する

- **Context**: AC-1b は引用既習様式の意味論適合照合を要求。実測: `package.ts:459-461` は emit を try/catch なしで呼び、throw はビルド全体を loud に失敗させる
- **Decision**: 新設 emit(C1/C2)も同一方針 — 合成入力不在・書き込み失敗は throw、フォールバック分岐なし。意図的相違はゼロ(照合結果: 一致)
- **Consequences**: 偽 green の構造的排除。dist:check との組み合わせで部分生成物が main に乗らない
- **Alternatives Rejected**: (a) emit 内 try/catch + 警告続行 — 検証劇場 Forbidden(結果を実行から導かない偽 green)に抵触。(b) EmitResult にエラーフィールド追加 — 呼び出し側(package.ts)の変更が必要になり core-neutrality(変更ゼロ)方針に反する
- **Reversibility**: 高(emit 内部方針 — 呼び出し契約は不変)
- **セキュリティ/コンプライアンス影響**: なし

## ADR-5: installer / promote:self / TAKT は触らない(選挙裁定の設計固定)

- **Context**: E-OC7 Q1=B(installer 別 Issue)/ Q2=A(promote:self 対象外)、Issue 非目標(TAKT)
- **Decision**: C1〜C5 のいずれも packages/setup・promote-self.ts に触れない。installer 用の別 Issue は AC-6a の留保条件(台帳 verbatim+再現実測)付きで code-generation 完了後に起票する
- **Consequences**: 本 intent の diff は harness/ + tests + docs に閉じる(AC-4d の grep 検証が単純になる)
- **Alternatives Rejected**: (a) installer 同時対応 — E-OC7 で全会一致否決(スコープ境界)。(b) promote:self 対象化 — 同(消費者なき二重管理)
- **Reversibility**: 高(別 Issue 側でいつでも再開可能 — 本 intent の成果物に不可逆な痕跡を残さない)
- **セキュリティ/コンプライアンス影響**: なし
