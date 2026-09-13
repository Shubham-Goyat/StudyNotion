const { instance } = require("../config/razorpay");
const Course = require("../models/Course");
const crypto = require("crypto");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const mongoose = require("mongoose");
const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail");
const {
  paymentSuccessEmail,
} = require("../mail/templates/paymentSuccessEmail");
const CourseProgress = require("../models/CourseProgress");

// Capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
  // get courses id and kyonki user 1se jyada course bhi toh buy kr skta h and userId
  // validation
  // valid courseDetail
  // user already pay for the same course
  // order create
  // return response
  const { courses } = req.body;
  const userId = req.user.id;
  if (courses.length === 0) {
    return res.json({ success: false, message: "Please Provide Course ID" });
  }

  let total_amount = 0;

  for (const course_id of courses) {
    let course;
    try {
      // Find the course by its ID
      course = await Course.findById(course_id);

      // If the course is not found, return an error
      if (!course) {
        return res
          .status(200)
          .json({ success: false, message: "Could not find the Course" });
      }

      // Check if the user is already enrolled in the course
      /* yaha niche humne userId ko ObjectId m convert isliye kiya kyonki jab hum niche comapre krenge toh students
     enrolled k andr userId jo padi h vo objectId ki form m h isliye comparison m dikkt na ho convert krdia  */
      const uid = new mongoose.Types.ObjectId(userId);
      if (course.studentsEnrolled.includes(uid)) {
        return res
          .status(200)
          .json({ success: false, message: "Student is already Enrolled" });
      }

      // Add the price of the course to the total amount
      total_amount += course.price;
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  const options = {
    amount: total_amount * 100,
    currency: "INR",
    receipt: Math.random(Date.now()).toString(),
  };

  try {
    // Initiate the payment using Razorpay
    const paymentResponse = await instance.orders.create(options);
    console.log(paymentResponse);
    res.json({
      success: true,
      data: paymentResponse,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Could not initiate order." });
  }
};

// verify the payment
exports.verifyPayment = async (req, res) => {
  /* user jab payment krdega toh hume kese pta chlega ki payment success hogi user ki trf se ??
       --> iske liye razorpay m jab payment success hoti h toh hum ek api route ko hit krva denge aur usme ek secret
           bhejenge aur vo secret ko apne db wale secret se match krke dekhenge...agr dono equal honge mtlb user
           ki trf se successfull payment ho gyi*/
  const razorpay_order_id = req.body?.razorpay_order_id;
  const razorpay_payment_id = req.body?.razorpay_payment_id;
  const razorpay_signature = req.body?.razorpay_signature;
  const courses = req.body?.courses;

  const userId = req.user.id;

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !courses ||
    !userId
  ) {
    return res.status(200).json({ success: false, message: "Payment Failed" });
  }

  let body = razorpay_order_id + "|" + razorpay_payment_id;

  // ab jo signature razorpay se aagya vo hashed hoke aaega aur hashed chizo ko hum decrypt toh kr nhi skte
  // isliye humne jo apna secret tha usko encrypt krdia jese razorpay apne signature ko encrypt krta h
  // kuch logic nhi bs syntax h pehle createHmac chlaya ye 2 parameter leta h security protocol aur secret
  // fir usko string m convert krdia fir uska digest hex m convert krdia
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    await enrollStudents(courses, userId, res);
    return res.status(200).json({ success: true, message: "Payment Verified" });
  }

  return res.status(200).json({ success: false, message: "Payment Failed" });
};

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body;

  const userId = req.user.id;

  if (!orderId || !paymentId || !amount || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all the details" });
  }

  try {
    const enrolledStudent = await User.findById(userId);

    await mailSender(
      enrolledStudent.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId,
      ),
    );
  } catch (error) {
    console.log("error in sending mail", error);
    return res
      .status(400)
      .json({ success: false, message: "Could not send email" });
  }
};

// enroll the student in the courses
const enrollStudents = async (courses, userId, res) => {
  if (!courses || !userId) {
    return res.status(400).json({
      success: false,
      message: "Please Provide Course ID and User ID",
    });
  }

  for (const courseId of courses) {
    try {
      // Find the course and enroll the student in it
      const enrolledCourse = await Course.findOneAndUpdate(
        { _id: courseId },
        { $push: { studentsEnrolled: userId } },
        { new: true },
      );

      if (!enrolledCourse) {
        return res
          .status(500)
          .json({ success: false, error: "Course not found" });
      }
      console.log("Updated course: ", enrolledCourse);

      const courseProgress = await CourseProgress.create({
        courseID: courseId,
        userId: userId,
        completedVideos: [],
      });
      // Find the student and add the course to their list of enrolled courses
      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            courses: courseId,
            courseProgress: courseProgress._id,
          },
        },
        { new: true },
      );

      console.log("Enrolled student: ", enrolledStudent);
      // Send an email notification to the enrolled student
      const emailResponse = await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        ),
      );

      console.log("Email sent successfully: ", emailResponse.response);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }
};

// const { instance } = require("../config/razorpay");
// const Course = require("../models/Course");
// const crypto = require("crypto");
// const User = require("../models/User");
// const mailSender = require("../utils/mailSender");
// const mongoose = require("mongoose");
// const {
//   courseEnrollmentEmail,
// } = require("../mail/templates/courseEnrollmentEmail");

// const CourseProgress = require("../models/CourseProgress");

// // Capture the payment and initiate the Razorpay order

// exports.capturePayment = async (req, res) => {
//   // get courseId and useId
//   // validation
//   // valid courseDetail
//   // user already pay for the same course
//   // order create
//   // return response
//   const { course_id } = req.body;
//   const { userId } = req.user.id;
//   if (!course_id) {
//     return res.json({
//       success: false,
//       message: "Please provide valid course id",
//     });
//   }
//   let course;
//   try {
//     course = await Course.findById(course_id);
//     if (!course) {
//       return res.json({
//         success: false,
//         message: "could not find the course",
//       });
//     }

//     /* yaha niche humne userId ko ObjectId m convert isliye kiya kyonki jab hum niche comapre krenge toh students
//     enrolled k andr userId jo padi h vo objectId ki form m h isliye comparison m dikkt na ho convert krdia  */

//     const uid = new mongoose.Types.ObjectId(userId);
//     // checking if user already bought the same course or not
//     if (course.studentsEnrolled.includes(uid)) {
//       return res.status(200).json({
//         success: false,
//         message: "Student is already enrolled",
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }

//   // create the order
//   const amount = course.price;
//   const currency = "INR";

//   const options = {
//     amount: amount * 100,
//     currency,
//     receipt: Math.random(Date.now()).toString(),
//     notes: {
//       courseId: course_id,
//       userId,
//     },
//   };

//   try {
//     // initiate the payment using razorpay
//     const paymentResponse = await instance.orders.create(options);
//     console.log(paymentResponse);
//     return res.status(200).json({
//       success: true,
//       courseName: course.courseName,
//       courseDescription: course.courseDescription,
//       thumbnail: course.thumbnail,
//       orderId: paymentResponse.id,
//       currency: paymentResponse.currency,
//       amount: paymentResponse.amount,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.json({
//       success: false,
//       message: "Could not initiate order",
//     });
//   }
// };

// exports.verifySignature = async (req, res) => {
//   /* user jab payment krdega toh hume kese pta chlega ki payment success hogi user ki trf se ??
//       --> iske liye razorpay m jab payment success hoti h toh hum ek api route ko hit krva denge aur usme ek secret
//           bhejenge aur vo secret ko apne db wale secret se match krke dekhenge...agr dono equal honge mtlb user
//           ki trf se successfull payment ho gyi
//     */
//   // ye hmare db wala secret
//   const webHookSecret = "12345678";
//   // aur ye signature niche wala header m se hi niklta h aur razorpay ek "x-razorpay-signature" wali key k andr bhejta h
//   // toh yeto bs syntax hi h isme logic kuch khas nhi
//   const signature = req.headers["x-razorpay-signature"];

//   // ab jo signature razorpay se aagya vo hashed hoke aaega aur hashed chizo ko hum decrypt toh kr nhi skte
//   // isliye humne jo apna secret tha usko encrypt krdia jese razorpay apne signature ko encrypt krta h
//   // kuch logic nhi bs syntax h pehle createHmac chlaya ye 2 parameter leta h security protocol aur secret
//   // fir usko string m convert krdia fir uska digest hex m convert krdia
//   const expectedSignature = crypto
//     .createHmac("sha256", webHookSecret)
//     .update(body.toString())
//     .digest("hex");

//   if (expectedSignature === signature) {
//     res.status(200).json({ success: true, message: "Payment Verified" });

//     /* ab signature verify hogye toh fir student ko uss course m enroll bhi krna h (2 kaam krne h courses model m
//     studentsEnrolled k andr ye wale user ki id dalni pdegi aur user model m iss particular user k andr ye jo course
//     kharida h iss course ki id bhi daalni pdegi) */

//     /*toh ye course id aur user id kaha se aaegi kyonki pehle toh frontend bhej deta tha aur hum req.body ya req.user.id
//     krke nikal lrte the ab kese nikalenge
//     --> yaad h upr jab humne creat order kiya tha (instance.orders.create) toh yaha options m humne notes k andr pehle
//     se hi courseid aur userid bheji thi ab vo kaam aaegi
//      */

//     const { courseId, userId } = req.body.payload.payment.entity.notes;

//     try {
//       // find the course and enroll the student in it
//       const enrolledCourse = await Course.findByIdAndUpdate(
//         { courseId },
//         {
//           $push: {
//             studentsEnrolled: userId,
//           },
//         },
//         { new: true },
//       );

//       if (!enrolledCourse) {
//         return res.status(500).json({
//           success: false,
//           message: "Course not found",
//         });
//       }
//       console.log(enrolledCourse);

//       // find the student and add the course to that students list
//       const enrolledStudent = await User.findByIdAndUpdate(
//         { userId },
//         { $push: { courses: courseId } },
//         { new: true },
//       );
//       console.log("Enrolled student: ", enrolledStudent);

//       // confirmation wala mail send krdo user ko ab
//       const emailResponse = await mailSender(
//         enrolledStudent.email,
//         `Successfully Enrolled into ${enrolledCourse.courseName}`,
//         courseEnrollmentEmail(
//           enrolledCourse.courseName,
//           `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
//         ),
//       );

//       console.log("Email sent successfully: ", emailResponse.response);

//       return res.status(200).json({
//         success: true,
//         message: "SIgnature verified and course added",
//       });
//     } catch (error) {
//       console.log(error);
//       return res.status(500).json({
//         success: false,
//         message: "Signature not veified due to which course cant be added",
//       });
//     }
//   } else {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid request",
//     });
//   }
// };
