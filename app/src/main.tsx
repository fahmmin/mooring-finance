import { createRoot } from "react-dom/client";
import AppShell from "./app/Shell";
import Landing from "./Landing";
import "./styles.css";

// The landing page at /, the multi-page lending app under /app.
const Page = location.pathname.startsWith("/app") ? AppShell : Landing;
createRoot(document.getElementById("root")!).render(<Page />);
