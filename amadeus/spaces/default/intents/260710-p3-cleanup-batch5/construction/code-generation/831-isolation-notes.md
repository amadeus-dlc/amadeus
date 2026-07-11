# WIP: #831 t76 test 12 フレーク 切り分けメモ(未完・レートリミット接近で一時停止)

対象: `tests/unit/t76.test.ts` test 12(:626-654)がフルスイート並列負荷下で exit 0 へ反転する間欠フレーク。

停止時点の状態: 切り分け途中。**修正は未実装**(分岐未確定のため何も変更していない)。

## Step 0 再接地
- batch5 requirements.md は origin/main に未マージ(RE scan-notes のみ存在)。scan-notes + Issue #831 の3クロスレビューコメントを一次情報として使用。乖離なし。

## 実測で確定した事実(コード実読 + 実行)

### 反証済み(分岐 (i) cursor divergence は成立しない)
- fixture は active-intent cursor を **静的ファイルとして決定的に seed** する:
  `tests/harness/fixtures.ts:187` = `writeFileSync(join(intentsDir, "active-intent"), \`${DEFAULT_RECORD_DIR}\n\`)`。
- 各 fixture の proj は一意 mkdtemp。merge subprocess はこの静的 cursor を読むため、テストが植える `auditLockDir(proj, DEFAULT_RECORD_DIR, DEFAULT_SPACE)` と **必ず同一 bucket** を解決する。
- 並列負荷下でも cursor はプロセス間共有されない(proj ごとに独立ファイル)。→ **分岐 (i)「intent bucket divergence で別 lockDir」は機序として成立しない。**
- 補足: `auditLockIdentity`(amadeus-lib.ts:2790-2796)は intent 指定時に **activeIntent() を一切参照しない**(コメント明記)。cursor 解決の非決定性は入り込まない。

### 反証済み(分岐 (ii) staleness/timeOrigin マージンは既定設定で成立しない)
- `lockAcquireEpochMs()`(amadeus-lib.ts:2845-2847)= `Math.floor(performance.timeOrigin + performance.now())`。
  scratch 実測(`bun epoch.ts` ×3)で `performance.timeOrigin + performance.now()` は `Date.now()` と **diff=0**(クロスプロセスで wall-clock 近似が一致)。
- テスト植込みの owner は `pid=process.pid`(テストランナー=生存)+ `startedAtMs=nowMs`(fresh)。
- 既定 `DEFAULT_LOCK_STALE_MS = 10*60*1000`(amadeus-lib.ts:2775)。merge の retry 予算は ~5s。5s では 10分閾値に到達しないため、reaper の「live-but-over-age」steal は既定設定では発火しない(`reapStaleLock` :2988-2990 で `<= lockStaleMs()` → return false)。
- **env リーク説の反証**: `t161-per-intent-lock-reaper.test.ts:136` は `AMADEUS_LOCK_STALE_MS="1000"` を設定するが、`tests/run-tests.ts` は各テストファイルを **独立 bun プロセス**で spawn(`runSpawnCapture`/`spawn` :708、env は親の process.env コピー)。t161 のプロセスローカルな env 変更は t76 プロセスへも t76 が spawn する merge subprocess へも伝播しない。→ **分岐 (ii) は既定設定では非該当。**

## 最有力の真機序(分岐 (i)(ii) いずれでもない第3機序 — 要プロダクト変更の疑い)

Issue #831 の e2 クロスレビューが指摘した機序がコード上成立する:

1. `auditLockDir`(:2798-2802)は `join(tmpdir(), \`.amadeus-audit-${md5(identity)[:8]}.lock\`)`。
   ハッシュは **md5 先頭8hex = 32bit**。identity は `projectDir\x00space\x00intent`。
   全 fixture・全 subprocess は **同一 tmpdir を共有**するため、別 fixture(別 projectDir)の identity が
   32bit 空間で衝突すると **同一 lockDir パス**を指す(birthday、run あたり低確率=希少フレークと整合)。
2. `releaseAuditLock`(:3057-3070)は **owner stamp を検証せず無条件 `rmSync(lockDir, {recursive, force})`**。
   衝突相手プロセスが release すると、テスト12が植えた lockDir ごと削除される。
3. 削除直後、merge の次 `mkdirSync(lockDir)` が初回で成功 → merge 成功 → `expect(r.status).not.toBe(0)` が 0 で fail(= 観測された exit0 反転の向きと一致)。

この機序は **releaseAuditLock の stamp 無検証 + 8hex/32bit ハッシュの衝突可能性**というプロダクト defect 起因。
テスト専用変更(cursor pin / タイムスタンプ定数化)では閉包しない可能性が高い。

## 停止時点の暫定結論(要 leader/選挙判断)
- 分岐 (i)(ii) はいずれも既定設定で **非該当**(実測で反証)。
- タスクの指示に従えば「両分岐とも非該当 → 停止して切り分け結果を報告」に該当。
- かつ最有力機序はプロダクトコード変更を要する疑いが濃厚 → タスクの停止条件「プロダクトコード変更が必要と判明したら実装せず停止して報告」にも該当。
- **未実施の実証**: 衝突機序の決定的再現(md5 8hex 衝突 preimage を brute-force して release 削除を実演、または --ci 反復での自然再現+lockDir 消失ログ)は未実施(レートリミット接近で中断)。再開時に実施予定。

## 再開時の TODO
1. 衝突機序を決定的に実証するスクラッチハーネス(repo 外、CLAUDE_PROJECT_DIR 明示):
   - proj A に lock 植込み → 同一 8hex に衝突する proj B を preimage 探索 → B の releaseAuditLock が A の dir を消すことを実演。
2. 実証が取れたら「テスト専用変更では閉包不可・要プロダクト修正」を選挙へ上程(修正方向: releaseAuditLock の owner-stamp guard 追加、または lockDir ハッシュ幅拡大)。
3. 逆に自然再現ログで別機序が判明したらそれに従う。
