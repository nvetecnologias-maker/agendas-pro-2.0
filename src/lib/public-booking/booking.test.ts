import { describe, expect, it } from "vitest";
import { brandColor, onBrand, shopAddress, mapsLink } from "./types";
import { buildIcs, googleCalendarLink } from "../ics";

describe("cor da marca", () => {
  it("usa o azul da plataforma quando não há cor válida", () => {
    expect(brandColor(null)).toBe("#2467F2");
    expect(brandColor({ primary: "red" })).toBe("#2467F2");
    expect(brandColor({ primary: "#C9A227" })).toBe("#C9A227");
  });
  it("escolhe texto legível sobre a cor", () => {
    expect(onBrand("#2467F2")).toBe("#FFFFFF");
    expect(onBrand("#000000")).toBe("#FFFFFF");
    expect(onBrand("#F5D76E")).toBe("#030B20");
    expect(onBrand("#FFFFFF")).toBe("#030B20");
  });
});

describe("endereço", () => {
  it("monta linhas e link de mapa", () => {
    const s = { address_street: "Rua A", address_number: "10", address_district: "Centro", address_city: "Santos", address_state: "SP" };
    expect(shopAddress(s).full).toBe("Rua A, 10 · Centro · Santos - SP");
    expect(mapsLink(s)).toContain(encodeURIComponent("Rua A, 10, Centro, Santos, SP"));
    expect(mapsLink({})).toBeNull();
  });
});

describe("calendário", () => {
  const ev = { uid: "abc", title: "Corte; barba, já", start: "2030-03-04T13:00:00Z", end: "2030-03-04T13:40:00Z", location: "Rua A, 10" };
  it("gera .ics válido em UTC com escapes", () => {
    const ics = buildIcs(ev);
    expect(ics).toContain("DTSTART:20300304T130000Z");
    expect(ics).toContain("DTEND:20300304T134000Z");
    expect(ics).toContain("SUMMARY:Corte\\; barba\\, já");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
  });
  it("gera link do Google Agenda", () => {
    expect(googleCalendarLink(ev)).toContain("dates=20300304T130000Z%2F20300304T134000Z");
  });
});
