import React, { useEffect, useState } from "react";
import {
  TiStarFullOutline,
  TiStarHalfOutline,
  TiStarOutline,
} from "react-icons/ti";

function RatingStars({ Review_Count, Star_Size }) {
  const [starCount, SetStarCount] = useState({
    full: 0,
    half: 0,
    empty: 0,
  });

  useEffect(() => {
    const validCount = Number(Review_Count) || 0;
    const wholeStars = Math.min(5, Math.max(0, Math.floor(validCount)));
    const hasHalf = !Number.isInteger(validCount) && wholeStars < 5 ? 1 : 0;
    const emptyStars = Math.max(0, 5 - wholeStars - hasHalf);
    SetStarCount({
      full: wholeStars,
      half: hasHalf,
      empty: emptyStars,
    });
  }, [Review_Count]);
  return (
    <div className="flex gap-1 text-yellow-100">
      {[...new Array(starCount.full)].map((_, i) => {
        return <TiStarFullOutline key={i} size={Star_Size || 20} />;
      })}
      {[...new Array(starCount.half)].map((_, i) => {
        return <TiStarHalfOutline key={i} size={Star_Size || 20} />;
      })}
      {[...new Array(starCount.empty)].map((_, i) => {
        return <TiStarOutline key={i} size={Star_Size || 20} />;
      })}
    </div>
  );
}

export default RatingStars;
