# Design Decisions(ADR)— 260719-mirror-productization

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## ADR-1: ツール移設は挙動不変の単純移設とする(既決の設計反映)

- **Context**: FR-1/G-2。scripts 版 373行は運用実証済み(#1222 等)
- **Decision**: `packages/framework/core/tools/amadeus-mirror.ts` へ無変更移設し、status のみ追加。scripts 版は同一 PR で削除
- **Consequences**: dist 6面へ自動投影(coreDirs)。t232 はパス参照のみ更新(fixture-propagation-grep で棚卸し)
- **Reversibility**: ロックイン寄り — 6ハーネス dist へ配布後の再移設は全面 regen+利用者側 self-install 更新を要する。ただし正本1箇所+機械投影のため「困難だが機械的」
- **Alternatives Rejected**: (a) 移設時のリファクタ同時実施 — 挙動不変の検証可能性を壊す(W-04)。(b) scripts 版を残す互換シム — 二重実装 Forbidden に抵触。(c) **contrib overlay 経由の配布**(architecture.md:123-131 の dist バイパスチャンネル)— overlay は「フレームワーク非中核の任意追加物」の家であり、phase 境界 ask(C4)が engine 本体から名指す標準運用面のツールを非中核チャンネルへ置くのは意味論不適合。全ハーネス既定配布(S-01)も overlay では保証されない。(d) **scripts 据え置き+SKILL からの参照** — SKILL は配布物だが scripts/ は非配布(coreDirs 対象外)のため、配布先環境で参照先が存在せず構造的に破綻(RE scan-notes (3):「scripts/ を指す runner の前例は無い」)。なお architecture.md が記録する前 intent 所見「決定的 TS ツール本体は scripts/*.ts が自然な家」は repo ローカル運用時代の所見であり、本 intent の目的(他プロジェクト・他ユーザーへ届ける配布物化 = G-2 ユーザー裁定)がその前提を更新する — 対立は既決 G-2 により解消済みであることをここに明文照合する(citation-semantics-check)
- **セキュリティ/コンプライアンス影響**: なし(gh 依存の扱いは ADR-7)

## ADR-2: status の exit code は 0/1/2 の3値(E-MPRRA3 裁定 A、3-0)

- **Context**: FR-2。機械消費(CI・スクリプト)を想定
- **Decision**: 0=乖離なし / 1=乖離あり / 2=前提エラー。判定は `StatusOutcome` 判別ユニオンから写像
- **Consequences**: CI での乖離検知が exit code だけで可能。既存 verb の exit 契約(fail=1/usage=2)とは verb 別契約として共存(status の 2 は「前提エラー」— usage 2 と同値だが verb 内で意味を固定)
- **Reversibility**: 変更容易 — exit 写像は status verb 内に閉じ、消費者が現れるまでは1ファイル修正で変更可(消費者出現後は契約変更として扱う)
- **Alternatives Rejected**: (a) 常に exit 0(B 案)— 機械消費不能。(b) クラス別 exit(C 案)— 消費側の分岐が複雑化、3クラス同時発生時の合成が非自明

## ADR-3: phase 境界発火は phase-check 対象3境界・close 導線は含めない(E-MPRRA1 裁定 A、2-1)

- **Context**: FR-5/U-04a。E-MPRRA1 留保の履行
- **Decision**: 発火は ideation/inception/construction 完了時(`PHASE_CHECK_REQUIRED_PHASES` と同集合を canonical 参照)。**close 導線は本 ask 経路に含めず**、既存経路 = close verb(close-after-landing 検証 :339-345)+intent 完了時の intent-completion-issue-sweep 運用に接続する([e4] 留保の design 明文化)。complete 境界(operation 完了)での ask は将来判断([e6] 非採用側視点: close は C-05 既決で自動 close リスクなし・追加 ask は workflow あたり1回で軽量 — を保存)
- **Consequences**: ask 発火は最大3回/workflow。close の人間関与は verb 経路で常に保証
- **Reversibility**: 変更容易 — 発火集合は canonical 参照1箇所の変更で拡縮可([e6] 保存視点の complete 境界追加も同様に軽量)
- **Alternatives Rejected**: (a) 4境界(B 案)— close 導線が ask に混入し C-05 の ask 原則と二重化。(b) construction のみ(C 案)— ideation park 時のミラー同期漏れ(本 intent 自身が該当した類型)を防げない

## ADR-4: 3層 config は JSON 3面(E-MPRAD2 裁定 A、3-0)

- **Context**: FR-4/U-03a。G-6(Global は amadeus/ 直下 git 共有)は既決、形式が未決だった
- **Decision**: JSON 3面 — Global: `amadeus/config.json` / Space: `amadeus/spaces/<space>/config.json` / Intent: `<record>/config.json`。パーサは amadeus-settings.ts の fail-closed 様式(unknownKeyError/typeMismatchError :43-47)を新モジュールで踏襲。合法キーは `auto-mirror`(boolean)のみ
- **Consequences**: 既習様式の再利用最大・新規依存ゼロ。gitignore 対象外(3面とも git 共有)
- **Reversibility**: 中間 — キーが auto-mirror 1つの間は形式変更容易。キー・消費箇所が増えるほどロックイン化(初キー限定 = C-06 が可逆性を担保)
- **Alternatives Rejected**: B=YAML 3面(新規パーサ依存が Bun-only Forbidden と緊張)/ C=md フィールド様式(設定ファイルとして非標準)。採用 A=JSON 3面(fail-closed 既習様式踏襲)/ B=YAML(新規パーサ依存が Bun-only と緊張)/ C=md フィールド様式(設定ファイルとして非標準)

## ADR-5: 実行主体は運用注記のみ・機械強制なし(E-MPRAD1 裁定 B、3-0 全票 GoA2)

- **Context**: FR 群/U-02。現行実装に主体検査なし(RE scan-notes (1))
- **Decision**: create/close は conductor(active intent の作業者)から実行する**運用注記**を置く。機械強制はしない(実装ゼロ)
- **留保転記(3件・verbatim)**: [e6] 運用注記の置き場は docs の mirror 節+SKILL 本文の2箇所に限定し、機械強制を装う文言(『拒否される』等)を使わないこと — 検証劇場の予防。 [e1] 注記の置き場は productized 配布面(SKILL/usage 出力)とし、team.md ノルムの複製でなく参照にする — 二重規定回避。 [e4] 運用注記には『機械強制なし』を明記し、注記を強制と誤読させないこと(検証劇場の逆面 — 強制のふりをしない)
- **留保の統合解釈**: 注記は SKILL 本文(両留保の共通面)+docs mirror 節(e6)+usage 出力(e1)に置き、いずれも「機械強制なし」を明記([e4])・強制を装う文言禁止([e6])・ノルム本文は複製せず参照([e1])
- **Consequences**: 実装コストゼロでソロ/チーム両モード成立。誤実行はfail-closed 検証(close の landing check 等)が既存防御
- **Reversibility**: 変更容易 — 注記のみで実装ゼロのため、機械強制への強化は将来 intent で追加可(逆方向の緩和も文言変更のみ)
- **Alternatives Rejected**: A=制約なし(注記すら置かないと運用合意が非可視)/ C=機械強制(identity 判定機構の新設 — 規模増+決定的判定源の不在)。採用 B=運用注記

## ADR-6: SKILL は session skills 既習様式(E-MPRAD3 裁定 A、3-0)

- **Context**: FR-3/U-03b
- **Decision**: 正本 `packages/framework/core/skills/amadeus-mirror/SKILL.md` の1定義+`{{HARNESS_DIR}}` トークン置換で coreDirs 投影(amadeus-session-cost 等と同型、runner-gen 不使用)
- **Consequences**: canonical 1定義維持・6面手書きなし。manifest の skills 投影リストへの追加が実装タスク
- **Reversibility**: 中間 — SKILL 1定義の様式変更は容易だが、6ハーネスへ配布後の SKILL 名変更は利用者可視の互換面
- **Alternatives Rejected**: B=runner-gen 流用(コンパイル済みステージグラフからの生成機構であり、ステージ外 SKILL への流用は意味論不適合 — citation-semantics-check)/ C=6面手書き(canonical 1定義原則違反)。採用 A=session skills 既習様式

## ADR-7: gh は optional runtime 依存(G-1 既決の設計反映+改定文言)

- **Context**: FR-7/C-01/P-01。現行 gh-scripts-boundary は「配布フレームワークへ持ち込まない」
- **Decision**: 改定文言(norm PR 用): 「gh CLI への依存は、repo ローカル開発支援ツール(scripts/)に加え、**配布フレームワーク内の optional runtime 依存としても許容する** — 条件: (i) 不在・未認証は loud エラー(当該機能のみ不可、workflow は止めない) (ii) トークン非保持(gh keyring 委譲) (iii) 必須依存化(インストール要求・起動時チェック)はしない。Bun-only Forbidden は『必須 runtime dependency の追加禁止』として維持し、optional 依存は文書化(本改定)をもって許容する」
- **Consequences**: mirror 系機能は gh 環境でのみ有効。フレームワーク本体の動作は gh 不在でも完全
- **Reversibility**: ロックイン寄り — optional 依存の許容を後から撤回すると配布済み機能の破壊的変更になる。条件 (i)〜(iii) の厳格化は可逆
- **Alternatives Rejected**: (a) gh 必須化 — Bun-only Forbidden の実質破壊。(b) GitHub API 直叩き(トークン管理を自前化)— keyring 委譲の安全性を失い秘匿情報管理が発生
- **セキュリティ影響**: トークン非保持を維持(現行と同等)。gh 呼出は引数配列 spawn(shell 非経由)を維持

## 意図的相違の明文照合(citation-semantics-check)

- amadeus-settings.ts の fail-closed parse を踏襲するが、settings の「全モード off を invalid とする」規則は auto-mirror(単一 boolean)には適用しない — off が正常 default であるため(意味論の相違を明示)
