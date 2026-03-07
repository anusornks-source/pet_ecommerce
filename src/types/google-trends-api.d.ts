declare module "google-trends-api" {
  interface TrendsOptions {
    keyword?: string;
    geo?: string;
    category?: number;
    startTime?: Date;
    endTime?: Date;
    hl?: string;
  }

  function relatedQueries(options: TrendsOptions): Promise<string>;
  function relatedTopics(options: TrendsOptions): Promise<string>;
  function interestOverTime(options: TrendsOptions): Promise<string>;
  function interestByRegion(options: TrendsOptions): Promise<string>;
  function dailyTrends(options: { geo?: string }): Promise<string>;
  function realTimeTrends(options: { geo?: string; category?: string }): Promise<string>;
  function autoComplete(options: { keyword: string }): Promise<string>;
}
