// Minimal Static PIX BR Code generator (EMV/MPM).
// Replaces `pix-utils` which pulls axios/Buffer and breaks Worker bundling.

function tag(id: string, value: string) {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type StaticPixInput = {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  transactionAmount?: number;
  txid?: string;
  infoAdicional?: string;
};

export type StaticPix = {
  toBRCode: () => string;
};

export type PixError = { error: true; message: string };

export function hasError<T>(v: T | PixError): v is PixError {
  return !!v && typeof v === "object" && (v as any).error === true;
}

export function createStaticPix(input: StaticPixInput): StaticPix | PixError {
  const { pixKey, merchantName, merchantCity, transactionAmount, txid, infoAdicional } = input;
  if (!pixKey) return { error: true, message: "pixKey is required" };
  if (!merchantName) return { error: true, message: "merchantName is required" };
  if (merchantName.length > 25) return { error: true, message: "merchantName > 25" };
  if (!merchantCity) return { error: true, message: "merchantCity is required" };
  if (merchantCity.length > 15) return { error: true, message: "merchantCity > 15" };

  return {
    toBRCode: () => {
      const gui = tag("00", "br.gov.bcb.pix");
      const key = tag("01", pixKey);
      const info = infoAdicional ? tag("02", infoAdicional) : "";
      const merchantAccount = tag("26", gui + key + info);

      const payloadFormat = tag("00", "01");
      const merchantCategory = tag("52", "0000");
      const currency = tag("53", "986");
      const amount =
        transactionAmount && transactionAmount > 0
          ? tag("54", transactionAmount.toFixed(2))
          : "";
      const country = tag("58", "BR");
      const name = tag("59", merchantName);
      const city = tag("60", merchantCity);
      const additional = tag("62", tag("05", txid && txid.length ? txid.slice(0, 25) : "***"));

      const partial =
        payloadFormat +
        merchantAccount +
        merchantCategory +
        currency +
        amount +
        country +
        name +
        city +
        additional +
        "6304";

      return partial + crc16(partial);
    },
  };
}
