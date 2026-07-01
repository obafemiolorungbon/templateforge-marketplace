import fs from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";
import mjml2html from "mjml";
import { chromium } from "playwright";

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listTemplateFiles() {
  const entries = await fs.readdir("templates", { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join("templates", entry.name));
}

async function renderTemplate(browser, templatePath) {
  const template = JSON.parse(await fs.readFile(templatePath, "utf8"));
  const hydratedMjml = Handlebars.compile(template.mjml, { noEscape: true })(template.sampleVariables ?? {});
  const result = await mjml2html(hydratedMjml, { validationLevel: "strict" });
  const errors = typeof result === "object" ? result.errors ?? [] : [];
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.formattedMessage).join("\n"));
  }
  const html = typeof result === "string" ? result : result.html;
  if (!html) throw new Error(`MJML compiler did not return HTML for ${templatePath}.`);

  const previewPath = path.join("previews", `${template.id}@${template.version}.png`);
  await fs.mkdir(path.dirname(previewPath), { recursive: true });

  const page = await browser.newPage({ viewport: { width: 720, height: 1100 } });
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.screenshot({ path: previewPath, fullPage: true });
  } finally {
    await page.close();
  }

  return previewPath;
}

const explicitFiles = process.argv.slice(2).filter((file) => file.endsWith(".json"));
const templateFiles = explicitFiles.length > 0 ? explicitFiles : await listTemplateFiles();
if (templateFiles.length === 0) throw new Error("No template JSON files found.");

const browser = await chromium.launch();
try {
  for (const templatePath of templateFiles) {
    if (!(await pathExists(templatePath))) throw new Error(`Template file does not exist: ${templatePath}`);
    const previewPath = await renderTemplate(browser, templatePath);
    console.log(`Rendered ${previewPath}`);
  }
} finally {
  await browser.close();
}
