import React from "react";
import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import SearchBar from "./components/SearchBar";
import HeroFeaturedEvent from "./components/HeroFeaturedEvent";
import DiscoverMore from "./components/DiscoverMore";
import EventDetails from "./components/EventDetails";
import SearchResults from "./components/SearchResults";

import { ClerkProvider } from "@clerk/clerk-react";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

const Home: React.FC = () => (
  <>
    <SearchBar />
    <HeroFeaturedEvent />
    <DiscoverMore />
  </>
);

const App: React.FC = () => {
  if (!clerkKey) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Missing Clerk key</h2>
        <p>
          Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>.env.local</code>{" "}
          and restart
          <code> npm run dev</code>.
        </p>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <Routes>
        {/* Parent layout MUST have a matching path ("/") and children must be relative */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="event/:id" element={<EventDetails />} />
          <Route path="search" element={<SearchResults />} />
        </Route>

        {/* Optional fallback so you never see a blank page */}
        <Route
          path="*"
          element={<div style={{ padding: 24 }}>Not found</div>}
        />
      </Routes>
    </ClerkProvider>
  );
};

export default App;