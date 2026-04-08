import { render } from "preact";
import { DashboardApp } from "./DashboardApp";

const styleEl = document.createElement("style");
styleEl.textContent = `
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(styleEl);

render(<DashboardApp />, document.getElementById("root")!);
