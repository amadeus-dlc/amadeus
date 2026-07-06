# Unit of Work Dependency：260704-v2-parity-completion

## 依存 DAG

| 依存元 | 依存先 | 理由 |
|---|---|---|
| U002 | U001 | 結線層は directive と questions ファイル契約（エンジン）が動くことを前提にする |
| U003 | U001、U002 | skill はエンジンを呼ぶラッパーであり、質問文言は結線規範に従う |
| U004 | U003 | 置換完了前に削除すると入口に空白ができる |
| U005 | U001 | 必須節定義を stage 定義（aidlc-common）から読むため |
| U006 | U001、U003 | 配置と skill 一覧が確定しないと突き合わせできない |
| U007 | U004 | 削除と改名の結果を契約文書へ反映する（backward-compatibility.md の対象登録だけは U005 より先に行う） |
| U008 | U003、U005、U006 | examples は新契約 skill の実行結果で、validator pass とパリティ green が成立条件 |

循環はない。

```text
U001 ─┬─ U002 ── U003 ─┬─ U004 ── U007
      ├─ U005          ├─ U006
      │                └───────────┬─ U008
      └────────────────(U005、U006)┘
```
