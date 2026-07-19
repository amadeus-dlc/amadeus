# Business Logic Model — election-cli(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 状態機械(ADR-3 追補 — 7状態の指令ループ、FR-0)

```
draft → open → collecting → tallied → rendered → recorded(終端)   # 7状態目 rendered を追加(E-ETF-FD2 Q2=A 裁定 — ADR-3 追補)
任意状態 → hold(reason: HoldReason — tie/block/quorum-short/discussion-needed)→ 人間裁定後に report --result hold-resolved で復帰
```

## next の指令表(状態 → 型付き指令)

| 現状態 | 指令 kind | payload | AI の実行 |
|---|---|---|---|
| draft | `distribute` | 未配信 voter 一覧+notify verb 呼出形 | notify 実行 → report |
| open/collecting(未着あり) | `collect-wait` | 投票済み/未着一覧(status 由来)+early tally 可否 | 待機 or 催促判断(人間委譲)。early 可なら tally-ready も併記 |
| collecting(全着 or early 可) | `tally-ready` | tally verb 呼出形 | tally 実行 → report |
| tallied | `render` | render verb 呼出形 | render 実行 → report(rendered へ) |
| rendered | `verify` | verify verb 呼出形(self-check) | verify 実行 → report(recorded へ) |
| recorded | `done` | 記録パス | 終了 |
| hold | `hold` | reason+人間への提示文 | **人間へ委譲(AI は判断しない — C-01)** |

- stdout = 指令 JSON / stderr = advisory(stdout-directive-stderr-advisory 準拠)
- 指令 payload の正確な型形状は実装時確定(decisions.md 委任)— ただし各指令は「実行すべき verb とその引数」を機械可読で名指しする(FR-0: AI 無知識)

## report の遷移コミット

```
report --election <id> --result <distributed|ballots-collected|tallied|rendered|verified|hold-resolved>
  → 状態遷移を store(U2)へコミット。不整合(現状態と result の不一致)は reject(fail-closed)
  hold-resolved は --resolution を必須で伴い、hold 理由別の復帰表に従う(Q2=A 裁定):
    | hold 理由 | resolution | 復帰先 |
    |---|---|---|
    | tie | adopted / rejected(人間裁定) | tallied(裁定を tally 結果として確定)|
    | block | adopted / rejected / reopen(再審) | tallied / collecting(reopen 時)|
    | quorum-short | resume-collecting(催促・追加投票)/ close-rejected | collecting / tallied |
    | discussion-needed | discussed(追加議論1回完了 — norm (iii))| collecting(再投票受付)|
```

## verb 実行面(open/notify/vote/status/tally/render/verify)

各 verb は U1〜U4 の関数を配線するだけの薄い実行面。全 verb: 成功 stdout JSON+exit 0 / 失敗 stderr {error}+exit 1(loud)。

## 機械実行器 e2e(ADR-6 (i) — CI 常設)

```
runMachine(electionId):
  loop: d = next(); switch(d.kind): 指令が名指しした verb を字義どおり実行 → report
  while d.kind != done && d.kind != hold
```

LLM 不在・選挙知識ゼロの TS ループが 0件確認選挙1件を open→…→recorded まで完走することを integration/e2e テストで固定(FR-0 受け入れの CI 層+C6 指令スキーマの consumer 契約テスト)。

## Bolt 切り出しの参照(正本 = bolt-plan.md)

Bolt 1 の U5 核 = 7状態の直進経路(draft→…→recorded)+next/report+**全 verb の最小実装**(open/notify(no-op 可)/vote/status/tally/render/verify — 各 verb は zero-confirm 完走に足る最小。Q2=A 裁定『各 verb の最小実装を Bolt 1 に含める(完走可能)』)。hold 分岐・verb の完全化・機械実行器 e2e は Bolt 4(cli-complete)。旧起草の『render/verify は Bolt 4』は recorded 到達不能の矛盾(reviewer F3)につき裁定で置換。

## エラー処理

全 verb は Result → exit code 写像。状態遷移の不整合・未知 verb は loud エラー(fail-closed)。--help フラグは実装しない(no-help-probe-on-mutating-verbs の教訓 — 未知引数は usage を stderr に出して exit 1)。
