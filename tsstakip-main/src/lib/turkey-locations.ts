import rawTurkeyLocations from "@/lib/turkey-locations.json";

type RawDistrict = {
  id: number;
  name: string;
};

type RawCity = {
  id: number;
  name: string;
  districts: RawDistrict[];
};

export type TurkeyDistrict = {
  code: string;
  name: string;
};

export type TurkeyCity = {
  code: string;
  name: string;
  districts: TurkeyDistrict[];
};

function toTitleCase(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

export function normalizeLocationKey(value: string | null | undefined) {
  if (!value) return "";

  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "");
}

export const TURKEY_CITIES: TurkeyCity[] = (rawTurkeyLocations as RawCity[]).map((city) => ({
  code: String(city.id).padStart(2, "0"),
  name: toTitleCase(city.name),
  districts: city.districts.map((district) => ({
    code: `${String(city.id).padStart(2, "0")}-${String(district.id).padStart(3, "0")}`,
    name: toTitleCase(district.name),
  })),
}));

const TURKEY_CITY_BY_CODE = new Map(
  TURKEY_CITIES.map((city) => [city.code, city]),
);

const TURKEY_CITY_BY_KEY = new Map(
  TURKEY_CITIES.map((city) => [normalizeLocationKey(city.name), city]),
);

export function findTurkeyCity(input: string | null | undefined) {
  if (!input) return null;

  return (
    TURKEY_CITY_BY_CODE.get(input.trim()) ??
    TURKEY_CITY_BY_KEY.get(normalizeLocationKey(input)) ??
    null
  );
}

export function getTurkeyDistrictsByCityCode(cityCode: string | null | undefined) {
  return cityCode ? TURKEY_CITY_BY_CODE.get(cityCode)?.districts ?? [] : [];
}

export function findTurkeyDistrict(cityCode: string | null | undefined, districtName: string | null | undefined) {
  if (!cityCode || !districtName) return null;

  const districtKey = normalizeLocationKey(districtName);
  return getTurkeyDistrictsByCityCode(cityCode).find(
    (district) => normalizeLocationKey(district.name) === districtKey,
  ) ?? null;
}
