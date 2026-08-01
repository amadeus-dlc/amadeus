# Code Summary — fix-1861-metrics(Bolt 5)

上流入力(consumes 全数): requirements.md

- 実装は `requirements.md` FR-9 の AC 全数に対し Red→Green を実測して完了した。PR: [#1885](https://github.com/amadeus-dlc/amadeus/pull/1885)(branch `bolt/obb5-5-metrics`)。

## 変更面

- `scripts/metrics-publication-github.ts` — `loadRemoteBranch` を判別ユニオン `RemoteBranchLoad`(loaded/absent)化。fetch 失敗時は ls-remote の不在実測で分類、absent は inventory から除外。snapshot 経路と maintenance 経路(`#candidateInventory`)の両方(same-root 同一 PR)。
- `scripts/metrics-publication-domain.ts` — 無改変(problems の terminal 述語は所有権証拠異常の fail-closed を保存)。
- テスト: t222 unit / integration 拡張。**t398 は返上**。
- dist 再生成: 不要(scripts/ のみ、CR-3 対象外)。

## AC 実測(Red verbatim → Green)

| AC | Red | Green |
|---|---|---|
| AC-9a | `{"code":1,"finalState":"publication-not-converged",...,"problems":["...fatal: couldn't find remote ref refs/heads/metrics/snapshot-..."]}`(実 CI 失敗と同一形状) | `{"code":0,"finalState":"converged",...,"problems":[]}` |
| AC-9b | — | 所有権証拠異常の terminal 性を unit で pin、「ref 不在ではない fetch 失敗は problem のまま」を adapter テストで pin |
| AC-9c | dispatch 不到達 | 同一テストで `dispatches === 1` を assert(maintenance dispatch 到達) |
| maintenance same-root | 修正前面へ限定 checkout で切替し `couldn't find remote ref refs/heads/metrics/maintenance` の fail を実測 | green |

## 検証(実測 exit code)

typecheck 0 / lint 0 / t222 unit+integration 0(76 pass)/ `--unit --integration --coverage` 0(RESULT: PASS、193 files / 622 tests)/ patch gate 0(added 29 / covered 29 / **uncovered 0**)/ project gate 0 / complexity 0 / dist:check 0 / promote:self:check 0。

## 逸脱

なし(分類方式の「メッセージ照合でなく ls-remote 実測」は要件の修正方向内の実装選定 — 理由を plan と PR 本文に記録)。

## 同根

maintenance 経路を同一 PR で修正(要件指定)。他の残存なし(domain 述語は意図的無改変)。
