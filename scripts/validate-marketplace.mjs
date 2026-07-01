import fs from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";
import mjml2html from "mjml";

const variablePattern = /{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g;
const secretPattern = /(sk-[a-z0-9]{16,}|api[_-]?key|secret|token|password|private[_-]?key|bearer\s+[a-z0-9._-]+)/i;

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

function collectVariables(text) {
  const names = new Set();
  for (const match of text.matchAll(variablePattern)) names.add(match[1]);
  return names;
}

function requireString(template, key, errors) {
  if (typeof template[key] !== "string" || String(template[key]).length === 0) {
    errors.push(`${template.id ?? "template"} missing string ${key}.`);
  }
}

async function validateTemplate(file) {
  const errors = [];
  const warnings = [];
  let template;

  try {
    template = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    return { errors: [`${file} failed to parse: ${String(error)}`], warnings };
  }

  for (const key of ["schemaVersion", "id", "slug", "name", "version", "category", "subject", "useCase", "description", "mjml", "text", "preview", "author", "license"]) {
    requireString(template, key, errors);
  }
  if (!Array.isArray(template.tags)) errors.push(`${template.id} tags must be an array.`);
  if (!Array.isArray(template.variables)) errors.push(`${template.id} variables must be an array.`);
  if (!template.sampleVariables || typeof template.sampleVariables !== "object") errors.push(`${template.id} sampleVariables must be an object.`);
  if (!Array.isArray(template.warnings)) errors.push(`${template.id} warnings must be an array.`);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(template.id)) errors.push(`${template.id} id must be kebab-case.`);
  if (template.slug !== template.id) errors.push(`${template.id} slug must match id.`);
  if (path.basename(file) !== `${template.id}@${template.version}.json`) errors.push(`${file} must be named ${template.id}@${template.version}.json.`);
  if (template.preview !== `previews/${template.id}@${template.version}.png`) errors.push(`${template.id} preview path is invalid.`);

  const combined = `${template.subject}\n${template.mjml}\n${template.text}`;
  if (combined.includes("{{{") || combined.includes("}}}")) errors.push(`${template.id} uses unsafe triple braces.`);

  const declared = new Set((template.variables ?? []).map((variable) => variable.name));
  for (const used of collectVariables(combined)) {
    if (!declared.has(used)) errors.push(`${template.id} uses undeclared variable {{${used}}}.`);
  }

  for (const variable of template.variables ?? []) {
    if (!/^[a-z][a-z0-9_]*$/.test(variable.name)) errors.push(`${template.id} variable ${variable.name} must be snake_case.`);
    if (variable.required !== false && template.sampleVariables?.[variable.name] === undefined) {
      errors.push(`${template.id} missing sampleVariables.${variable.name}.`);
    }
  }

  for (const [name, value] of Object.entries(template.sampleVariables ?? {})) {
    if (secretPattern.test(String(value))) errors.push(`${template.id} sample variable ${name} looks unsafe.`);
  }

  try {
    const hydratedMjml = Handlebars.compile(template.mjml, { noEscape: true })(template.sampleVariables ?? {});
    const result = await mjml2html(hydratedMjml, { validationLevel: "strict" });
    const mjmlErrors = typeof result === "object" ? result.errors ?? [] : [];
    if (mjmlErrors.length > 0) errors.push(...mjmlErrors.map((error) => `${template.id} MJML: ${error.formattedMessage}`));
    const html = typeof result === "string" ? result : result.html;
    if (!html) errors.push(`${template.id} MJML compiler did not return HTML.`);
    if (html && /{{\s*[^}]+\s*}}/.test(html)) errors.push(`${template.id} rendered HTML still has unresolved variables.`);
  } catch (error) {
    errors.push(`${template.id} MJML compile failed: ${String(error)}`);
  }

  if (!(await pathExists(template.preview))) errors.push(`${template.id} preview missing: ${template.preview}.`);
  if (template.text.trim().length < 40) warnings.push(`${template.id} text fallback is very short.`);

  return { template, errors, warnings };
}

const errors = [];
const warnings = [];
const manifest = JSON.parse(await fs.readFile("manifest.json", "utf8"));
if (typeof manifest.schemaVersion !== "string") errors.push("manifest schemaVersion is required.");
if (!Array.isArray(manifest.templates)) errors.push("manifest templates must be an array.");

const files = await listTemplateFiles();
const seenIds = new Set();
const seenSlugs = new Set();

for (const file of files) {
  const result = await validateTemplate(file);
  errors.push(...result.errors);
  warnings.push(...result.warnings);
  if (!result.template) continue;

  if (seenIds.has(result.template.id)) errors.push(`Duplicate template id: ${result.template.id}.`);
  if (seenSlugs.has(result.template.slug)) errors.push(`Duplicate template slug: ${result.template.slug}.`);
  seenIds.add(result.template.id);
  seenSlugs.add(result.template.slug);

  const relative = file.replaceAll("\\", "/");
  const entry = manifest.templates?.find((item) => item.id === result.template.id);
  if (!entry) {
    errors.push(`manifest missing ${result.template.id}.`);
    continue;
  }
  if (entry.url !== relative) errors.push(`manifest url for ${result.template.id} must be ${relative}.`);
  if (entry.preview !== result.template.preview) errors.push(`manifest preview for ${result.template.id} must be ${result.template.preview}.`);
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(1);
}

console.log(`Marketplace validation passed for ${files.length} templates.`);
