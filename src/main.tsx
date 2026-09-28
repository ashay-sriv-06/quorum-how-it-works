import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./styles.css";
import { Shell } from "./Shell";
import { Home } from "./pages/Home";
import { Explore } from "./pages/Explore";
import { Create } from "./pages/Create";
import { EventPage } from "./pages/EventPage";
import { Confirmed } from "./pages/Confirmed";
import { MyLaunches } from "./pages/MyLaunches";
import { NotFound } from "./pages/NotFound";
import { HowItWorks } from "./pages/HowItWorks";

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/explore", element: <Explore /> },
      { path: "/create", element: <Create /> },
      { path: "/g/:slug", element: <EventPage /> },
      { path: "/g/:slug/confirmed", element: <Confirmed /> },
      { path: "/my-launches", element: <MyLaunches /> },
      { path: "/how-it-works", element: <HowItWorks /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
