# Components — solo-election

上流入力(consumes 全数): requirements.md(FR-01〜FR-13/NFR — 変更対象表の導出元)、intent-statement.md(裁定 Q1-Q6)、scope-document.md(W-04 改訂後 — 境界の明示節の根拠)、architecture.md(選挙サブシステム現在節 — 現行シグネチャ・行番号の実測源)、component-inventory.md(既存コンポーネント棚卸し — reuse inventory の母集合)、team-practices.md(変更なし評価 — team.md 改定を発見事項でなく変更対象コンポーネント M-05 として扱う線引き)。

## 変更対象コンポーネント(既存への内挿のみ — 新規モジュールなし)

| コンポーネント | 正本 | 変更内容 | 規模見積り(行) |
|---|---|---|---|
| tally(集計純関数) | packages/framework/core/tools/amadeus-election-model.ts:440-477 | 2体規則の追加(FR-05): discuss 閾値の2体分岐・棄権 quorum-short・split hold。HoldReason へ `split` 追加 | +35〜50 |
| HOLD_RESOLUTIONS / report | packages/framework/core/tools/amadeus-election.ts:81-86 ほか | `split` の解決語彙(adopted/rejected/reopen — block と同型)を追加(FR-07) | +10〜15 |
| render / verify | amadeus-election-record.ts(rulingText :118-128(hold 分岐 :127 が reason を無条件テンプレート展開) / renderPersistDraft)・amadeus-election.ts handleVerify :519-549 | **変更不要(+0行)** — rulingText は reason 値を無条件テンプレート展開し、verify は reason 非依存(レビュー実測)。HOLD_RESOLUTIONS の Record<HoldReason,…> 型検査が split キー追加を強制するのみ | 0 |
| SKILL.md(選挙スキル) | packages/framework/core/skills/amadeus-election/SKILL.md(4節) | ソロ手順の内挿(FR-02/04/08/09/10/11): spawn テンプレ・同期完遂・再spawn・降格告知・発動類型 | +20〜30(t242 契約内) |
| team.md ソロモード節 | amadeus/spaces/default/memory/team.md | 2体 subagent 選挙の正規形態化(FR-12) | +10〜15 |
| specs/tla/FormalElection.tla(形式モデル本体) | specs/tla/ | **意味論拡張(ハッシュ更新とは別作業)**: Voters は :5 で {V1,V2,V3} 固定 — 2体インスタンス(可変化または2値インスタンス)へ拡張、HoldReasons :24 へ "SPLIT" 追加、HoldReason(r) :51-56 へ2体分岐を実装。tally 状態機械の spec 変更につき **two-layer-verification-posture(Mandated)の TLC 完全探索ジョブ再実行を build-and-test 段で発動** | +30〜60 |
| specs/tla/model-map.json | 既存 TLA 対応表 | 実装 SHA 写像の更新(model-completeness センサーはハッシュドリフト検査のみ — モデル意味論は上記 .tla 拡張が担う) | +2〜5 |
| テスト | t234(**DEF fixture は voters=[alice,bob] の2体 — 2体分岐で結果が反転する既存アサーションの per-assertion 監査・書き換えが必要**。実例: :142-152「a lone GoA-5 still establishes」は FR-05(i) で established→hold へ反転)/ t236 系(loop integration)/ 新規 solo loop integration / t242(不変確認) | FR-05 落ちる実証+既存2体アサーション監査+regression+solo E2E+SKILL green | 既存書換 +30〜60 / 新規 +250〜350 |

**新規コンポーネントはゼロ**(reuse inventory: 既存 typed directive loop・blind view 生成・bookReportedDeliveries・amend/resolveBallots・t236 のループ検証ハーネスをそのまま再利用)。CLI 新 verb 追加なし(FR-01 — notify が返す DeliveryDirective で駆動可能なことは RE 実測済み)。

## 変更しないコンポーネント(境界の明示)

- transport 層(amadeus-election-transport.ts): 指令返却設計(spawn しない・record を mint しない)は**意図された設計**(E-ETF-FD2 Q1=B)であり不変。spawn は conductor(ハーネス側)の責務のまま。
- store / record / registry: 変更なし(voterKind は既に ballot スキーマに存在)。
- エンジン(amadeus-orchestrate.ts): 発動判断は conductor の知識作業(FR-09)でありエンジン変更なし。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T14:47:13Z
- **Iteration:** 2
- **Scope decision:** none

C-1(TLA 意味論拡張の明示+two-layer-verification-posture 発動)・M-1(render/verify 0行訂正+RECORD ノード)・M-2(t234 2体 fixture の per-assertion 監査明記)・Mi-1(:419)を実測で閉包確認。残余 Minor(rulingText 引用範囲)は conductor が :118-128+根拠行 :127 へ機械是正済み。

### Findings

- None
