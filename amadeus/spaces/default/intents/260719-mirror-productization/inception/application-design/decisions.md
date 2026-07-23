# Design Decisions(ADR)— 260719-mirror-productization

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## ADR-1: ツール移設は挙動不変の単純移設とする(既決の設計反映)

- **Context**: FR-1/G-2。scripts 版 373行は運用実証済み(#1222 等)
- **Decision**: `packages/framework/core/tools/amadeus-mirror.ts` へ無変更移設し、status のみ追加。scripts 版は同一 PR で削除
- **Consequences**: dist 6面へ自動投影(coreDirs)。t232 はパス参照のみ更新(fixture-propagation-grep で棚卸し)
- **Alternatives Rejected**: (a) 移設時のリファクタ同時実施 — 挙動不変の検証可能性を壊す(W-04)。(b) scripts 版を残す互換シム — 二重実装 Forbidden に抵触
- **セキュリティ/コンプライアンス影響**: なし(gh 依存の扱いは ADR-7)

## ADR-2: status の exit code は 0/1/2 の3値(E-MPRRA3 裁定 A、3-0)

- **Context**: FR-2。機械消費(CI・スクリプト)を想定
- **Decision**: 0=乖離なし / 1=乖離あり / 2=前提エラー。判定は `StatusOutcome` 判別ユニオンから写像
- **Consequences**: CI での乖離検知が exit code だけで可能。既存 verb の exit 契約(fail=1/usage=2)とは verb 別契約として共存(status の 2 は「前提エラー」— usage 2 と同値だが verb 内で意味を固定)
- **Alternatives Rejected**: (a) 常に exit 0(B 案)— 機械消費不能。(b) クラス別 exit(C 案)— 消費側の分岐が複雑化、3クラス同時発生時の合成が非自明

## ADR-3: phase 境界発火は phase-check 対象3境界・close 導線は含めない(E-MPRRA1 裁定 A、2-1)

- **Context**: FR-5/U-04a。E-MPRRA1 留保の履行
- **Decision**: 発火は ideation/inception/construction 完了時(`PHASE_CHECK_REQUIRED_PHASES` と同集合を canonical 参照)。**close 導線は本 ask 経路に含めず**、既存経路 = close verb(close-after-landing 検証 :339-345)+intent 完了時の intent-completion-issue-sweep 運用に接続する([e4] 留保の design 明文化)。complete 境界(operation 完了)での ask は将来判断([e6] 非採用側視点: close は C-05 既決で自動 close リスクなし・追加 ask は workflow あたり1回で軽量 — を保存)
- **Consequences**: ask 発火は最大3回/workflow。close の人間関与は verb 経路で常に保証
- **Alternatives Rejected**: (a) 4境界(B 案)— close 導線が ask に混入し C-05 の ask 原則と二重化。(b) construction のみ(C 案)— ideation park 時のミラー同期漏れ(本 intent 自身が該当した類型)を防げない

## ADR-4: 3層 config の形式・置き場

- **Context**: FR-4/U-03a。G-6(Global は amadeus/ 直下 git 共有)は既決、形式が未決
- **Decision**: 【裁定待ち — Q2】
- **Consequences**: 【裁定待ち — Q2】
- **Alternatives**: A=JSON 3面(fail-closed 既習様式踏襲)/ B=YAML(新規パーサ依存が Bun-only と緊張)/ C=md フィールド様式(設定ファイルとして非標準)

## ADR-5: mirror verb の実行主体制約

- **Context**: FR 群/U-02。現行実装に主体検査なし(RE scan-notes (1))
- **Decision**: 【裁定待ち — Q1】
- **Consequences**: 【裁定待ち — Q1】
- **Alternatives**: A=制約なし(fail-closed 検証で防御)/ B=SKILL 運用注記(実装ゼロ)/ C=機械強制(identity 判定機構の新設 — 規模増+決定的判定源の不在)

## ADR-6: SKILL の6ハーネス生成様式

- **Context**: FR-3/U-03b
- **Decision**: 【裁定待ち — Q3】
- **Consequences**: 【裁定待ち — Q3】
- **Alternatives**: A=session skills 既習様式(1定義+トークン置換)/ B=runner-gen 流用(ステージ外への意味論不適合)/ C=6面手書き(canonical 原則違反)

## ADR-7: gh は optional runtime 依存(G-1 既決の設計反映+改定文言)

- **Context**: FR-7/C-01/P-01。現行 gh-scripts-boundary は「配布フレームワークへ持ち込まない」
- **Decision**: 改定文言(norm PR 用): 「gh CLI への依存は、repo ローカル開発支援ツール(scripts/)に加え、**配布フレームワーク内の optional runtime 依存としても許容する** — 条件: (i) 不在・未認証は loud エラー(当該機能のみ不可、workflow は止めない) (ii) トークン非保持(gh keyring 委譲) (iii) 必須依存化(インストール要求・起動時チェック)はしない。Bun-only Forbidden は『必須 runtime dependency の追加禁止』として維持し、optional 依存は文書化(本改定)をもって許容する」
- **Consequences**: mirror 系機能は gh 環境でのみ有効。フレームワーク本体の動作は gh 不在でも完全
- **Alternatives Rejected**: (a) gh 必須化 — Bun-only Forbidden の実質破壊。(b) GitHub API 直叩き(トークン管理を自前化)— keyring 委譲の安全性を失い秘匿情報管理が発生
- **セキュリティ影響**: トークン非保持を維持(現行と同等)。gh 呼出は引数配列 spawn(shell 非経由)を維持

## 意図的相違の明文照合(citation-semantics-check)

- amadeus-settings.ts の fail-closed parse を踏襲するが、settings の「全モード off を invalid とする」規則は auto-mirror(単一 boolean)には適用しない — off が正常 default であるため(意味論の相違を明示)
