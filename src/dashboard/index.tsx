import { render } from "preact";
import { DashboardApp } from "./DashboardApp";

const styleEl = document.createElement("style");
styleEl.textContent = `
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
`;
document.head.appendChild(styleEl);

render(<DashboardApp />, document.getElementById("root")!);
