import React, { useEffect, useState } from "react";
import { apiConnector } from "../services/apiconnector";
import { categories } from "../services/apis";

import { useSelector } from "react-redux";
import { createCategory } from "../services/operations/courseDetailsAPI";

function CreateCategory() {
  const [category, setCategory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const { token } = useSelector((state) => state.auth);

  // Fetch all categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);

    try {
      const res = await apiConnector("GET", categories.CATEGORIES_API);

      setCategory(res.data.allCategory || []);
    } catch (error) {
      console.log("Could not fetch Categories.", error);
    }

    setLoading(false);
  };

  // Add new category
  const handleAddCategory = async (e) => {
    e.preventDefault();

    const trimmedCategory = newCategory.trim();

    // Empty check
    if (!trimmedCategory) {
      alert("Please enter a category name");
      return;
    }

    // Duplicate check
    const alreadyExists = category.some(
      (cat) => cat.name.trim().toLowerCase() === trimmedCategory.toLowerCase(),
    );

    if (alreadyExists) {
      alert("This category already exists!");
      return;
    }

    setAddingCategory(true);

    // createCategory() already handles its own try/catch and toasts.
    // It returns the full axios response on success, or null on failure.
    const res = await createCategory({ name: trimmedCategory }, token);

    if (res && res.data && res.data.categoryDetails) {
      // Add newly created category to UI
      setCategory((prev) => [...prev, res.data.categoryDetails]);

      // Clear input
      setNewCategory("");

      // Close modal
      setShowModal(false);
    }
    // If res is null (request failed), createCategory() already showed
    // an error toast, so there's nothing extra to do here.

    setAddingCategory(false);
  };

  return (
    <div className="min-h-screen bg-richblack-900 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Categories</h1>

            <p className="mt-2 text-sm text-richblack-300">
              Manage all your course categories
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-yellow-50 px-5 py-3 font-semibold text-richblack-900 transition-all duration-200 hover:bg-yellow-100"
          >
            <span className="text-xl">+</span>
            Add Category
          </button>
        </div>

        {/* Category count */}
        <div className="mb-6 rounded-xl border border-richblack-700 bg-richblack-800 p-5">
          <p className="text-sm text-richblack-300">Total Categories</p>

          <p className="mt-1 text-3xl font-bold text-yellow-50">
            {category.length}
          </p>
        </div>

        {/* Categories */}
        <div className="rounded-xl border border-richblack-700 bg-richblack-800">
          <div className="border-b border-richblack-700 px-6 py-4">
            <h2 className="text-lg font-semibold">Existing Categories</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-richblack-600 border-t-yellow-50"></div>
            </div>
          ) : category.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg text-richblack-300">No categories found</p>

              <p className="mt-2 text-sm text-richblack-400">
                Add your first category to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {category
                .filter((cat) => cat && cat.name)
                .map((cat) => (
                  <div
                    key={cat._id}
                    className="group flex items-center justify-between rounded-lg border border-richblack-700 bg-richblack-900 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-yellow-50"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-50 font-bold text-richblack-900">
                        {cat.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <p className="font-medium">{cat.name}</p>

                        <p className="text-xs text-richblack-400">Category</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-richblack-700 bg-richblack-800 p-6 shadow-xl">
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Add New Category</h2>

                <p className="mt-1 text-sm text-richblack-300">
                  Create a new category for your courses.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="text-2xl text-richblack-300 transition hover:text-white"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCategory}>
              <label className="mb-2 block text-sm text-richblack-100">
                Category Name
              </label>

              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Web Development"
                className="w-full rounded-lg border border-richblack-600 bg-richblack-900 px-4 py-3 text-white outline-none transition focus:border-yellow-50"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewCategory("");
                  }}
                  className="rounded-lg bg-richblack-700 px-5 py-2.5 font-medium text-white hover:bg-richblack-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingCategory}
                  className="rounded-lg bg-yellow-50 px-5 py-2.5 font-semibold text-richblack-900 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingCategory ? "Adding..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateCategory;
