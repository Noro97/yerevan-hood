/**
 * Yerevan Hood - Development Sandbox Stylesheet
 */

export function injectSandboxStyles() {
  if (document.getElementById("dev-sandbox-styles")) return;

  const styleEl = document.createElement("style");
  styleEl.id = "dev-sandbox-styles";
  styleEl.textContent = `
    /* Root & Launcher */
    #dev-sandbox-root {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #e2daf0;
      user-select: none;
      -webkit-user-select: none;
    }

    #dev-sandbox-launcher {
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 999990;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(26, 18, 42, 0.88);
      backdrop-filter: blur(10px);
      border: 1px solid #d4af37;
      border-radius: 20px;
      color: #ffdf79;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #dev-sandbox-launcher:hover {
      background: rgba(45, 29, 75, 0.95);
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(212, 175, 55, 0.3);
    }
    #dev-sandbox-launcher .hotkey-tag {
      font-size: 10px;
      background: rgba(212, 175, 55, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
      color: #fff;
    }
    #dev-sandbox-launcher .fps-badge {
      font-size: 10px;
      color: #7ec850;
      font-weight: 800;
    }

    /* Main Sandbox Panel */
    #dev-sandbox-panel {
      position: fixed;
      top: 14px;
      right: 14px;
      width: 410px;
      max-width: calc(100vw - 28px);
      max-height: calc(100vh - 28px);
      background: rgba(20, 14, 34, 0.94);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(212, 175, 55, 0.4);
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(201, 160, 255, 0.1);
      z-index: 999995;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    #dev-sandbox-panel.hidden {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.97) translateY(-8px);
    }

    /* Header */
    .sb-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: linear-gradient(180deg, rgba(42, 28, 70, 0.6) 0%, rgba(24, 16, 40, 0.4) 100%);
      border-bottom: 1px solid rgba(212, 175, 55, 0.2);
    }
    .sb-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sb-icon {
      font-size: 16px;
    }
    .sb-title {
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.8px;
      color: #ffd464;
      text-transform: uppercase;
    }
    .sb-status-pill {
      font-size: 10px;
      background: rgba(126, 200, 80, 0.18);
      color: #92e660;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 700;
      border: 1px solid rgba(126, 200, 80, 0.3);
    }
    .sb-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sb-btn-icon {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #d8cfea;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s;
    }
    .sb-btn-icon:hover {
      background: rgba(212, 175, 55, 0.25);
      border-color: #d4af37;
      color: #fff;
    }

    /* Tab Bar */
    .sb-tabs {
      display: flex;
      background: rgba(14, 10, 24, 0.7);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      overflow-x: auto;
    }
    .sb-tab {
      flex: 1;
      padding: 8px 4px;
      text-align: center;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #9f91b8;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .sb-tab:hover {
      color: #d8cde8;
      background: rgba(255, 255, 255, 0.03);
    }
    .sb-tab.active {
      color: #ffd875;
      border-bottom-color: #d4af37;
      background: rgba(212, 175, 55, 0.08);
    }

    /* Content Area */
    .sb-body {
      padding: 12px 14px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: calc(100vh - 170px);
    }
    .sb-body::-webkit-scrollbar {
      width: 5px;
    }
    .sb-body::-webkit-scrollbar-thumb {
      background: rgba(212, 175, 55, 0.3);
      border-radius: 4px;
    }

    /* Section Boxes */
    .sb-section {
      background: rgba(30, 22, 50, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sb-section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #c9a0ff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2px;
    }

    /* Controls Grid & Rows */
    .sb-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 24px;
    }
    .sb-row-label {
      flex: 0 0 115px;
      color: #b5a8cb;
      font-weight: 500;
      font-size: 11px;
    }
    .sb-row-control {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sb-slider {
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    }
    .sb-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: #ffd875;
      border: 1px solid #ffffff;
      box-shadow: 0 0 6px rgba(212, 175, 55, 0.6);
      cursor: pointer;
      transition: transform 0.1s;
    }
    .sb-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    .sb-val-pill {
      flex: 0 0 42px;
      font-family: monospace;
      font-size: 10px;
      text-align: right;
      color: #ffd875;
      background: rgba(0, 0, 0, 0.35);
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    /* Buttons & Button Groups */
    .sb-btn {
      background: rgba(56, 38, 92, 0.7);
      border: 1px solid rgba(201, 160, 255, 0.3);
      color: #f0e6ff;
      font-weight: 600;
      font-size: 11px;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .sb-btn:hover {
      background: rgba(85, 55, 140, 0.85);
      border-color: #d4af37;
      color: #fff;
    }
    .sb-btn:active {
      transform: translateY(1px);
    }
    .sb-btn-primary {
      background: linear-gradient(135deg, #c97f6a 0%, #a85845 100%);
      border: 1px solid #ffd464;
      color: #fff;
      font-weight: 700;
    }
    .sb-btn-primary:hover {
      background: linear-gradient(135deg, #df8d76 0%, #be644f 100%);
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.4);
    }
    .sb-btn-danger {
      background: rgba(180, 40, 40, 0.7);
      border-color: #ff6a5e;
      color: #fff;
    }
    .sb-btn-danger:hover {
      background: rgba(220, 50, 50, 0.9);
      box-shadow: 0 0 8px rgba(255, 106, 94, 0.5);
    }
    .sb-btn-small {
      padding: 3px 6px;
      font-size: 10px;
    }
    .sb-btn-group {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    /* Inputs & Selects */
    .sb-select, .sb-input {
      background: rgba(15, 10, 25, 0.75);
      border: 1px solid rgba(201, 160, 255, 0.25);
      border-radius: 5px;
      color: #e2daf0;
      font-size: 11px;
      padding: 4px 8px;
      outline: none;
      transition: border-color 0.15s;
    }
    .sb-select:focus, .sb-input:focus {
      border-color: #d4af37;
    }
    .sb-select {
      cursor: pointer;
    }

    /* Toggle Switch */
    .sb-switch-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .sb-switch {
      position: relative;
      display: inline-block;
      width: 32px;
      height: 17px;
    }
    .sb-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .sb-slider-switch {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255, 255, 255, 0.15);
      transition: 0.2s;
      border-radius: 17px;
    }
    .sb-slider-switch:before {
      position: absolute;
      content: "";
      height: 13px;
      width: 13px;
      left: 2px;
      bottom: 2px;
      background-color: #fff;
      transition: 0.2s;
      border-radius: 50%;
    }
    input:checked + .sb-slider-switch {
      background-color: #7ec850;
    }
    input:checked + .sb-slider-switch:before {
      transform: translateX(15px);
    }

    /* Entity Inspector Table */
    .sb-entity-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    .sb-entity-table th {
      text-align: left;
      font-size: 10px;
      color: #9f91b8;
      padding: 4px 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .sb-entity-table td {
      padding: 6px;
      font-size: 11px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }
    .sb-entity-row:hover td {
      background: rgba(255, 255, 255, 0.03);
    }
    .sb-hp-meter {
      width: 48px;
      height: 6px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 2px;
    }
    .sb-hp-fill {
      height: 100%;
      background: #7ec850;
      transition: width 0.1s ease;
    }

    /* Bottom Status Footer */
    .sb-footer {
      padding: 8px 14px;
      background: rgba(14, 10, 24, 0.85);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      color: #8c7ea5;
    }
    .sb-footer-stats {
      display: flex;
      gap: 12px;
    }
    .sb-footer-stat-val {
      font-weight: 700;
      color: #ffd464;
    }
  `;

  document.head.appendChild(styleEl);
}
