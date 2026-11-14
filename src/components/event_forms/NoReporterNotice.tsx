type NoReporterNoticeProps = {
  /** "エンジニア" / "ドクター" */
  readonly roleName: string;
  readonly onCancel: () => void;
};

/**
 * 調査・医療報告をできる生存CO者がいないときの案内。
 * CO していない人の報告として誤って登録されないよう、入力欄そのものを出さない
 */
export function NoReporterNotice(
  { roleName, onCancel }: NoReporterNoticeProps,
) {
  return (
    <div>
      <div className="no-reporter-notice" role="status">
        <p>
          生存している{roleName}CO者がいないため、報告を入力できません。
        </p>
        <p className="no-reporter-notice-hint">
          {roleName}COがまだ記録されていない場合は、先に「＋{" "}
          {roleName}CO」から名乗り出を記録してください。
        </p>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "1.2rem",
        }}
      >
        <button
          type="button"
          className="btn"
          command="close"
          commandfor="add-event-dialog"
          onClick={onCancel}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
