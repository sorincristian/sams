import { execSync } from 'child_process';
try {
  execSync('npx prisma validate', { stdio: 'pipe', encoding: 'utf-8' });
  console.log("VALID!");
} catch (e) {
  console.log("ERR:", e.message);
  console.log("STDOUT:", e.stdout);
  console.log("STDERR:", e.stderr);
}
