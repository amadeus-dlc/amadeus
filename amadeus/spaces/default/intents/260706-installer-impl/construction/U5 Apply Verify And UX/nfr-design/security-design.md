# Security Design — U5 Apply Verify And UX

> Stage: construction / nfr-design  
> Unit: U5 Apply Verify And UX

## Security Boundary

U5はU4が承認した `FileOperationPlan` を実行する境界である。`security-requirements.md` の通り、U5はpolicyを広げず、live target stateから新しいwrite permissionを推論しない。`canApply:false` はすべてのtarget mutationとmanifest writeを止める。

## Execution Controls

| Control | Design |
|---|---|
| no-write mutation block | `canApply:false` の場合は Reporter だけを呼び、File Applier と Manifest Store を呼ばない。 |
| no policy recalculation | U5はoperation `sourcePath`、`path`、`backupPath`、plan flagsだけを使う。snapshotやfile classを再計算しない。 |
| backup durability | `backup` が成功してから dependent `update` / `force-update` を開始する。 |
| prompt suppression | `--yes` / non-TTY / prompts disallowed では Prompt Adapter を呼ばない。 |
| declined confirmation | defaultはno-write。decline時はmutationとmanifest writeを行わない。 |
| manifest sequencing | `ApplyResult.ok === true` の後だけ atomic manifest write を開始する。 |
| verification safety | verificationはrepairしない。失敗checkを報告するだけにする。 |
| reporter minimization | file contents、environment dumps、secret-like valuesを出力しない。 |

## Operation Enforcement

`skip` と `conflict` はmutating operationではない。`backup` はtarget existing fileをbackup pathへ保存する。`add`、`update`、`force-update` はoperationに含まれる `sourcePath` からtarget pathへcopyする。

U5はU4が生成したoperation orderを尊重する。orderが不正に見える場合でもU5がpolicyで並べ替えず、PlanValidatorの責務としてfailさせる。U5 integration testsでは、正しいplanに対してorder通りにport callsが発生することを確認する。

## Manifest And Verification Trust

Manifest Storeはtemp fileをmanifest directoryに書き、renameで確定する。apply失敗時はmanifest writeを `not-started` にする。manifest write failure はfile-copy failureではなく `manifest-write-failed` として分類し、applied operationsとbackup recordsを報告する。

Verificationはmanifest entries、selected harness directory、tools directory、active-space memory shellだけを確認する。fresh installで runtime state / intent がないことは失敗にしない。

## Compliance And Auditability

U5は規制対象データを処理しないが、user customization preservation の証跡を扱う。pre-apply report、backup paths、applied operations、manifest path、verification check names を監査可能な形で保持し、file contentsは表示しない。

## Upstream Coverage

- `performance-requirements.md`: security controls は render/apply/manifest/verify のbounded pathで実行する。
- `security-requirements.md`: no-write prevention、policy recalculation禁止、backup ordering、prompt suppression、manifest sequencing、report minimization を設計した。
- `scalability-requirements.md`: single-target sequential apply と reporter scaling constraints を守る。
- `reliability-requirements.md`: no-write、declined confirmation、partial apply、manifest failure、verification failure を分類する。
- `tech-stack-decisions.md`: FileSystemPort、PromptPort、Reporter、atomic manifest adapter、no rollback 方針に従う。
- `business-logic-model.md`: Apply、Manifest、Verification、Reporter、Prompt workflows と integration boundaries に沿う。
