上流入力(consumes 全数): unit-of-work, requirements

# Code Summary — setup-hooks-merge

unit-of-work.md の U3 と requirements.md の FR-3/FR-7c の実装記録(code-generation-plan.md の全4ステップ完了)。

## 作成ファイル

| ファイル | 内容 |
|---|---|
| `packages/setup/src/domain/kimi-hooks.ts` | 純粋マージロジック(renderManagedBlock/planMerge/applyMerge/removeManagedBlock/checkTomlSyntax)。**二重識別**(マーカー + adapter コマンド行の内容シグネチャ)。重複・TOML 不正は loud fail |
| `packages/setup/src/modules/kimi-hooks.ts` | 組込み層(resolveKimiHome・runHooksMerge/runHooksRemoval。plan report 差分 → tty.confirm → バックアップ(copy)→ atomic 書込み。ports は DI) |
| `tests/unit/setup-kimi-hooks-domain.test.ts` | 純粋ロジック 19 件 |
| `tests/integration/t-kimi-hooks-merge.test.ts` | 実 snippet 正本 + tmp fs での module フロー 15 件 |

## Bolt 2 発見(kimi CLI が config のコメントを落とす)への対応

- 識別はマーカー行(trim 比較・CRLF 耐性)優先 + 内容検出(`.kimi-code/hooks/amadeus-kimi-adapter.ts` シグネチャ)の二重方式
- マーカー欠落の config は必ず `replace` に収束(マーカー復元・重複 add しない)
- ユーザー独自の `.kimi-code` ルールは、adapter シグネチャがなければ content 検出しない(誤飲み防止)

## 検証(conductor が再実行して裏取り)

- 新規 34 件 → 0 fail(conductor 再実行でも 0 fail・129 expect)
- `bun run typecheck` → 0(conductor 再実行でも 0)/ `bun run lint` → 0 / `bun run dist:check` → 0(conductor 再実行でも 0)
- 既存 setup スイート: 273 pass / 0 fail(worker 実行)
- 全体 unit suite の 35 件の既存失敗は、worker が自分のファイルを一時退避しても同じく 35 件であることを確認(本変更と無関係の既存失敗)

## 逸脱

1. **cli.ts への配線は未実施(意図的)**: `runHooksMerge` の呼出は U5(列挙)側で install/upgrade フローに接続する契約として公開(戻り値 applied/noop/not-applied + renderHooksError)
2. `removeManagedBlock(configText)` → `(configText, block): Result<...>` に変更(内容検出の identity 参照と loud fail のため)
3. 非対話は install の BR-I11 流儀(レポート表示後に中断 + 手動手順表示)を採用。`--yes` は承認と見なさない(OC-1)
4. バックアップは copy(rename ではない)で「常に config が存在する」状態を維持。ファイル名は Windows 合法形
5. 書込み前にマージ出力を再検証するガードを追加(スプライス欠陥から config を守る防御)
6. Node 実行時(Bun 不在)は oracle 不在の actionable loud fail(bunx 実行を案内)
7. test-size 純度ゲートにより fs 接触テストは integration へ配置

## B4(doctor)への引き継ぎ

- 検出契約は domain の export で再利用可能(マーカー定数・内容シグネチャ・resolveKimiHome)
- 検査候補: (a) マーカー欠落(内容検出されるがマーカーなし → 次回 install で修復)、(b) 重複(マーカー2組以上・同一 adapter hook 重複)、(c) git 系ルールの残留(旧 block がマーカー欠落で除去された場合に原理的に検出不能になりうる — 警告候補)
