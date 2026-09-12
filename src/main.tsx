import { render } from "preact";
import { App } from "./app.tsx";
import "./styles/app.css";

const appElement = document.getElementById("app");
if (appElement) {
  render(<App />, appElement);
}
