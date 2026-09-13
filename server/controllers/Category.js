const Category = require("../models/Category");

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(401).json({
        success: false,
        message: "Please fill name and description details in course tag",
      });
    }
    const categoryDetails = await Category.create({
      name: name,
    });
    console.log(categoryDetails);
    return res.status(200).json({
      success: true,
      message: "Category data created successfully",
      categoryDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.showAllCategory = async (req, res) => {
  try {
    const allCategory = await Category.find(
      {},
      //yaha name:true aur description:true ka mtlb h khali wali mt dikhana jisme kuch entry filled ho vohi dikhana
      { name: true, description: true },
    );
    return res.status(200).json({
      success: true,
      message: "All tags fetched successfully",
      allCategory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error while finding all tags",
    });
  }
};

// isko utils m daaldio baad m
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// specific category wise details (Like top courses sold or others)
exports.categoryPageDetails = async (req, res) => {
  try {
    const { categoryId } = req.body;
    //console.log("PRINTING CATEGORY ID: ", categoryId);
    // Get courses for the specified category
    const selectedCategory = await Category.findById(categoryId)
      .populate({
        path: "course",
        populate: [
          {
            path: "ratingAndReviews",
          },
          {
            path: "instructor",
          },
        ],
      })
      .exec();

    //console.log("SELECTED COURSE", selectedCategory);
    // Handle the case when the category is not found
    if (!selectedCategory) {
      console.log("Category not found.");
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    // Handle the case when there are no courses
    if (selectedCategory.course.length === 0) {
      console.log("No courses found for the selected category.");
      return res.status(404).json({
        success: false,
        message: "No courses found for the selected category.",
      });
    }

    // Get courses for other categories
    const categoriesExceptSelected = await Category.find({
      _id: { $ne: categoryId },
    });
    console.log(categoriesExceptSelected);
    let differentCategory = null;
    if (categoriesExceptSelected.length > 0) {
      differentCategory = await Category.findOne(
        categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]
          ._id,
      )
        .populate({
          path: "course",
          populate: [
            {
              path: "ratingAndReviews",
            },
            {
              path: "instructor",
            },
          ],
        })
        .exec();
    }
    //console.log("Different COURSE", differentCategory)
    // // Get top-selling courses across all categories
    const allCategories = await Category.find()
      .populate({
        path: "course",
        populate: [
          {
            path: "instructor",
          },
          {
            path: "ratingAndReviews",
          },
        ],
      })
      .exec();
    const allCourses = allCategories.flatMap((category) => category.course);
    const mostSellingCourses = allCourses
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);
    // console.log("mostSellingCourses COURSE", mostSellingCourses)
    return res.status(200).json({
      success: true,
      data: {
        selectedCategory: {
          ...selectedCategory.toObject(),
          courses: selectedCategory.course,
        },
        differentCategory: differentCategory
          ? {
              ...differentCategory.toObject(),
              courses: differentCategory.course,
            }
          : null,
        mostSellingCourses,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
