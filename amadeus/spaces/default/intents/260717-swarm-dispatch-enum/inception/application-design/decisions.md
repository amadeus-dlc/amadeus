# Decisions(ADR)— swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## ADR-1: DriverName を三値へ置換し `ultracode` を撤去する

- Context: FR-4(語彙の一対一)。現行 `DriverName = "subagent" | "ultracode"`(amadeus-swarm.ts:88)
- Decision: `"subagent" | "claude-ultra" | "codex-ultra"` へ置換。旧語彙は type・CLI 検証・SKILL・docs から全撤去(repo 全域 grep で残存ゼロを受け入れ基準に — FR-4)
- Consequences: 監査・env・型の同値検査が写像層なしで成立。breaking(旧 `--degraded-from ultracode` は不正値化)— 互換シムは Forbidden により追加しない
- Alternatives Rejected: (a) `ultracode`→`claude-ultra` の別名写像層 — C-06 が写像層を明示禁止 (b) 旧値併存 — 旧値 `1` 同様の silent 予測不能性を再生産
- Security/Compliance: 影響なし(秘密・PII 非関与)。Reversibility: 高(型と grep で全面追跡可能)

## ADR-2: 機械検証境界は `amadeus-swarm.ts resolve` サブコマンド+exported 純関数(Q1 裁定 A)

- Context: FR-6/C-16。E-SDE-AD(2026-07-18T00:05:37Z 開票、A 採用 3/3 全 GoA 1・留保必須票 0 件)
- Decision: main の 3 サブコマンド switch への第4 case として `resolve --harness <name>` を加算。決定ロジックは exported 純関数 `resolveDriver(raw, harness): DriverResolution`(判別 union)
- Consequences: decision table の全セルを in-process テスト可能(spawn-blindspot 回避)+ SKILL からの実行時機械検証を両立。referee 3 サブコマンド意味論に非干渉(裁定根拠 (1))
- Alternatives Rejected: B=lib 純関数のみ(実行時 CLI 面なし — C-16「prose だけに依存せず」を実行時に満たさない)/ C=新規独立ツール(語彙一対一が2ファイル分散、S-06 凝集低下+reuse inventory の新設根拠なし)
- Security/Compliance: env 値はログへ raw のまま出すが token 類ではない(C-24 非該当)。Reversibility: 高(1 case+1 関数の加算)

## ADR-3: `SWARM_DEGRADED` の Fallback driver ハードコード(:291)を維持する

- Context: FR-3。降格先は全ケースで native floor(`subagent`)— FR-1 表に degrade 先の分岐が存在しない
- Decision: `"subagent"` 固定を維持し、Requested driver のみ三値化する
- Consequences: emit 面の変更が最小(surgical)。将来 degrade 先が複数化した場合のみパラメータ化する
- Alternatives Rejected: (a) fallback パラメータ化 — 現要件に消費者がなく、どのコードも消費しないフィールドの温床(検証劇場 Forbidden の予防) (b) Fallback driver フィールド自体の削除 — audit-format.md:202 の既存監査契約(表示名・フィールド集合)を破る breaking で、FR-3 の「降格先を監査から再現」の読み手(監査解析)を壊す
- Security/Compliance: 影響なし。Reversibility: 高

## ADR-4: Codex 通常 floor を native subagent 並列へ置換し headless `codex exec` を撤去する

- Context: FR-5(C-13/C-14 evidence 済み — `../requirements-analysis/c13-probe-evidence.md`)、scope Won't(fallback 残置禁止)
- Decision: codex SKILL(:57,171)・emit.ts(:81)・onboarding.fills.ts(:42,55)から headless floor 記述を置換。spawn/回収/retry の詳細契約(retry identity・wave)は FD で確定(C-17/C-18 の register 明記委任)
- Consequences: Claude と Codex の通常経路が同型化(intent 中心課題)。breaking: codex exec 経路の教材・テスト(t-exec-codex-journey)は契約変更に追随が必要 — 影響先は FD/units-generation で棚卸し
- Alternatives Rejected: (a) codex exec を fallback 併存 — scope Won't 明示禁止 (b) 段階的移行 — 移行シム Forbidden
- Security/Compliance: sandbox unrestricted 実測条件を requirements 前提に開示済み(誇張なし)。Reversibility: 中(SKILL/docs/tests の複数面に及ぶが生成経路で同期)

## ADR-5: HarnessName は dispatch consumer の新設 union とし、KNOWN_HARNESS_DIRS を再利用しない

- Context: reuse inventory の対称 grep(absence-claim-grep-verify 追補の適用)実測 — 既存 env→driver 解決機構は 0 件(`grep -rn "resolveDriver|driverFor|selectDriver"` = 0)。既存 harness 列挙は `KNOWN_HARNESS_DIRS`(amadeus-lib.ts:121 = [".claude",".kiro",".codex",".opencode",".cursor"])のみ
- Decision: `type HarnessName = "claude" | "codex" | "kiro" | "kiro-ide"` を C1 に新設
- Consequences: dispatch consumer 集合(FR-9 で opencode/cursor 除外、kiro-ide を含む)を型で表現。KNOWN_HARNESS_DIRS とは意味論が異なる(あちらは install ディレクトリ列挙で kiro-ide を含まず opencode/cursor を含む)ため flat 再利用は FR-1 表と不整合
- Alternatives Rejected: (a) KNOWN_HARNESS_DIRS の再利用 — 集合が一致せず(:116 コメントも「source of truth ではない」と明記)、写像層が必要になり C-06 に反する (b) KNOWN_HARNESS_DIRS からのサブセット型派生(`Extract<...>` 等)— dirs はドット付きディレクトリ名(".claude" 等)で dispatch consumer 名("claude"/"kiro-ide")と字面も要素も一致せず、派生には結局手書き写像が要る(派生の見かけの再利用が実は写像層)
- Security/Compliance: 影響なし。Reversibility: 高

## 規模の正当化(数値・reuse inventory)

| 変更セット | 概算行数レンジ(見積り) | 再利用 |
|---|---|---|
| C1 resolve+型置換 | 60-110(純関数 25-40+CLI case 15-25+型/検証 20-45) | DRIVER_VALUES 検証パターン(:402-407)、既存 switch 構造(:747-788) |
| C2 emit 追随 | 5-15 | emitSwarmDegraded 既存(:285-296) |
| C3〜C5 SKILL/onboarding prose | 40-90(4 harness 合算) | 既存 invoke-swarm 節の置換 |
| C6 docs(.md/.ja.md 対) | 40-80 | 既存 driver seam 表の置換 |
| C7 tests | 150-280 | t134/t135/t181/t28 既存基盤 |
| C8 dist/self-install | 生成(手書き 0) | package.ts / promote:self |

新規機構は C1 の resolve のみで、既存で代替できない根拠は ADR-2/ADR-5 の対称 grep 実測(0 件)。adapter・外部契約の先行着地なし(実装+配線+テスト+docs を同一 intent で揃える — C-09)。
