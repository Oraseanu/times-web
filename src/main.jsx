import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { createStateRepository } from "./data/repositories/repositoryFactory.js";

const repository = createStateRepository();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App repository={repository} />
  </StrictMode>
);
