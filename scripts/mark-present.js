import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
const cronSecret = process.env.CRON_SECRET;

async function main() {
  if (!cronSecret) {
    console.error("CRON_SECRET is required in .env.local");
    process.exit(1);
  }

  const res = await fetch(`${baseUrl}/api/cron/mark-present`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(data.error || "Request failed");
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
