import { h, STATUS } from "../dom.js";

export class ScenarioPanel {
  constructor(studio) {
    this.studio = studio;
    this.badges = new Map();
    this.summary = h("span", { class: "summary" }, `${studio.scenarios.length} scenarios`);

    const groups = new Map();
    for (const sc of studio.scenarios) {
      if (!groups.has(sc.group)) groups.set(sc.group, []);
      groups.get(sc.group).push(sc);
    }

    this.el = h("div", { class: "panel scenarios" },
      h("div", { class: "panel-head" },
        h("button", { class: "primary", onClick: () => studio.runAll() }, "Run all"),
        this.summary),
      [...groups].map(([group, list]) => h("section", {},
        h("h3", {}, group),
        list.map((sc) => this.row(sc)))));

    studio.on("result", (r) => this.update(r));
  }

  row(sc) {
    const badge = h("span", { class: "badge idle", title: "not run yet" }, "·");
    this.badges.set(sc.id, badge);
    return h("div", { class: "scenario", title: sc.knownBug ? `Known bug: ${sc.knownBug}` : sc.id },
      badge,
      h("button", { class: "link", onClick: () => this.studio.resultPanel.show(this.studio.results.get(sc.id), sc) }, sc.title),
      h("span", { class: "actions" },
        h("button", { title: "Run instantly and check", onClick: () => this.studio.run(sc) }, "Run"),
        h("button", { title: "Replay in real time, then check", onClick: () => this.studio.watch(sc) }, "Watch")));
  }

  update(result) {
    const badge = this.badges.get(result.id);
    if (badge) {
      const st = STATUS[result.status];
      badge.className = `badge ${st.cls}`;
      badge.textContent = st.icon;
      badge.title = st.label;
    }
    const counts = { pass: 0, fail: 0, "known-bug": 0, "unexpected-pass": 0 };
    for (const r of this.studio.results.values()) counts[r.status]++;
    this.summary.textContent = `✓ ${counts.pass}  ✗ ${counts.fail}  ◆ ${counts["known-bug"]}  ★ ${counts["unexpected-pass"]}  / ${this.studio.scenarios.length}`;
    this.summary.classList.toggle("bad", counts.fail + counts["unexpected-pass"] > 0);
  }
}
