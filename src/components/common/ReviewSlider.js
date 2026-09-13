import React, { useEffect, useState } from "react";
import ReactStars from "react-rating-stars-component";
// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/pagination";
import "../../App.css";
// Icons
import { FaStar } from "react-icons/fa";
// Import required modules
// import { Autoplay, FreeMode, Pagination } from "swiper";
import { Autoplay, FreeMode, Pagination } from "swiper/modules";

// Get apiFunction and the endpoint
import { apiConnector } from "../../services/apiconnector";
import { ratingsEndpoints } from "../../services/apis";

function ReviewSlider() {
  const [reviews, setReviews] = useState([]);
  const truncateWords = 15;

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await apiConnector(
          "GET",
          ratingsEndpoints.REVIEWS_DETAILS_API,
        );
        if (response?.data?.success) {
          setReviews(response?.data?.data || []);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };
    fetchReviews();
  }, []);

  return (
    <div className="text-white">
      <div className="my-[50px] h-[184px] max-w-maxContentTab lg:max-w-maxContent">
        {reviews.length > 0 ? (
          <Swiper
            slidesPerView={1}
            spaceBetween={25}
            loop={reviews.length >= 4}
            freeMode={true}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
            }}
            breakpoints={{
              640: {
                slidesPerView: Math.min(reviews.length, 2),
              },
              1024: {
                slidesPerView: Math.min(reviews.length, 4),
              },
            }}
            modules={[FreeMode, Pagination, Autoplay]}
            className="w-full"
          >
            {reviews.map((review, i) => {
              return (
                <SwiperSlide key={review._id || i}>
                  <div className="flex flex-col gap-3 bg-richblack-800 p-3 text-[14px] text-richblack-25 h-36">
                    <div className="flex items-center gap-4">
                      <img
                        src={
                          review?.user?.image
                            ? review?.user?.image
                            : `https://api.dicebear.com/7.x/initials/svg?seed=${review?.user?.firstName || "User"}%20${review?.user?.lastName || ""}`
                        }
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                      <div className="flex flex-col">
                        <h1 className="font-semibold text-richblack-5">{`${review?.user?.firstName || ""} ${review?.user?.lastName || ""}`}</h1>
                        <h2 className="text-[12px] font-medium text-richblack-500">
                          {review?.course?.courseName}
                        </h2>
                      </div>
                    </div>
                    <p className="font-medium text-richblack-25">
                      {(review?.review || "").split(" ").length > truncateWords
                        ? `${(review?.review || "")
                            .split(" ")
                            .slice(0, truncateWords)
                            .join(" ")} ...`
                        : review?.review || ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-yellow-100">
                        {review?.rating ? review.rating.toFixed(1) : "0.0"}
                      </h3>
                      <ReactStars
                        count={5}
                        value={review?.rating || 0}
                        size={20}
                        edit={false}
                        activeColor="#ffd700"
                        emptyIcon={<FaStar />}
                        fullIcon={<FaStar />}
                      />
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        ) : (
          <p className="text-center text-richblack-100">No Reviews Found</p>
        )}
      </div>
    </div>
  );
}

export default ReviewSlider;
