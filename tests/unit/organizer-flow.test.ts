import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrganizerFlow, organizerSubmitBehavior, type OrganizerFlowProps } from "../../src/components/screens/OrganizerFlow";

const draft = {
  id: "synthetic-organizer-draft", title: "SYNTHETIC TEST · открытая тренировка", categoryId: "sport", organizerName: "SYNTHETIC TEST",
  date: "2099-10-21", startTime: "18:00", endTime: "19:00", venueName: "SYNTHETIC TEST venue", priceState: "unknown" as const,
  languageUnspecified: true, contactType: "site" as const, contactValue: "https://organizer.example/",
};
function render(props: Partial<OrganizerFlowProps> = {}) {
  return renderToStaticMarkup(createElement(OrganizerFlow, { screen: "preview", initialDraft: draft, ...props }));
}
function button(markup: string, label: string) {
  const result = [...markup.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(match => match[0]).find(value => value.includes(label));
  expect(result, `button ${label} must exist`).toBeDefined();
  return result!;
}

describe("OrganizerFlow local draft mode", () => {
  it("uses save wording and cabinet transition, never a moderation submission claim", () => {
    const action = organizerSubmitBehavior(true);
    expect(action.label).toBe("Сохранить черновик");
    expect(action.target).toBe("cabinet");
    expect(action.announcement).toContain("не опубликован и не отправлен на проверку");
    const html = render({ localDraftOnly: true, onDraftChange: () => {}, onNavigate: () => {} });
    expect(button(html, "Сохранить черновик")).not.toContain("disabled");
    expect(html).toContain("Проверьте перед сохранением");
    expect(html).not.toContain("Отправить на проверку");
  });

  it("preserves the default review-mode contract", () => {
    expect(organizerSubmitBehavior()).toMatchObject({ label: "Отправить на проверку", target: "moderation" });
    expect(button(render({ onSubmitForReview: () => {} }), "Отправить на проверку")).not.toContain("disabled");
  });

  it("does not enable save or submit controls without an operation", () => {
    expect(button(render({ localDraftOnly: true }), "Сохранить черновик")).toContain("disabled");
    expect(button(render(), "Отправить на проверку")).toContain("disabled");
  });

  it("never presents a submitted moderation timeline in local-only mode", () => {
    const html = render({ screen: "moderation", localDraftOnly: true, moderation: { status: "submitted", comments: [], mode: "demo" } });
    expect(html).toContain("Черновик на устройстве");
    expect(html).not.toContain("Отправлено на проверку");
    expect(html).not.toContain("Этапы проверки");
    expect(button(html, "Продолжить редактирование")).toContain("disabled");
  });

  it("disables withdraw without a handler and enables it only when provided", () => {
    expect(button(render({ screen: "moderation" }), "Отозвать событие")).toContain("disabled");
    expect(button(render({ screen: "moderation", onWithdraw: () => {} }), "Отозвать событие")).not.toContain("disabled");
  });

  it("disables an unconnected map picker with an explicit manual-address alternative", () => {
    const html = render({ screen: "schedule" });
    expect(button(html, "Выбрать место на карте")).toContain("disabled");
    expect(button(html, "Выбрать место на карте")).toContain("aria-describedby");
    expect(html).toContain("Название площадки или адрес можно ввести вручную");
    expect(button(render({ screen: "schedule", onPickPlace: () => {} }), "Выбрать место на карте")).not.toContain("disabled");
  });

  it("connects local cabinet actions only when edit or navigation is available", () => {
    const disconnected = render({ screen: "cabinet", localDraftOnly: true });
    expect(button(disconnected, "Действия:")).toContain("disabled");
    expect(button(disconnected, "Открыть черновик")).toContain("disabled");
    expect(button(disconnected, "Создать событие")).toContain("disabled");
    const connected = render({ screen: "cabinet", localDraftOnly: true, onNavigate: () => {} });
    expect(button(connected, "Действия:")).not.toContain("disabled");
    expect(button(connected, "Открыть черновик")).not.toContain("disabled");
    expect(button(connected, "Создать событие")).not.toContain("disabled");
    expect(connected).not.toContain('role="tab" aria-selected="false"');
  });
});
