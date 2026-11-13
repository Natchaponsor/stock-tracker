import { describe, expect, it } from "vitest";
import { guessDeviceName } from "../sync/device";

describe("guessDeviceName", () => {
  it("names common devices by platform and browser", () => {
    expect(
      guessDeviceName(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("iPhone · Safari");
    expect(
      guessDeviceName(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
      )
    ).toBe("Mac · Chrome");
    expect(
      guessDeviceName(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0"
      )
    ).toBe("Windows · Edge");
    expect(guessDeviceName("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36")).toBe(
      "Android · Chrome"
    );
    expect(guessDeviceName("curl/8")).toBe("This device");
  });
});
