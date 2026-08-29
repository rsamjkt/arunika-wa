import { describe, expect, it } from "vitest";
import { parseAction } from "./aiAgent";

describe("parseAction", () => {
  it("aksi tool JSON polos", () => {
    expect(parseAction('{"tool":"cek_waktu","args":{}}')).toEqual({ type: "tool", name: "cek_waktu", args: {} });
  });
  it("aksi tool dengan args", () => {
    expect(parseAction('{"tool":"cari_pengetahuan","args":{"query":"harga"}}')).toEqual({
      type: "tool", name: "cari_pengetahuan", args: { query: "harga" },
    });
  });
  it("balasan final", () => {
    expect(parseAction('{"reply":"Halo kak!"}')).toEqual({ type: "reply", reply: "Halo kak!" });
  });
  it("toleran terhadap ```json fence", () => {
    expect(parseAction('```json\n{"reply":"hai"}\n```')).toEqual({ type: "reply", reply: "hai" });
  });
  it("toleran teks pembungkus di sekitar JSON", () => {
    expect(parseAction('Baik, ini: {"tool":"cek_jam_buka","args":{}} ya')).toEqual({
      type: "tool", name: "cek_jam_buka", args: {},
    });
  });
  it("bukan aksi valid → none", () => {
    expect(parseAction("halo apa kabar")).toEqual({ type: "none" });
  });
});
