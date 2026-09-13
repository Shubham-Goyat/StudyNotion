const User = require("../models/User");
const Profile = require("../models/Profile");
const Course = require("../models/Course");
const CourseProgress = require("../models/CourseProgress");
const { convertSecondsToDuration } = require("../utils/secToDuration");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
/*------------------------IMPORTANT-----------------------------------
jese upar uploadImageToCloudinary m aise bina ye wale {} brackets k import kr rha tha toh error aar rha tha ?
--> kyonki jab maanlo hum aise export krte h function ko  ( exports.functionName ) toh {} ye wale brackets aaenge
    lekin jab hum normally aise modules.exports krke export krte h function ko toh {} ye wale brackets ki zrurt nhi h
*/

exports.updateProfile = async (req, res) => {
  try {
    /*
   get data
   get userId
   validate details
   find profile
   update profile
   return res
*/
    const {
      firstName = "",
      lastName = "",
      dateOfBirth = "",
      about = "",
      contactNumber = "",
      gender = "",
    } = req.body;

    // user id fir vohi hume auth wale middlewareware m send kr rkhi hogi req.user krke vaha se mil jaegi
    const id = req.user.id;

    // Find the profile by id
    const userDetails = await User.findById(id);
    const profile = await Profile.findById(userDetails.additionalDetails);

    const user = await User.findByIdAndUpdate(id, {
      firstName,
      lastName,
    });
    await user.save();

    /*Humne yaha update kyu kri profile create kyu nhi kri ? hum toh naya data daal rhe h na toh update kyu ????
--> kyonki yaad kro humne Auth.js m jab user ka data bnaya tha toh hum har ek user ko jab create kr rhe the toh sath
    m ek empty profile bhi create kr rhe the (mtlb jab ek new user create hoga uski prfile ki additional details
    saari null store hongi)...isliye bas ab hum un null values ko hi updates krenge
*/
    // Update the profile fields
    profile.dateOfBirth = dateOfBirth;
    profile.about = about;
    profile.contactNumber = contactNumber;
    profile.gender = gender;

    // Save the updated profile
    await profile.save();

    // Find the updated user details
    const updatedUserDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec();

    return res.json({
      success: true,
      message: "Profile updated successfully",
      updatedUserDetails,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete Account

exports.deleteAccount = async (req, res) => {
  try {
    /*
get id
validation
get user
delete additional details  (pehle uski additional details delete krva denge)
delete user
*/

    // get id
    const userId = req.user.id;

    // get user
    const userDetails = await User.findById(userId);
    // validation
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "Valid User not found !!",
      });
    }

    //delete additional details / profile
    await Profile.findByIdAndDelete(userId.additionalDetails);

    // Un-enroll user from all courses
    // Remove this user's ID from each course's students/enrolledUsers array
    for (const courseId of userDetails.courses) {
      await Course.findByIdAndUpdate(
        courseId,
        { $pull: { studentsEnrolled: userId } }, // Remove userId from studentsEnrolled array
        { new: true },
      );
    }

    // delete course progress of particular user
    await CourseProgress.deleteMany({ userId: userId });

    // delete User
    await User.findByIdAndDelete({ _id: userId });

    res.status(200).json({
      success: true,
      message: "Profile Deleted Successfully",
    });
  } catch (error) {
    console.error("Error while deleting Profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getAllUserDetails = async (req, res) => {
  try {
    const id = req.user.id;
    const userDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec();
    console.log(userDetails);
    res.status(200).json({
      success: true,
      message: "User Data fetched successfully",
      data: userDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateDisplayPicture = async (req, res) => {
  try {
    const displayPicture = req.files.displayPicture;
    const userId = req.user.id;
    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000,
    );
    console.log(image);
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      { image: image.secure_url },
      { new: true },
    );
    res.send({
      success: true,
      message: `Image Updated successfully`,
      data: updatedProfile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    let userDetails = await User.findOne({
      _id: userId,
    })
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .exec();
    userDetails = userDetails.toObject();
    var SubsectionLength = 0;
    for (var i = 0; i < userDetails.courses.length; i++) {
      let totalDurationInSeconds = 0;
      SubsectionLength = 0;
      for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
        totalDurationInSeconds += userDetails.courses[i].courseContent[
          j
        ].subSection.reduce(
          (acc, curr) => acc + parseInt(curr.timeDuration),
          0,
        );
        userDetails.courses[i].totalDuration = convertSecondsToDuration(
          totalDurationInSeconds,
        );
        SubsectionLength +=
          userDetails.courses[i].courseContent[j].subSection.length;
      }
      let courseProgressCount = await CourseProgress.findOne({
        courseID: userDetails.courses[i]._id,
        userId: userId,
      });
      courseProgressCount = courseProgressCount?.completedVideos.length;
      if (SubsectionLength === 0) {
        userDetails.courses[i].progressPercentage = 100;
      } else {
        // To make it up to 2 decimal point
        const multiplier = Math.pow(10, 2);
        userDetails.courses[i].progressPercentage =
          Math.round(
            (courseProgressCount / SubsectionLength) * 100 * multiplier,
          ) / multiplier;
      }
    }

    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find user with id: ${userDetails}`,
      });
    }
    return res.status(200).json({
      success: true,
      data: userDetails.courses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.instructorDashboard = async (req, res) => {
  try {
    const courseDetails = await Course.find({ instructor: req.user.id });

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = course.studentsEnrolled.length;
      const totalAmountGenerated = totalStudentsEnrolled * course.price;

      // Create a new object with the additional fields
      const courseDataWithStats = {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        // Include other course properties as needed
        totalStudentsEnrolled,
        totalAmountGenerated,
      };

      return courseDataWithStats;
    });

    res.status(200).json({ courses: courseData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
