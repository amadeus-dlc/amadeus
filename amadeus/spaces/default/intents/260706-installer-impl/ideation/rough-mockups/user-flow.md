# User Flow — インストーラの実装

> ステージ: rough-mockups (Ideation) / 作成: 2026-07-07
> 上流入力: `../scope-definition/scope-document.md`(IN: init/upgrade)、`../intent-capture/intent-statement.md`(顧客: 新規+既存ユーザー)、`../scope-definition/intent-backlog.md`(Must P1〜P5 / Won't W1〜W7 の境界)

## フロー 1: 新規導入(init)

```mermaid
flowchart TD
    A[bunx amadeus-dlc/setup] --> B{対話モード?}
    B -- はい --> C[ハーネス選択]
    C --> D[導入先確認]
    D --> E[実行前サマリー確認]
    B -- "フラグ指定 --yes" --> F[取得: GitHubタグ]
    E -- Yes --> F
    E -- No --> Z1[中断・変更なし]
    F --> G{取得成功?}
    G -- はい --> H[展開: dist/harness を導入先へ]
    G -- いいえ --> Z2[エラー表示 + リトライ案内]
    H --> I[完了 + ネクストステップ案内]
```

<!-- Text fallback: initは対話(ハーネス選択→導入先確認→サマリー確認)またはフラグ指定でGitHubから取得し、展開して完了案内。取得失敗はエラー+リトライ案内、サマリーでNoなら変更なしで中断 -->

## フロー 2: 更新(upgrade)

```mermaid
flowchart TD
    A[bunx amadeus-dlc/setup upgrade] --> B[導入済みバージョン検出]
    B --> C{検出成功?}
    C -- いいえ --> Z1[未導入エラー: init を案内 M5]
    C -- はい --> D[新バージョン取得]
    D --> E[差分計算: add/update/skip]
    E --> F0{--force 指定?}
    F0 -- いいえ --> F[差分レポート表示 適用前]
    F0 -- はい --> W[警告 + OVERWRITE対象列挙 M3b]
    W --> WC{force と明示入力?}
    WC -- はい --> HF[完全上書き適用]
    WC -- いいえ --> Z3[中断・変更なし]
    F --> G{適用確認? --yes で自動承認}
    G -- Yes --> H[非破壊マージ適用 amadeus-* のみ]
    G -- No --> Z2[中断・変更なし]
    H --> I[完了サマリー]
    HF --> I
```

<!-- Text fallback: upgradeは導入済みバージョンを検出(未導入ならinitを案内=M5)、新バージョンを取得して差分を計算。--forceなしは適用前レポート→確認(--yesで自動承認)→非破壊マージ。--forceありは警告とOVERWRITE対象列挙の後「force」の明示入力による二段階確認を経て完全上書き。どちらも拒否なら変更なしで中断 -->

## タッチポイントと感情曲線(要約)

| 段階 | ユーザーの状態 | 設計上のケア |
|------|----------------|--------------|
| コマンド実行前 | README を読んでいる | ワンライナーをコピペするだけにする(成功指標2) |
| ウィザード中 | 選択に迷いうる | 選択肢は4ハーネスのみ・デフォルト値を常に提示 |
| 待機中 | 不安(何が起きている?) | 進行を1行ずつ表示、1分以内に完了(成功指標1) |
| upgrade 確認時 | 上書きへの恐れ | 差分テーブル + 「ユーザーファイルには触れない」明言(成功指標3) |
| 完了後 | 次に何を? | ネクストステップ(/amadeus の起動)を必ず表示 |
