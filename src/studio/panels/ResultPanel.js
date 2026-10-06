import { h, STATUS } from "../dom.js";

export class ResultPanel {
  constructor(studio) {
    this.studio = studio;
    this.body = h("div", { class: "result-body" }, h("p", { class: "muted" }, "Run a scenario to see its checks here."));
    this.el = h("section", { class: "panel results" }, h("div", { class: "panel-head" }, h("h3", {}, "Checks")), this.body);
  }

  show(result, scenario = null) {
    this.body.replaceChildren();
    if (!result) {
      this.body.append(h("p", { class: "muted" }, `${scenario?.title ?? "Scenario"} hasn't run yet.`));
      return;
    }
    const st = STATUS[result.status];
    const sc = this.studio.scenarios.find((s) => s.id === result.id);
    this.body.append(
      h("div", { class: `result-title ${st.cls}` }, `${st.icon} ${result.title}`),
      h("div", { class: "muted mono" }, `${result.id} · ${result.frames} frames · ${st.label}`),
      result.knownBug && h("div", { class: "known-note" }, `Known bug: ${result.knownBug}`),
      h("ul", { class: "checks" }, result.results.map((r) =>
        h("li", { class: r.pass ? "ok" : "bad" },
          h("span", {}, r.pass ? "✓" : "✗"),
          h("div", {}, r.message, r.detail && h("span", { class: "detail mono" }, r.detail))))),
      sc && h("div", { class: "row" },
        h("button", { onClick: () => this.studio.run(sc) }, "Run again"),
        h("button", { onClick: () => this.studio.watch(sc) }, "Watch")),
    );
  }

  showSummary(results) {
    this.body.replaceChildren();
    const by = (status) => results.filter((r) => r.status === status);
    const failing = [...by("fail"), ...by("unexpected-pass")];
    this.body.append(
      h("div", { class: `result-title ${failing.length ? "bad" : "ok"}` },
        failing.length ? `${failing.length} scenario(s) need attention` : "All scenarios behave as expected"),
      h("div", { class: "muted" }, `✓ ${by("pass").length} pass · ◆ ${by("known-bug").length} known bugs · ✗ ${by("fail").length} fail · ★ ${by("unexpected-pass").length} unexpectedly passing`),
      h("ul", { class: "checks" }, [...failing, ...by("known-bug")].map((r) => {
        const st = STATUS[r.status];
        const sc = this.studio.scenarios.find((s) => s.id === r.id);
        return h("li", { class: st.cls }, h("span", {}, st.icon), h("button", { class: "link", onClick: () => this.show(r, sc) }, r.title));
      })),
    );
  }
}
