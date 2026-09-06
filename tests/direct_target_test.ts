import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isDirectTarget, normalizeDirectTarget } from "../src/core/direct_target.ts";

Deno.test("isDirectTarget - recognizes canonical YouTube watch URLs", () => {
  assertEquals(isDirectTarget("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("https://youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("http://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s"), true);
});

Deno.test("isDirectTarget - recognizes short URLs (youtu.be/...)", () => {
  assertEquals(isDirectTarget("https://youtu.be/dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("http://youtu.be/dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("youtu.be/dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("https://youtu.be/dQw4w9WgXcQ?t=10s"), true);
  assertEquals(isDirectTarget("https://youtu.be/dQw4w9WgXcQ?si=12345"), true);
});

Deno.test("isDirectTarget - recognizes mobile URLs (m.youtube.com/...)", () => {
  assertEquals(isDirectTarget("https://m.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("http://m.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("m.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("https://m.youtube.com/shorts/dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("m.youtube.com/shorts/dQw4w9WgXcQ"), true);
});

Deno.test("isDirectTarget - recognizes shorts URLs (youtube.com/shorts/...)", () => {
  assertEquals(isDirectTarget("https://www.youtube.com/shorts/dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("http://www.youtube.com/shorts/dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("https://youtube.com/shorts/dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("youtube.com/shorts/dQw4w9WgXcQ"), true);
  assertEquals(isDirectTarget("www.youtube.com/shorts/dQw4w9WgXcQ"), true);
});

Deno.test("isDirectTarget - rejects non-URL strings and invalid targets", () => {
  assertEquals(isDirectTarget("never gonna give you up"), false);
  assertEquals(isDirectTarget("rick astley"), false);
  assertEquals(isDirectTarget("dQw4w9WgXcQ"), false);
  assertEquals(isDirectTarget("https://google.com"), false);
  assertEquals(isDirectTarget("https://vimeo.com/12345"), false);
  assertEquals(isDirectTarget("https://youtube.com"), false);
  assertEquals(isDirectTarget("https://youtube.com/"), false);
  assertEquals(isDirectTarget("https://m.youtube.com"), false);
  assertEquals(isDirectTarget("https://youtube.com/watch"), false);
  assertEquals(isDirectTarget("https://youtube.com/watch?v="), false);
  assertEquals(isDirectTarget("https://youtube.com/watch?other=123"), false);
  assertEquals(isDirectTarget("https://youtu.be/"), false);
  assertEquals(isDirectTarget("https://youtube.com/shorts/"), false);
  assertEquals(isDirectTarget("youtube.com"), false);
  assertEquals(isDirectTarget("m.youtube.com"), false);
  assertEquals(isDirectTarget("https://notyoutube.com/watch?v=dQw4w9WgXcQ"), false);
  assertEquals(isDirectTarget("https://youtube.com.attacker.com/watch?v=dQw4w9WgXcQ"), false);
  assertEquals(isDirectTarget("ftp://youtube.com/watch?v=dQw4w9WgXcQ"), false);
});

Deno.test("normalizeDirectTarget - prefixes https:// when missing and preserves existing scheme", () => {
  assertEquals(
    normalizeDirectTarget("youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
  );
  assertEquals(
    normalizeDirectTarget("youtu.be/dQw4w9WgXcQ"),
    "https://youtu.be/dQw4w9WgXcQ",
  );
  assertEquals(
    normalizeDirectTarget("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  );
  assertEquals(
    normalizeDirectTarget("http://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
  );
  assertEquals(
    normalizeDirectTarget("  https://youtu.be/dQw4w9WgXcQ  "),
    "https://youtu.be/dQw4w9WgXcQ",
  );
});
