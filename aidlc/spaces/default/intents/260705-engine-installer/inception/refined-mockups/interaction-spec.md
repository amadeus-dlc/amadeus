# Interaction Spec — Engine Installer（260705-engine-installer）

上流入力: [mockups.md](mockups.md)、[user-flow.md](../../ideation/rough-mockups/user-flow.md)、[requirements.md](../requirements-analysis/requirements.md)

## 引数

| 引数 | 必須 | 意味 |
|---|---|---|
| `--target <path>` | 必須 | インストール先 workspace のルート。事前チェック（存在・ディレクトリ・書き込み可）の対象 |

未知の引数・`--target` 欠落は usage を stderr に出して exit 1 とする。対話プロンプトは設けない（D8）。

## 事前チェックのエラー文言（FR-1.1、US-5 の 3 パターン）

`amadeus-install: error: <reason>` の `<reason>` は次の 3 通りとする。いずれも fix 案内は `--target` の指定修正で共通である。

| パターン | reason |
|---|---|
| 不在 | `target does not exist: <path>` |
| 非ディレクトリ | `target is not a directory: <path>` |
| 書き込み不可 | `target is not writable: <path>` |

## 終了コード

| code | 意味 |
|---|---|
| 0 | 全工程完了（スモーク pass を含む） |
| 1 | 事前チェック失敗、工程中のエラー中断（衝突、解析不能 JSON、I/O 失敗）。スモーク fail の扱い（中断と exit code）は O-2 と併せて functional-design で確定する（未確定） |

## 出力規約

- 進行表示（`[n/5]`）と完了通知は stdout、エラーと fix 案内は stderr に出す。
- エラーは常に「対象 path + 原因 + fix 案内」の 3 点を含む。fix 案内は事前チェック失敗では `--target` の修正、工程中失敗では原因解消後の再実行（冪等収束）である（FR-1.1）。
- 更新（再実行）も同一コマンドで行う（user-flow.md の更新規約。上書き更新型 = D5）。Codex 利用者は工程 3〜4 の配線が Claude 向けであることを README で知る（user-flow.md のハーネス別フロー。README への記載要否は functional-design の README 設計で扱う）。
- 色・装飾に依存しない（パイプ・CI ログでも同じ情報が得られる）。
