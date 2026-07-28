# Business Logic Model — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

U4 は unit-of-work の定義どおり、(1) `mirror-projects` 設定の完全形(FR-5)と (2) `repair status` の Project 診断拡張(FR-9、FR-6c/FR-10b の診断面)を実装する。story-map ジャーニー4(「自チームの Project の列名が違っても設定で写像でき、ズレは repair status で一目で分かる」)を成立させる。実装面は components の C1(amadeus-mirror-config.ts)と C3(amadeus-mirror-lifecycle.ts)への割付、シグネチャは component-methods の C1/C3 が正。外部境界(gh サブプロセス・GraphQL 依存・認証)は services に従う。

## 設定の完全形(FR-5 — C1 config の4面一般化)

U1 は単一要素の最小 parse を導入済み(unit-of-work の段階導入)。U4 はこれを ADR-2 の4面(allowlist / MirrorConfig / MirrorConfigIssue / readFailure)で一般化する:

1. **allowlist**: 既存 unknown-key 拒否(実装直読: amadeus-mirror-config.ts:335-339 — `auto-mirror` 以外のキーを fail-closed で拒否)へ `mirror-projects` を許容キーとして追加する。それ以外のキーは従来どおり拒否(FR-5b (i))。
2. **値の検証**(closed schema): `mirror-projects` は配列。各要素は `project`("<owner>/<number>" 形式 — parse 結果は `MirrorProjectRef`)+ 任意の `status-names`(キーは `MirrorPhaseKey` の closed set: ideation/inception/construction/operation/done)。unknown phase キー・形式不正・非配列はすべて issue 化し、当該層の値を無効として扱う(4面の MirrorConfigIssue / readFailure 面)。
3. **層解決**(FR-5b (ii)): 3層(global/space/intent)のうち**新キーの有効値を持つ最後の層が勝ち、層間マージはしない**(全置換)。`auto-mirror` の既存層解決と独立に解決する(片方のキーだけ上書きした層が他方まで消さない — キー単位の全置換)。
4. **上書きの意味**(FR-5c): `status-names` はフェーズ→選択肢名の写像のみを変更する。フェーズ遷移の意味・順序は変更しない。未指定フェーズは C2 policy の既定表(`DEFAULT_PROJECT_STATUS_NAMES` — component-methods の canonical 1定義)へフォールバックする(`statusNames[phase] ?? 既定表` — component-methods C2 の記載どおり)。

## repair status の Project 診断(FR-9 — C3 lifecycle 拡張)

既存 `runRepairStatus`(実装直読: amadeus-mirror-lifecycle.ts:816、outcome は :843 の `kind: "status"` — pendingOperations を含む既存形は :406-412 の型宣言)へ、read-only の Project 診断列 `projectDiagnostics`(component-methods C3 の型を verbatim 消費)を追加する。手順:

1. state(U2 の projectSync 台帳)と config(上記完全形)を読む。台帳読取は診断の**部分成功検出**(FR-9a (v))の入力 — pending / safety-blocked entry の列挙は台帳から導出し、remote 再照会で上書きしない。
2. `listProjectItems` で現在の所属と現在 Status を照会(read-only — FR-9a (i)(ii) の実測面)。
3. 各同期対象 Project(所属実態 — FR-3f の範囲規定に従う)について:
   - `expectedProjectStatus`(C2 canonical — FR-9c: 同期側と同一定義を共有し、診断用の複製導出を作らない)で期待 Status を導出。
   - 現在 Status と期待の比較で `drift: boolean` を確定(FR-9a (ii))。
   - `resolveProjectStatusField` の結果を4値へ分類: `resolved` / `field-missing` / `option-missing`(このとき実在選択肢一覧 `availableOptions` を診断へ含める — FR-6c)/ `permission-denied`(FR-9a (iii)(iv))。
4. `permission-denied` の診断文言は「対象 Project+必要権限(`project` scope — services の認証節)」を秘匿情報なしで示す(FR-10b の診断面。docs 4文書への記載自体は U5 責務 — 先取りしない)。
5. **mutation は一切発行しない**(FR-9b)— gateway の mutation メソッド(addProjectItem / updateProjectItemStatus)呼び出し 0 回を negative assert でテスト固定(受入条件12)。

<!-- Text fallback: repair status は「台帳+config 読取 → 所属/Status 照会 → per Project: canonical 期待導出 → drift 比較+解決4分類(option-missing は実在選択肢一覧付き)→ 権限不足は必要権限を明示」の read-only 直線手順。mutation 0 回。 -->

## エラー・エッジケース

- gh 不在・未認証・API 障害: services の外部依存表どおり当該呼び出しを loud fail し、診断はエラーとして報告(FR-7e 準拠 — 診断の失敗が workflow を恒久停止させない)。
- 設定 0 件(projects 既定 [])+所属 0 件: Project 診断列は空 — 既存 repair status 出力は不変(U1 の BR-U1-1 と同じ「追加 API 呼び出しなし」原則)。
- 台帳に entry があるが所属から外れた Project: 台帳保持方針(U2 domain-entities)どおり entry は残るため、診断は membership: "not-member" として可視化する(drift 診断の材料 — U2 の設計意図を消費)。

## 検証面

- 受入条件9: unknown key 拒否 / 層置換(マージなし)/ 上書き適用の3面をテストで固定。落ちる実証は「unknown phase キー注入で issue 化」の赤を確認(inject-runtime-consumed-lines — 実行時消費行へ注入)。
- 受入条件12: drift あり/なし・field-missing・option-missing(availableOptions 内容込み)・permission-denied・部分成功の各ケースの診断出力を固定し、診断実行中の gateway mutation 呼び出し 0 回を FakeGateway history で assert。
- 実 FS を使う検証は integration 層(fs-tests-integration-first)。config parse・診断分類の純関数面は unit 直叩き。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T08:20:07Z
- **Iteration:** 1
- **Scope decision:** none

FR-5/FR-6c/FR-9/FR-10b・受入条件9/12 は unit-of-work の U4 定義・component-methods の型へ verbatim 一致で写像され、file:line 引用6点も実在確認済み。責務越境なし。Minor 1件(domain-entities.md の components 実参照欠落)は conductor が受理前に是正しセンサー再 PASSED。

### Findings

- [Minor] domain-entities.md 冒頭の consumes 列挙に components があるが本文実参照が無く artifact-upstream-inputs-header の装飾トークン禁止に該当(是正済み: C1/C3 モジュール割付の実参照1文を追記)
