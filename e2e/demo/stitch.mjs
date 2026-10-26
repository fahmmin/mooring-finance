// Turns the screencast frames saved by demo.spec.ts into a 25 fps WebM, holding each frame until the next repaint.
// Uses the ffmpeg Playwright downloads for its own video recording. Run: node demo/stitch.mjs
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "demo-output");
const frames = JSON.parse(fs.readFileSync(path.join(OUT, "frames.json"), "utf8"));
const root = path.join(os.homedir(), "AppData", "Local", "ms-playwright");
// several Playwright versions may be installed; newer ffmpeg builds drop the VP8 encoder, so pick one that has it
const ffmpeg = fs.readdirSync(root).filter((d) => d.startsWith("ffmpeg")).sort().reverse()
  .map((d) => path.join(root, d, fs.readdirSync(path.join(root, d)).find((f) => f.startsWith("ffmpeg"))))
  .find((exe) => /libvpx\s+libvpx VP8/.test(spawnSync(exe, ["-hide_banner", "-encoders"]).stdout.toString()));
if (!ffmpeg) throw new Error("No Playwright ffmpeg with a VP8 encoder found; run npx playwright install ffmpeg");

const video = path.join(OUT, "mooring-live-demo.webm");
// scale+pad keeps every frame 1280x720 even if one page painted at another size
const ff = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", "25", "-i", "pipe:0",
  "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2", "-y", "-an", "-c:v", "libvpx", "-b:v", "3M", video],
  { stdio: ["pipe", "inherit", "inherit"] });
const exited = new Promise((r) => ff.on("close", r));

const t0 = frames[0].t, last = frames.at(-1).t + 2;
let i = 0;
for (let t = t0; t < last; t += 1 / 25) {
  while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
  if (!ff.stdin.write(fs.readFileSync(frames[i].file))) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end();
const code = await exited;
if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
console.log("video:", video, `${Math.round(last - t0)}s`);
