# Component Methods — standing-delegation-grant

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜8・E-SDG-RA/RA2 裁定焼き込み)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-10)、codekb `code-structure.md`(delegate provenance 観測節)・`architecture.md`・`component-inventory.md`(いずれも本日 RE 現況)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## C-1: 発行・撤回 verb(amadeus-state.ts)

| 関数 | シグネチャ | 責務 |
|------|-----------|------|
| handleGrantStandingDelegation | `(args: string[]) => void` | 接地ゲート(humanActedSinceGate(pd) 拒否様式 :1975 同型)→ チームモード判定(AC-1b、env 唯一)→ scope 検証(初期語彙 `stage-gates` のみ、未知拒否)→ TTL parse(数値検証)→ GRANT_ISSUED 行を**発行セッションの active intent シャード**へ emit(Q1=A の「issuer シャード」)。フラグ: `--ttl-ms <n>`(省略時 DEFAULT_STANDING_GRANT_TTL_MS)・`--include-phase-boundary`(RA2-C opt-in — **行の Includes Phase Boundary: true/false を常に明記**(e1 留保: 無音の含み込み禁止))・`--user-input <text>` |
| handleRevokeStandingDelegation | `(args: string[]) => void` | 同接地ゲート+チームモード → `--grant-id <id8>` 必須 → GRANT_REVOKED 行 emit |

- GRANT_ISSUED フィールド(DELEGATED_APPROVAL 様式拡張): Grant Id(8-hex)/ Scope / Expires At(ISO — 発行時刻+TTL)/ Includes Phase Boundary / Issuer Space / Issuer Intent / Issuer Shard / Issuer Human Ts / User Input
- 出力(stdout JSON): grant_id / scope / expires_at / includes_phase_boundary **+ 人間可読行(stderr): `phase-boundary gates: EXCLUDED (default; pass --include-phase-boundary to opt in)` または `phase-boundary gates: INCLUDED (--include-phase-boundary)`** — フラグ名と「既定=除外」が verb 出力自体に明文で現れる(e2 留保の verb 側 — M-4 是正。e1 留保の opt-in 有無明示も同時充足)

## C-2: 受理検証(amadeus-lib.ts 純関数+state.ts 分岐)

| 関数 | シグネチャ | 責務 |
|------|-----------|------|
| findActiveStandingGrant | `(projectDir: string, now: number) => StandingGrant \| null` | 全 intent の監査シャード(`intents/*/audit/*.md`)から GRANT_ISSUED 行を走査(Q1=A の帰結 — グラントは intent 横断の standing 権限であり発行者の active intent シャードに置かれるため、受理側は座標を事前に知らない)。各候補に対し (i) 根拠 HUMAN_TURN 実在(verifyDelegatedProvenance :2528 同族の同シャード照合) (ii) now < Expires At(parse 後比較) (iii) 同 Grant Id の GRANT_REVOKED 不在 (iv) scope 適合 — **全 AND**。複数有効時は Expires At 最新を採用 |
| standingGrantSatisfiesGate | `(grant, slug, stateContent, graph) => boolean` | 除外分類: (a) phase-boundary = 解決対象 slug の phase ≠ 次 in-scope stage の phase — **`findStageBySlug`(lib:5043)+`nextInScopeStage`(lib:5065)で導出**(state.ts:1332 / handleApprove:1849-1852 の独立2実装と意味論等価な第3の同型実装 — ADR-5) → grant.includesPhaseBoundary が true の場合のみ通す(RA2-C) (b) walking-skeleton = Skeleton Stance 解決値 on(消費側 orchestrate.ts:683/:711 と同じ読み)かつ slug が scope 実行列の先頭 construction ステージ → 常に拒否 (c) それ以外の stage-gate → 通す。**stateContent/graph は判定対象ゲートの属する intent のもの**: gate resolution 経路では自セッション state、handleDelegateApproval 経路では宛先(--to-intent)の state(ADR-7 決定3 — targetRecord 解決を接地ゲートより前へ移動) |

- 受理側の組み込み点: `assertHumanPresentForGateResolution`(state.ts:1781、**approve verb のみ** — reject は ADR-7 決定2 の意図的除外)と `handleDelegateApproval` 接地ゲート(:1975)の否定分岐内。`handleDelegateRejection`(:2069)は**対象外**(授権範囲 — ADR-7) — **humanActedSinceGate が false を返した後にのみ**グラント判定を試みる(fail-open 分岐 lib:2484 とは合流しない = AC-3b。ledger 走査不能で true が返る経路ではグラント判定自体が実行されない)
- 受理成立時: 監査行(GATE_APPROVED / DELEGATED_APPROVAL)に `Grant Id` を追記(AC-3c)。**両側チームモード判定**は受理分岐の先頭(env 非 team なら即 false)

## C-3〜C-5

- C-3 は C-2 の standingGrantSatisfiesGate に内包(独立ファイルなし)
- C-4: doctor に DoctorCheck 行「Standing delegation grant」— 有効グラント有無 / scope / 残 TTL / Includes Phase Boundary / 発行 intent。「なし」は pass 表示(guard-activator — 空文 advisory を出さない)
- C-5: PRESENCE_PROTECTED_EVENTS(audit.ts:766)へ GRANT_ISSUED / GRANT_REVOKED を追加(CLI mint 拒否 — 書き込みは C-1 verb の in-process 経路のみ)。audit-format.md へ taxonomy 追記。docs 棚卸し(delegate 運用記述節)は e2 留保どおり「フラグ名+既定=除外」を明文
