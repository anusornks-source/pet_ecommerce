import puppeteer from "puppeteer";

export interface TikTokTopProduct {
  productName: string;
  productImage: string | null;
  category: string | null;
  sourceUrl: string | null;
  salesVolume: string | null;
}

export async function scrapeTikTokTopProducts(
  region: string = "TH",
  period: string = "7",
  limit: number = 20,
  lang: string = "en"
): Promise<{ products: TikTokTopProduct[]; error?: string }> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1440, height: 900 });

    const url = `https://ads.tiktok.com/business/creativecenter/inspiration/topproducts/pc/${lang}?period=${period}&region=${region}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });

    // Wait longer for SPA to render content
    await new Promise((r) => setTimeout(r, 5000));

    // Try scrolling to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, 500));
    await new Promise((r) => setTimeout(r, 2000));
    await page.evaluate(() => window.scrollTo(0, 1000));
    await new Promise((r) => setTimeout(r, 2000));

    // Extract products from the page
    const products = await page.evaluate((lim: number) => {
      const results: {
        productName: string;
        productImage: string | null;
        category: string | null;
        sourceUrl: string | null;
        salesVolume: string | null;
      }[] = [];

      // Strategy 1: Table rows
      const rows = document.querySelectorAll("table tbody tr, [class*='TableRow']");
      if (rows.length > 0) {
        rows.forEach((row) => {
          if (results.length >= lim) return;
          const nameEl = row.querySelector("td:nth-child(2), [class*='name'], [class*='title']");
          const imgEl = row.querySelector("img");
          const name = nameEl?.textContent?.trim() || "";
          if (!name) return;
          results.push({
            productName: name,
            productImage: imgEl?.src || null,
            category: row.querySelector("[class*='category'], [class*='tag']")?.textContent?.trim() || null,
            sourceUrl: (row.querySelector("a") as HTMLAnchorElement)?.href || null,
            salesVolume: row.querySelector("[class*='sale'], [class*='volume']")?.textContent?.trim() || null,
          });
        });
      }

      // Strategy 2: Card-based layout
      if (results.length === 0) {
        const cards = document.querySelectorAll("[class*='ProductCard'], [class*='product-card'], [class*='cardItem']");
        cards.forEach((card) => {
          if (results.length >= lim) return;
          const name = card.querySelector("[class*='name'], [class*='title'], h3, h4")?.textContent?.trim() || "";
          if (!name) return;
          results.push({
            productName: name,
            productImage: (card.querySelector("img") as HTMLImageElement)?.src || null,
            category: card.querySelector("[class*='category'], [class*='tag']")?.textContent?.trim() || null,
            sourceUrl: (card.querySelector("a") as HTMLAnchorElement)?.href || null,
            salesVolume: card.querySelector("[class*='sale'], [class*='volume'], [class*='sold']")?.textContent?.trim() || null,
          });
        });
      }

      // Strategy 3: Generic list items
      if (results.length === 0) {
        const items = document.querySelectorAll("[class*='list'] > div, [class*='grid'] > div");
        items.forEach((item) => {
          if (results.length >= lim) return;
          const name = item.querySelector("span, p, h3, h4")?.textContent?.trim() || "";
          if (!name || name.length < 3) return;
          results.push({
            productName: name,
            productImage: (item.querySelector("img") as HTMLImageElement)?.src || null,
            category: null,
            sourceUrl: (item.querySelector("a") as HTMLAnchorElement)?.href || null,
            salesVolume: null,
          });
        });
      }

      return results.slice(0, lim);
    }, limit);

    // Debug: if no products found, dump page info
    if (products.length === 0) {
      const pageTitle = await page.title();
      const pageUrl = page.url();
      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 1000) || "");
      const htmlSnippet = await page.evaluate(() => {
        // Look for any elements that might contain products
        const main = document.querySelector("main, [id='app'], [class*='content'], [class*='main']");
        return main?.innerHTML?.slice(0, 2000) || document.body?.innerHTML?.slice(0, 2000) || "";
      });
      // Count elements for debugging
      const counts = await page.evaluate(() => ({
        tables: document.querySelectorAll("table").length,
        imgs: document.querySelectorAll("img").length,
        divs: document.querySelectorAll("div").length,
        links: document.querySelectorAll("a").length,
      }));

      return {
        products: [],
        error: `No products found. URL: ${pageUrl}\nTitle: "${pageTitle}"\nElements: ${JSON.stringify(counts)}\nBody: ${bodyText.slice(0, 300)}`,
        _debug: { htmlSnippet: htmlSnippet.slice(0, 3000) },
      };
    }

    return { products };
  } catch (err) {
    return {
      products: [],
      error: err instanceof Error ? err.message : "Scraping failed",
    };
  } finally {
    if (browser) await browser.close();
  }
}
