const Course = require("../models/Course");
const Category = require("../models/Category");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
require("dotenv").config();

/*---------------------------IMPORTANT----------------------------------------------------
niche jab m findById({userId}) aise likha toh ye glt tha kyonki {} ye wale brackets nhi aaenge ?
--> kyonki findById() and findByIdAndUpdate() -> NO {}   (mtlb id's wale method m brackets nhi aaenge)
--> findOne() and find() -> YES {}
*/

exports.createCourse = async (req, res) => {
  try {
    const {
      courseName,
      courseDescription,
      whatYouWillLearn,
      price,
      category,
      status,
      tag,
    } = req.body;

    const thumbnail = req.files.thumbnailImage;
    if (
      !courseName ||
      !courseDescription ||
      !whatYouWillLearn ||
      !price ||
      !category ||
      !thumbnail ||
      !tag
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all Details of Course",
      });
    }
    /* yaha niche req.user.id se kese nikal liya data ? aur req k andr kaha se aya data
    ---> hum maanlo route m aise likhenge router.put("/createcourse",auth,createCourse) toh dekho yaha humne
         pehle auth middleware chlaya h mtlb pehle authentication kri h ki user same h ya nhi aur yehi hum
         req.user=user aise user ko bhejenge aur fir baad m createCourse function m hum req.user.id se fetch krenge
    */
    const userId = req.user.id;
    /* par hume instructorDetails fetch krne ki zrurt kyu padi ??
    ---> Kyonki jab hum niche Course.create krenge db m toh baki data toh normally store hojega par instructor toh
         db m ek objectId h na toh isliye instructorDetails nikali aur ab iski id hum niche store krdenge
    */
    const instructorDetails = await User.findById(userId);
    console.log("Instructor Details : ", instructorDetails);

    if (!instructorDetails) {
      return res.json(404)({
        success: false,
        message: "Instructor not found",
      });
    }

    /* yaha niche category ko find by id kyu kra jbki category toh ek string ni hogi ?
--> NHI upr jab hum category fetch kr rhe h toh course model m humne category ki id store kr rkhi h isliye yaha id aaegi
    */
    const categoryDetails = await Category.findById(category);
    if (!categoryDetails) {
      return res.json(404)({
        success: false,
        message: "Category Details not found",
      });
    }

    // upload thumbnail to cloudinary
    const thumbnailImage = await uploadImageToCloudinary(
      thumbnail,
      process.env.FOLDER_NAME,
    );

    // save course to database
    const newCourse = await Course.create({
      courseName,
      courseDescription,
      whatYouWillLearn: whatYouWillLearn,
      price,
      tag,
      status,
      instructor: instructorDetails._id,
      category: categoryDetails._id,
      thumbnail: thumbnailImage.secure_url,
    });

    // add the new course to the user schema of the instructor
    await User.findByIdAndUpdate(
      instructorDetails._id,
      {
        $push: {
          courses: newCourse._id,
        },
      },
      { new: true },
    );

    // update category schema
    await Category.findByIdAndUpdate(
      /* yaha categoryDetails._id bhi likh skte the but category jb humne upr fetch kiya tha toh ye bhi objectId hi aya tha */
      category,
      {
        $push: {
          course: newCourse._id,
        },
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Course Created Successfully",
      data: newCourse,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Edit Course Details
exports.editCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const updates = req.body;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // If Thumbnail Image is found, update it
    if (req.files) {
      console.log("thumbnail update");
      const thumbnail = req.files.thumbnailImage;
      const thumbnailImage = await uploadImageToCloudinary(
        thumbnail,
        process.env.FOLDER_NAME,
      );
      course.thumbnail = thumbnailImage.secure_url;
    }

    // Update only the fields that are present in the request body
    for (const key in updates) {
      if (key === "tag" || key === "instructions") {
        course[key] = JSON.parse(updates[key]);
      } else {
        course[key] = updates[key];
      }
    }

    await course.save();

    const updatedCourse = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    res.json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get Course List
exports.getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find({
      courseName: true,
      price: true,
      thumbnail: true,
      instructor: true,
      ratingAndReviews: true,
      studentsEnrolled: true,
    })
      .populate("instructor")
      .exec();

    return res.status(200).json({
      success: true,
      message: "All courses fetched successfully",
      data: allCourses,
    });
  } catch (error) {
    console.log(error);
    return res.status(404).json({
      success: false,
      message: `Can't Fetch Course Data`,
      error: error.message,
    });
  }
};

// Get a particular course details
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body;
    const courseDetails = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          select: "-videoUrl",
        },
      })
      .exec();

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      });
    }

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    // let totalDurationInSeconds = 0;
    // courseDetails.courseContent.forEach((content) => {
    //   content.subSection.forEach((subSection) => {
    //     const timeDurationInSeconds = parseInt(subSection.timeDuration);
    //     totalDurationInSeconds += timeDurationInSeconds;
    //   });
    // });

    // const totalDuration = convertSecondsToDuration(totalDurationInSeconds);

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        // totalDuration,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get full course detials
exports.getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(404).json({
        success: false,
        message:
          "Course Id not found so wont be able to fetch full courses details",
      });
    }

    const courseDetails = await Course.findById(courseId)
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .populate("ratingAndReviews")
      .exec();

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "could not find the full course details",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Full Course Details fetched",
      data: courseDetails,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Full course Details cant be fetched",
    });
  }
};

// Get a list of Course for a given Instructor
exports.getInstructorCourses = async (req, res) => {
  try {
    // Get the instructor ID from the authenticated user or request body
    const instructorId = req.user.id;

    // Find all courses belonging to the instructor
    const instructorCourses = await Course.find({
      instructor: instructorId,
    }).sort({ createdAt: -1 });

    // Return the instructor's courses
    res.status(200).json({
      success: true,
      data: instructorCourses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve instructor courses",
      error: error.message,
    });
  }
};

// Delete the Course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Unenroll students from the course
    const studentsEnrolled = course.studentsEnrolled;
    for (const studentId of studentsEnrolled) {
      await User.findByIdAndUpdate(studentId, {
        $pull: { courses: courseId },
      });
    }

    // Delete sections and sub-sections
    const courseSections = course.courseContent;
    for (const sectionId of courseSections) {
      // Delete sub-sections of the section
      const section = await Section.findById(sectionId);
      if (section) {
        const subSections = section.subSection;
        for (const subSectionId of subSections) {
          await SubSection.findByIdAndDelete(subSectionId);
        }
      }

      // Delete the section
      await Section.findByIdAndDelete(sectionId);
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId);

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
