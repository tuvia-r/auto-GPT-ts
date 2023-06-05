import { CommandDecorator } from "./command";
import * as puppeteer from "puppeteer";
import { parse } from 'node-html-parser';
import { summarizeText } from "../processing/text";
import { extractHyperlinks } from "../processing/html";
import * as fs from 'fs';
import { isValidUrl, sanitizeUrl } from "../url-utils/validators";
import { getLogger } from "../logging";

const logger = getLogger("browse-web");

@CommandDecorator({
    name: 'browseWebsite',
    description: 'Browse Website',
    signature: '"url": string, "question": string'
})
export class BrowseWebsiteCommand {
    static async browseWebsite(url: string, question: string) {
      if(!isValidUrl(url)) {
        return `Error: Please provide a valid url.`
      }
        const { text, links } = await scrapeText(url, question);
        return `Answer gathered from website: ${text} \n \n Links: ${links}`

    }
}

@CommandDecorator({
  name: "getTextSummary",
  description: "Get a summary of the text",
  signature: '"url": string, "question": string',
})
export class GetTextSummary {
  static async getTextSummary(url: string, question: string) {
    if (!isValidUrl(url)) {
      return `Error: URL is not valid`;
    }
    const { text } = await scrapeText(url, question);
    return `"" "Result" : ${text}""`;
  }
}

@CommandDecorator({
  name: "getHyperlinks",
  description: "Get a list of hyperlinks from a webpage",
  signature: '"url": string',
})
export class GetHyperlinks {
  static async getHyperlinks(url: string) {
    if (!isValidUrl(url)) {
      return `Error: URL is not valid`;
    }
    const { links } = await scrapeText(url, "");
    return `"" "Result" : ${links}""`;
  }
}


export async function scrapeText(url: string, question: string) {
    const browser = await puppeteer.launch({ 
        // headless: true,
        headless: false,
        timeout: 20000,
        ignoreHTTPSErrors: true,
        slowMo: 0,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--window-size=1280,720',
        ],
     });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setRequestInterception(true);
    page.on('request', (interceptedRequest) => {
        const blockResources = ['image', 'media', 'font'];
        if (blockResources.includes(interceptedRequest.resourceType())) {
          interceptedRequest.abort();
        } else {
          interceptedRequest.continue();
        }
      });
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
      );
    page.evaluateOnNewDocument(fs.readFileSync(require.resolve('./page-overlay.js'), 'utf8'));
    logger.info(`Scraping url: ${url}`);
    await page.goto(url, {
        waitUntil: "networkidle2",
    });
    const html = await page.content();

    const root = parse(html);
    const text = await summarizeText(url, root.structuredText, question, page);
    const links = extractHyperlinks(root.querySelectorAll('a') as any, url);
    await browser.close();

    return {
        text,
        links
    }
}