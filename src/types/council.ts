/**
 * 議会の質疑応答。事業データ(project.ts)とは別ファイルで持ち、projectId で紐づける。
 * 1つの質疑が複数の事業にまたがることがあるため、年度レコードには入れない。
 *
 * 出典は「気仙沼市議会だより」(市公式サイトで公開されているPDF)。
 * 議会だよりに載るのは質疑の要旨であり、全文ではない。
 */

/**
 * 答弁のその後。「実施しない」は、市が明確に否定的な答弁をした場合に使う
 * (「考えていません」等)。これを「未確認」に丸めると、はっきり示された方針が
 * 見えなくなるため区別する。
 */
export type AnswerStatus = "実施済" | "一部実施" | "継続検討" | "実施しない" | "未確認";

export type QaCategory = "一般質問" | "予算・決算審査の質疑" | "議案審議";

export interface CouncilQa {
  id: string;
  category: QaCategory;
  /** 議会だよりの号数 */
  issue: string;
  /** 第155回定例会 など。号によっては回次が判別できないため null を許す */
  session: string | null;
  /** 令和8年6月定例会 など、年月でわかる表記 */
  meetingLabel: string;
  /** 議会だよりの発行日 */
  publishedOn: string;
  /** 紙面の見出し */
  heading: string | null;
  /** 質問者。議案審議など個人に帰属しないものは null */
  speaker: string | null;
  question: string;
  answer: string | null;
  /**
   * 答弁のその後。原典から確認できない限り「未確認」のままにする
   * (「検討します」で終わった答弁を、勝手に「実施済」にしない)。
   */
  answerStatus: AnswerStatus;
  /** ステータスの根拠や補足。断定できない事情もここに書く */
  statusNote: string | null;
  relatedProjectIds: string[];
  sourceDocument: string;
  sourceUrl: string;
}
