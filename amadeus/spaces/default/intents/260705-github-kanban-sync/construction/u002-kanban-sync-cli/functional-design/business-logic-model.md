# Business Logic Model — u002-kanban-sync-cli

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## 処理フロー（1 回の sync）

```
main(argv)
  1. 引数解釈: --all | --dirs <dirName,...>（どちらも無ければ usage エラー）
  2. --all の場合: cwd がメインリポジトリであることを検証（worktree なら明示エラー。D-AD11）
  3. assertProjectScope(): gh の token scope に project が無ければ明示エラー（FR-4.1）
  4. resolveProject("amadeus-dlc", "Amadeus Intents"): 無ければ「人間が作成する」旨のエラー（FR-3.1、D-AD8）
  5. ensureFields(): Status option 6 個 + text フィールド 7 個を確認・不足分作成（FR-3.5）
  6. scanIntents(spaceDir, now, dirNames?): IntentCard[] を構築（FR-2.1〜2.3）。
     spaceDir は実行時 cwd 配下の aidlc/spaces/default から解決する（--all / --dirs 共通。
     worktree ごとに異なる。固定パスの定数化はしない。D-AD7 改訂）
  7. listItems(): 既存 item をタイトル（dirName）で索引
  8. 各 card について upsertItem(): 無ければ draft issue 作成、全フィールド上書き（FR-3.4、FR-3.6、D-AD4）
  9. 成功: exit 0。途中失敗: 1 段落のエラーで非 0 exit（部分書き込みは冪等で無害。FR-4.2）
```

## 列決定（ColumnMapper の判定順）

1. `aidlc-state.md` に `[?]` ステージがある → `Awaiting Approval`（FR-3.2、最優先）。判定は行頭のチェックボックス記法だけにアンカーする（`^- \[\?\] ` 相当）。`<!-- Checkbox states: ... -->` の凡例コメント行は `[?]` を含むため、行全体の部分一致では全 Intent が誤検知する。既存の構造的パース（`amadeus-utility.ts` の `parseCheckboxes`）と同じ規律に従う
2. registry の status が completed / complete → `Done`
3. それ以外 → Lifecycle Phase を列へ写像（INITIALIZATION → Ideation に丸める = D-AD2。IDEATION → Ideation、INCEPTION → Inception、CONSTRUCTION → Construction、OPERATION → Operation）

## 欠損時の値

record dir・`aidlc-state.md`・audit shard が無い場合、agent / host / stage は `未確認`、worktree は `-`、awaiting は false とし、カードは作る（欠損で落とさない。scanIntents の契約）。
host の判定対象は `<host>-<clone>.md` の命名にマッチするファイルだけとする。レガシー集約ログ（`audit.md`）はマッチしないため除外し、マッチ 0 件なら `audit/` の有無に関わらず host = `未確認` とする（実データに audit.md のみの Intent が 2 件存在する）。
