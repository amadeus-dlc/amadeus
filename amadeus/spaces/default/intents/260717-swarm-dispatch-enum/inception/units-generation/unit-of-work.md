# Unit of Work — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。

Unit 分割は `component-dependency.md` の依存位相(C1 唯一起点)と scope の Capability Dependencies に従う3段直列。各 Unit は実装+配線+テスト+必要文書を同時に着地させる(C-09 — adapter・契約のみの先行なし)。概算行数レンジは `decisions.md` 規模数値表からの控除式合算(独自再配分なし)。

## U1: driver-contract-core

- 対象: C1(DriverName 三値置換・`resolveDriver` 純関数・`resolve` サブコマンド)+ C2(emitSwarmDegraded 追随、Fallback :291 維持)+ C7 のうち契約テスト(matrix 全セル in-process・FR-2 negative 副作用ゼロ・t28 enum 同期・t134/t135/t207/t211 語彙追随・回帰)
- 充足 FR: FR-1, FR-2, FR-4, FR-6, FR-7(回帰維持), FR-3 の audit 面
- 受け入れ: decision table 全セル green / rejected 経路の副作用ゼロ実測 / repo 全域 grep で `ultracode` 残存 0 / t134・t135・t207・t211・t28 green / local lcov で diff 追加行未カバー 0
- 概算行数レンジ: **165-305**(C1 60-110 + C2 5-15 + C7 分の契約テスト 100-180 — C7 全体 150-280 のうち U2 帰属分 50-100 を控除)

## U2: harness-wiring

- 対象: C3(Claude SKILL:61 三値化+resolve 手順)+ C4(Codex SKILL:57,171 / emit.ts:81 / onboarding.fills.ts:42,55 の headless 撤去→native fan-out、retry/wave 詳細は FD 確定分を反映)+ C5(Kiro / Kiro IDE の degrade・fail-closed・旧 `1` 除去)+ C7 のうち t181 SKILL parity 追随+t-exec-codex-journey 系の扱い確定(置換 or 退役 — AD Open question の棚卸し)
- 充足 FR: FR-1(prose 面), FR-3(利用者表示), FR-5, FR-8
- 受け入れ: 4 harness SKILL の decision 記述が FR-1 表と一致(t181)/ codex source から headless floor 記述 0 / Kiro 系に旧 `1` 記述 0
- 概算行数レンジ: **90-190**(C3〜C5 prose 40-90 + C7 分の parity・journey テスト 50-100 — C7 全体 150-280 の残余)

## U3: docs-and-parity

- 対象: C6(正規契約2文書の driver seam 表三値化・breaking removal・C-15 開示・opencode/cursor 1行 — 既存 08 節へ追記限定・harness ガイド .md/.ja.md 対)+ C8(package.ts / promote:self による dist×6+self-install 同期)
- 充足 FR: FR-9, FR-10, NFR-2(docs 開示面)
- 受け入れ: docs の decision 表が FR-1 と一致 / opencode・cursor 行の実在 / `bun run dist:check`・`bun run promote:self:check` green / dist に旧語彙・headless 記述 0
- 概算行数レンジ: **40-80**(docs 40-80。dist/self-install は生成物のため手書き 0 — 行数対象外と明記)

## 規模合算

手書き実装+テスト+文書の合算レンジ: **295-575**(U1 165-305 + U2 90-190 + U3 40-80。生成物 dist/self-install を含まない)。この合算は `decisions.md` 規模数値表の機械合算(C1 60-110 + C2 5-15 + C3〜C5 40-90 + C6 40-80 + C7 150-280 + C8 0 = 295-575)と一致する — C7 の 150-280 は U1(契約テスト 100-180)と U2(parity・journey 50-100)へ carve-up し、表外の加算はない。固定 LOC 上限は合否基準にしない(C-10)— 凝集性と伝播面は AD の変更セット C1〜C8 に閉じる。
