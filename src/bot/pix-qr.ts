import QRCode from "qrcode";

function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(
  pixKey: string,
  merchantName: string,
  merchantCity: string,
  amount?: number
): string {
  const mai =
    emv("00", "BR.GOV.BCB.PIX") +
    emv("01", pixKey);

  const additionalData = emv("05", "***");

  let payload =
    emv("00", "01") +
    emv("26", mai) +
    emv("52", "0000") +
    emv("53", "986") +
    (amount !== undefined ? emv("54", amount.toFixed(2)) : "") +
    emv("58", "BR") +
    emv("59", merchantName.slice(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "")) +
    emv("60", merchantCity.slice(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "")) +
    emv("62", additionalData) +
    "6304";

  return payload + crc16(payload);
}

export async function generatePixQrBuffer(
  pixKey: string,
  merchantName: string,
  amount?: number
): Promise<Buffer> {
  const payload = buildPixPayload(pixKey, merchantName, "Brasil", amount);
  return await QRCode.toBuffer(payload, {
    type: "png",
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}
