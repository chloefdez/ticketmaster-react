// src/App.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import SearchBar from "./components/SearchBar";
import HeroFeaturedEvent from "./components/HeroFeaturedEvent";
import DiscoverMore from "./components/DiscoverMore";
import EventDetails from "./components/EventDetails";

// Inline Home “page” (just your existing sections)
const Home: React.FC = () => (
  <>
    <SearchBar />
    <HeroFeaturedEvent />
    <DiscoverMore />
  </>
);

const App: React.FC = () => {
  return (
    <Routes>
      {/* Everything inside Layout gets NavBar + Footer */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {/* Keep preview route for now */}
        <Route path="/eventdetails" element={<EventDetails />} />
        {/* Dynamic route (will be used soon) */}
        <Route path="/event/:id" element={<EventDetails />} />
      </Route>
    </Routes>
  );
};

export default App;