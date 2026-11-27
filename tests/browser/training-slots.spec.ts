import { test, expect } from "@playwright/test";
const trackId = "11111111-1111-4111-8111-111111111111";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("equiflow-lang-v2", "vi"),
  );
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/tracks")
      ? [
          {
            id: trackId,
            name: "Sân cỏ chính",
            code: "TURF-1",
            surface: "TURF",
            isActive: true,
            capacity: 6,
          },
        ]
      : path.endsWith("/check-workout")
        ? { available: true }
        : path.endsWith("/track-availability")
          ? []
          : {
              id: "trainer-test",
              fullName: "HLV Tuấn",
              email: "trainer@gmail.com",
              role: "HEAD_TRAINER",
              permissions: {},
              notify: {},
            };
    return route.fulfill({ json: { success: true, data } });
  });
});
for (const scenario of ["empty", "error", "partial"] as const) {
  test(`suggestions: ${scenario} never invents available slots`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("equiflow_demo_date", "2026-11-29");
      localStorage.setItem("equiflow_demo_time", "13:45");
    });
    await page.route(
      "**/api/training/plans/plan-test/suggest-slots?*",
      (route) => {
        expect(route.request().headers()["x-demo-date"]).toBe(
          "2026-11-29T13:45",
        );
        if (scenario === "error")
          return route.fulfill({
            status: 503,
            json: {
              success: false,
              code: "SERVICE_UNAVAILABLE",
              message: "Dịch vụ gợi ý đang bận",
            },
          });
        return route.fulfill({
          json: {
            success: true,
            data: {
              slots:
                scenario === "empty"
                  ? []
                  : [
                      {
                        startAt: "2026-11-29T07:15:00Z",
                        endAt: "2026-11-29T08:15:00Z",
                        trackId,
                        reasons: [],
                      },
                    ],
              reasons: [],
            },
          },
        });
      },
    );
    await page.goto("/tests/browser/training-slots.html");
    await page
      .getByRole("button", { name: "Gợi ý ba khung giờ tập luyện phù hợp" })
      .click();
    const choices = page.getByRole("button", { name: "Chọn khung giờ này" });
    await expect(choices).toHaveCount(scenario === "partial" ? 1 : 0);
    if (scenario === "empty")
      await expect(
        page.getByText("Không có khung giờ phù hợp trong phạm vi đã chọn.", {
          exact: false,
        }),
      ).toBeVisible();
    if (scenario === "error")
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Đã có lỗi xảy ra ở máy chủ" }),
      ).toBeVisible();
    if (scenario === "partial") {
      await expect(
        page.getByText("Chỉ có 1 khung giờ đáp ứng các điều kiện hiện tại."),
      ).toBeVisible();
      await expect(page.getByText("Sân cỏ chính · 60 phút")).toBeVisible();
      await page.screenshot({path:"test-results/training-slot-suggestions.png",fullPage:true});
      await choices.click();
      await expect(
        page.getByRole("button", { name: "Giờ bắt đầu", exact: true }),
      ).toContainText("14:15");
    }
  });
}
test("ToolDemoKit applies exact time on the same day and offers training-window presets", async ({
  page,
}) => {
  await page.goto("/tests/browser/training-slots.html?toolkit");
  await page.getByRole("button", { name: "Open ToolDemoKit" }).click();
  await page.getByLabel("Ngày giả lập", { exact: true }).fill("2026-11-29");
  await page.getByLabel("Giờ giả lập (UTC+7)", { exact: true }).fill("15:30");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await page.getByRole("button", { name: "Open ToolDemoKit" }).click();
  await expect(page.getByText("Mô phỏng: 2026-11-29 15:30")).toBeVisible();
  await expect(
    page.getByLabel("Giờ giả lập (UTC+7)", { exact: true }),
  ).toHaveValue("15:30");
  await page.getByRole("button", { name: "16:30 · Cuối ngày" }).click();
  await page.getByRole("button", { name: "Open ToolDemoKit" }).click();
  await expect(page.getByText("Mô phỏng: 2026-11-29 16:30")).toBeVisible();
});

test("trial sessions need a target speed and show the 15:30 latest start", async ({
  page,
}) => {
  await page.goto("/tests/browser/training-slots.html?trial");
  await expect(
    page.getByRole("button", { name: "Gợi ý ba khung giờ tập luyện phù hợp" }),
  ).toBeDisabled();
  await expect(page.getByText("04:00 – 15:30", { exact: true })).toBeVisible();
});

test('swimming suggestions show their 45-minute duration without inventing a physical track',async({page})=> {
  await page.addInitScript(()=>{localStorage.setItem('equiflow_demo_date','2026-11-29');localStorage.setItem('equiflow_demo_time','13:45');});
  await page.route('**/api/training/plans/plan-test/suggest-slots?*',route=>route.fulfill({json:{success:true,data:{slots:[{startAt:'2026-11-29T07:15:00Z',endAt:'2026-11-29T08:00:00Z',trackId:null,reasons:[]}],reasons:[]}}}));
  await page.goto('/tests/browser/training-slots.html?swim');
  await expect(page.getByText('04:00 – 16:15',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Gợi ý ba khung giờ tập luyện phù hợp'}).click();
  await expect(page.getByText('Không dùng sân tập · 45 phút')).toBeVisible();
});
