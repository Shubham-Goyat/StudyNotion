import { useSelector } from "react-redux";
import { useState } from "react";
import { FaCheck } from "react-icons/fa";
import { FiEdit2 } from "react-icons/fi";
import { HiClock } from "react-icons/hi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

import { formatDate } from "../../../../services/formatDate";
import {
  deleteCourse,
  fetchInstructorCourses,
} from "../../../../services/operations/courseDetailsAPI";
import { COURSE_STATUS } from "../../../../utils/constants";
import ConfirmationModal from "../../../common/ConfirmationModal";

export default function CoursesTable({ courses, setCourses }) {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(null);

  const TRUNCATE_LENGTH = 30;

  const handleCourseDelete = async (courseId) => {
    setLoading(true);
    await deleteCourse({ courseId: courseId }, token);
    const result = await fetchInstructorCourses(token);
    if (result) {
      setCourses(result);
    }
    setConfirmationModal(null);
    setLoading(false);
  };

  const truncateDescription = (description) =>
    description.split(" ").length > TRUNCATE_LENGTH
      ? description.split(" ").slice(0, TRUNCATE_LENGTH).join(" ") + "..."
      : description;

  const openDeleteModal = (courseId) => {
    setConfirmationModal({
      text1: "Do you want to delete this course?",
      text2: "All the data related to this course will be deleted",
      btn1Text: !loading ? "Delete" : "Loading...",
      btn2Text: "Cancel",
      btn1Handler: !loading ? () => handleCourseDelete(courseId) : () => {},
      btn2Handler: !loading ? () => setConfirmationModal(null) : () => {},
    });
  };

  const StatusBadge = ({ status }) =>
    status === COURSE_STATUS.DRAFT ? (
      <p className="flex w-fit flex-row items-center gap-2 rounded-full bg-richblack-700 px-2 py-[2px] text-[12px] font-medium text-pink-100">
        <HiClock size={14} />
        Drafted
      </p>
    ) : (
      <p className="flex w-fit flex-row items-center gap-2 rounded-full bg-richblack-700 px-2 py-[2px] text-[12px] font-medium text-yellow-100">
        <div className="flex h-3 w-3 items-center justify-center rounded-full bg-yellow-100 text-richblack-700">
          <FaCheck size={8} />
        </div>
        Published
      </p>
    );

  const ActionButtons = ({ course }) => (
    <>
      <button
        disabled={loading}
        onClick={() => navigate(`/dashboard/edit-course/${course._id}`)}
        title="Edit"
        className="px-2 transition-all duration-200 hover:scale-110 hover:text-caribbeangreen-300"
      >
        <FiEdit2 size={20} />
      </button>

      <button
        disabled={loading}
        onClick={() => openDeleteModal(course._id)}
        title="Delete"
        className="px-1 transition-all duration-200 hover:scale-110 hover:text-[#ff0000]"
      >
        <RiDeleteBin6Line size={20} />
      </button>
    </>
  );

  if (courses?.length === 0) {
    return (
      <div className="rounded-xl border border-richblack-800 py-10 text-center text-2xl font-medium text-richblack-100">
        No courses found
      </div>
    );
  }

  return (
    <>
      {/* MOBILE / TABLET: stacked cards (below lg) */}
      <div className="flex flex-col gap-4 lg:hidden">
        {courses?.map((course) => (
          <div
            key={course._id}
            className="rounded-xl border border-richblack-800 p-4"
          >
            <div className="flex gap-x-4">
              <img
                src={course?.thumbnail}
                alt={course?.courseName}
                className="h-[90px] w-[120px] flex-shrink-0 rounded-lg object-cover sm:h-[110px] sm:w-[150px]"
              />

              <div className="flex min-w-0 flex-col justify-between">
                <p className="truncate text-base font-semibold text-richblack-5 sm:text-lg">
                  {course.courseName}
                </p>
                <p className="text-[12px] text-white">
                  Created: {formatDate(course.createdAt)}
                </p>
                <StatusBadge status={course.status} />
              </div>
            </div>

            <p className="mt-3 text-xs text-richblack-300">
              {truncateDescription(course.courseDescription)}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-richblack-800 pt-3 text-sm font-medium text-richblack-100">
              <span>2hr 30min</span>
              <span>₹{course.price}</span>
              <div className="flex items-center">
                <ActionButtons course={course} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP: full table (lg and up) */}
      <div className="hidden overflow-x-auto rounded-xl border border-richblack-800 lg:block">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-richblack-800">
              <th className="px-6 py-4 text-left text-sm font-medium uppercase text-richblack-100">
                Courses
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium uppercase text-richblack-100">
                Duration
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium uppercase text-richblack-100">
                Price
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium uppercase text-richblack-100">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {courses?.map((course) => (
              <tr key={course._id} className="border-b border-richblack-800">
                <td className="px-6 py-8">
                  <div className="flex gap-x-4">
                    <img
                      src={course?.thumbnail}
                      alt={course?.courseName}
                      className="h-[148px] w-[220px] rounded-lg object-cover"
                    />

                    <div className="flex flex-col justify-between">
                      <p className="text-lg font-semibold text-richblack-5">
                        {course.courseName}
                      </p>
                      <p className="text-xs text-richblack-300">
                        {truncateDescription(course.courseDescription)}
                      </p>
                      <p className="text-[12px] text-white">
                        Created: {formatDate(course.createdAt)}
                      </p>
                      <StatusBadge status={course.status} />
                    </div>
                  </div>
                </td>

                <td className="px-6 py-8 text-sm font-medium text-richblack-100">
                  2hr 30min
                </td>

                <td className="px-6 py-8 text-sm font-medium text-richblack-100">
                  ₹{course.price}
                </td>

                <td className="px-6 py-8 text-sm font-medium text-richblack-100">
                  <ActionButtons course={course} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  );
}
