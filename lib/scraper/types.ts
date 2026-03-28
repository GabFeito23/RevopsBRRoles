export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  externalId: string;
  dateFound: string; // ISO date string YYYY-MM-DD
}
