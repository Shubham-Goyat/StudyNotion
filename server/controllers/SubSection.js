const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
require("dotenv").config();

exports.createSubSection = async (req, res) => {
  /*    fetch data from req body
        fetch video/image file
        upload video/image to cloudinary
        fetch and store secure_url that we will get from cloudinary
        create entry in db with all this data
        update the entry of sub-section in the section db
        return res
    */
  console.log("🔥🔥 CREATE SUBSECTION CONTROLLER REACHED");

  try {
    // fetch data from req body
    const { title, description, timeDuration, sectionId } = req.body;

    //  fetch video/image file
    const videoFile = req.files.video;
    // validation
    if (!title || !description || !timeDuration || !videoFile || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "Please Fill all the details of the sub section",
      });
    }

    // upload video/image to cloudinary

    const videoSubSection = await uploadImageToCloudinary(
      videoFile,
      process.env.FOLDER_NAME,
    );

    // fetch and store secure_url that we will get from cloudinary
    // create entry in db with all this data

    const subSectionDetails = await SubSection.create({
      title: title,
      description: description,
      timeDuration: timeDuration,
      videoUrl: videoSubSection.secure_url,
    });

    // update the entry of sub-section in the section db
    const updatedSection = await Section.findByIdAndUpdate(
      sectionId,
      {
        $push: {
          subSection: subSectionDetails._id,
        },
      },
      { new: true },
    )
      .populate("subSection")
      .exec();

    return res.status(200).json({
      success: true,
      message: "Sub Section created successfully",
      updatedSection,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error while creating sub section",
    });
  }
};

// update Sub section
exports.updateSubSection = async (req, res) => {
  try {
    const { title, description, timeDuration, subSectionId } = req.body;

    //  fetch video/image file
    const videoFile = req.files.videoFile;

    // validation
    if (!title || !description || !timeDuration || !videoFile) {
      return res.status(404).json({
        success: false,
        message: "Please Fill all the details of the sub section",
      });
    }

    // upload video/image to cloudinary

    const updatedVideoSubSection = await uploadImageToCloudinary(
      videoFile,
      process.env.FOLDER_NAME,
    );

    const updatedSubSectionDetails = await SubSection.findByIdAndUpdate(
      subSectionId,
      {
        title: title,
        description: description,
        timeDuration: timeDuration,
        videoUrl: updatedVideoSubSection.secure_url,
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Sub Section updated successfully",
      updatedSubSectionDetails,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error while updating sub section",
      // message: error.essage,
    });
  }
};

// delete sub section
// DELETE a section
exports.deleteSubSection = async (req, res) => {
  try {
    const { subSectionId, sectionId } = req.body;
    await Section.findByIdAndUpdate(sectionId, {
      $pull: {
        subSection: subSectionId,
      },
    });
    const subSection = await SubSection.findByIdAndDelete({
      _id: subSectionId,
    });

    if (!subSection) {
      return res
        .status(404)
        .json({ success: false, message: "SubSection not found" });
    }

    // find updated section and return it
    const updatedSection =
      await Section.findById(sectionId).populate("subSection");

    return res.json({
      success: true,
      message: "SubSection deleted successfully",
      data: updatedSection,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the SubSection",
    });
  }
};
