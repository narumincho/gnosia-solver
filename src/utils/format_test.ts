import { assertEquals } from "@std/assert";
import { formatWithSpaces } from "./format.ts";

Deno.test("formatWithSpaces - 3桁ごとにスペースで区切る", () => {
  assertEquals(formatWithSpaces(0), "0");
  assertEquals(formatWithSpaces(304), "304");
  assertEquals(formatWithSpaces(1000), "1 000");
  assertEquals(formatWithSpaces(908107200), "908 107 200");
  assertEquals(formatWithSpaces(-12345), "-12 345");
});
