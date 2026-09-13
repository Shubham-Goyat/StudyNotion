const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

/* full page summary
1-> sbse pehle resetPasswordToken function se humne token generate kiya random koi bhi
2-> fir usko database m store krvadiya token ko aur uske expiry time ko bhi
3-> aur uss token ko url m add krke email pe bhejdia ki ispe click kro aur password reset krna
4-> ab hum aaye resetPassword function m aur yaha password aur confirmPassword to hume req.body krke miljega
    lekin token bhi yehi se milega (KAISE ?? -> kyonki frontend ko hum url de rhe h aur usme token pass kr rhe h
    toh hum frontend m token=useParams() aise krke token nikal lenge url se aur pass krdenge password aur confirm
    password k sath body m)
5-> ab iss token ko yaad h na humne db m bhi store krvaya tha aur iske expiry time ko bhi toh ab resetPassword function
    m hum iss token ki help se userDetails nikalenge aur check krenge expiry toh ni hogya aur password hash krke
    store krva denge
*/

exports.resetPasswordToken = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.json({
        success: false,
        message: `This Email: ${email} is not Registered With Us Enter a Valid Email `,
      });
    }
    const token = crypto.randomUUID();

    const updatedDetails = await User.findOneAndUpdate(
      { email: email },
      {
        token: token,
        resetPasswordExpires: Date.now() + 5 * 60 * 1000,
      },
      { new: true },
    );
    console.log("DETAILS after resetPasswordToken", updatedDetails);

    const url = `http://localhost:3000/update-password/${token}`;

    await mailSender(
      email,
      "Password Reset",
      `Your Link for email verification is ${url}. Please click this url to reset your password.`,
    );

    res.json({
      success: true,
      message:
        "Email Sent Successfully, Please Check Your Email to Continue Further",
    });
  } catch (error) {
    return res.json({
      error: error.message,
      success: false,
      message: `Some Error in Sending the Reset Message`,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    /* user toh sirf password aur confirmPassword fill krega toh hume token kaha se mila??
    ---> hmare pass frontend m jo url hoga resetPassword page ka uss url m unique token humne pass kiya tha na
         resetPasswordToken wala function m   ( const url = `http://localhost:3000/update-password/${token}`;  )
         ye wala toh hum req.params krke tojen fetch krlenge url se frontend m hi aur fir password aur confirmPassword
         k sth hum token bhi send krenge frontend m se backend ko
    */
    const { password, confirmPassword, token } = req.body;

    if (confirmPassword !== password) {
      return res.json({
        success: false,
        message: "Password and Confirm Password Does not Match",
      });
    }
    const userDetails = await User.findOne({ token: token });
    if (!userDetails) {
      return res.json({
        success: false,
        message: "Token is Invalid",
      });
    }
    if (userDetails.resetPasswordExpires < Date.now()) {
      return res.status(403).json({
        success: false,
        message: `Token is Expired, Please Regenerate Your Token`,
      });
    }
    const encryptedPassword = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate(
      { token: token },
      { password: encryptedPassword },
      { new: true },
    );
    res.json({
      success: true,
      message: `Password Reset Successful`,
    });
  } catch (error) {
    return res.json({
      error: error.message,
      success: false,
      message: `Some Error in Updating the Password`,
    });
  }
};
