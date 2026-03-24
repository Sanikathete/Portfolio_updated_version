import React, { useState } from "react";

const Stocks: React.FC = () => {
  const [watchlistedIds, setWatchlistedIds] = useState<Set<number>>(new Set());

  return (
  <div>
    <h1>Stocks Page</h1>
    <p>Watchlist count: {watchlistedIds.size}</p>

    <button onClick={() => setWatchlistedIds(new Set())}>
      Reset Watchlist
    </button>
  </div>
);
};

export default Stocks;