import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const templatePath = path.join(root, "store-assets", "review-submit-email.template.txt");
const CREDENTIALS_PATH = path.join(homedir(), ".config", "cafe24", "credentials.json");

async function resolveCredentials() {
  let id = process.env.TEST_ADMIN_ID?.trim() ?? "";
  let pw = process.env.TEST_ADMIN_PW?.trim() ?? "";
  if (id && pw) return { id, pw };
  try {
    const raw = await readFile(CREDENTIALS_PATH, "utf8");
    const json = JSON.parse(raw);
    id = id || String(json.username ?? "").trim();
    pw = pw || String(json.password ?? "").trim();
  } catch {
    // fall through to the error below
  }
  return { id, pw };
}

const text = await readFile(templatePath, "utf8");
const lines = text.split("\n");
const subjectIndex = lines.findIndex((line) => line.trim() === "SUBJECT");
const bodyIndex = lines.findIndex((line) => line.trim() === "BODY");
if (subjectIndex === -1 || bodyIndex === -1 || bodyIndex < subjectIndex) {
  throw new Error("템플릿에 SUBJECT / BODY 표시가 필요합니다.");
}

const subject = (lines[subjectIndex + 1] ?? "").trim();
const body = lines.slice(bodyIndex + 1).join("\n").trimEnd();

const { id, pw } = await resolveCredentials();
const mall = process.env.TEST_MALL?.trim() || "onnurimun";
if (!id || !pw) {
  console.error("TEST_ADMIN_ID / TEST_ADMIN_PW가 없습니다. env 또는 ~/.config/cafe24/credentials.json에 설정하세요.");
  process.exit(1);
}

const rendered = body
  .replaceAll("{{TEST_MALL}}", mall)
  .replaceAll("{{TEST_ADMIN_ID}}", id)
  .replaceAll("{{TEST_ADMIN_PW}}", pw);

const output = `받는 사람: eco_bizops@cafe24corp.com\n보내는 사람: kwan765@naver.com\n\n제목:\n${subject}\n\n본문:\n${rendered}\n`;
const outPath = process.argv[2];
if (outPath) {
  await writeFile(outPath, output);
  console.log(`작성 완료: ${outPath}`);
} else {
  process.stdout.write(output);
}
