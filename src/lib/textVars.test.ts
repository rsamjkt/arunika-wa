import { describe, expect, it } from "vitest";
import { substituteVariables } from "./textVars";

describe("substituteVariables", () => {
  it("replaces {nama} with the recipient's name", () => {
    expect(substituteVariables("Halo {nama}!", { chatId: "628123@c.us", name: "Budi" })).toBe("Halo Budi!");
  });

  it("falls back to 'Pelanggan' when name is missing", () => {
    expect(substituteVariables("Halo {nama}!", { chatId: "628123@c.us" })).toBe("Halo Pelanggan!");
  });

  it("falls back to 'Pelanggan' when name is an empty string", () => {
    expect(substituteVariables("Halo {nama}!", { chatId: "628123@c.us", name: "" })).toBe("Halo Pelanggan!");
  });

  it("replaces {nomor} with digits-only from chatId", () => {
    expect(substituteVariables("No: {nomor}", { chatId: "628123456789@c.us" })).toBe("No: 628123456789");
  });

  it("strips all non-digit characters from chatId for {nomor}", () => {
    expect(substituteVariables("{nomor}", { chatId: "+62-812-3456-789@c.us" })).toBe("628123456789"); // digits only, "@c.us" contributes nothing
  });

  it("replaces multiple occurrences of the same variable", () => {
    expect(substituteVariables("{nama} {nama} {nama}", { chatId: "1@c.us", name: "A" })).toBe("A A A");
  });

  it("replaces both variables together", () => {
    expect(substituteVariables("Hai {nama}, no Anda {nomor}", { chatId: "6281@c.us", name: "Sri" })).toBe(
      "Hai Sri, no Anda 6281",
    );
  });

  it("leaves text with no placeholders untouched", () => {
    expect(substituteVariables("Tidak ada variabel di sini.", { chatId: "1@c.us", name: "X" })).toBe(
      "Tidak ada variabel di sini.",
    );
  });
});
